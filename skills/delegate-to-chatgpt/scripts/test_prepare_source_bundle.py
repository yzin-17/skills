#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import json
import stat
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

SCRIPT = Path(__file__).with_name("prepare_source_bundle.py")
SPEC = importlib.util.spec_from_file_location("prepare_source_bundle", SCRIPT)
assert SPEC and SPEC.loader
BUNDLE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUNDLE)


def run(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run([sys.executable, str(SCRIPT), *args], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)


class BundleTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = Path(self.tmp.name) / "repo"
        self.repo.mkdir()
        subprocess.run(["git", "init", "-q", str(self.repo)], check=True)
        subprocess.run(["git", "-C", str(self.repo), "config", "user.email", "test@example.com"], check=True)
        subprocess.run(["git", "-C", str(self.repo), "config", "user.name", "Test User"], check=True)
        (self.repo / "src").mkdir()
        (self.repo / "src" / "main.py").write_text("print('ok')\n", encoding="utf-8")
        (self.repo / "README.md").write_text("# Test\n", encoding="utf-8")
        subprocess.run(["git", "-C", str(self.repo), "add", "."], check=True)
        subprocess.run(["git", "-C", str(self.repo), "commit", "-qm", "initial"], check=True)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_requires_explicit_scope(self) -> None:
        result = run("--repo", str(self.repo))
        self.assertEqual(result.returncode, 2)
        self.assertIn("--include", result.stderr)

    def test_scoped_archive_and_hash(self) -> None:
        output = Path(self.tmp.name) / "bundle.zip"
        result = run("--repo", str(self.repo), "--include", "src", "--output", str(output))
        self.assertEqual(result.returncode, 0, result.stderr)
        summary = json.loads(result.stdout)
        self.assertEqual(summary["file_count"], 1)
        self.assertEqual(summary["sha256"], hashlib.sha256(output.read_bytes()).hexdigest())
        self.assertEqual(stat.S_IMODE(output.stat().st_mode), 0o600)
        with zipfile.ZipFile(output) as archive:
            names = set(archive.namelist())
            self.assertIn("repo/src/main.py", names)
            self.assertIn("repo/BUNDLE-MANIFEST.json", names)
            self.assertNotIn("repo/README.md", names)

    def test_all_is_explicit(self) -> None:
        output = Path(self.tmp.name) / "all.zip"
        result = run("--repo", str(self.repo), "--all", "--output", str(output))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)["file_count"], 2)

    def test_secret_scan_blocks_archive(self) -> None:
        secret = self.repo / "src" / "secret.txt"
        secret.write_text("token='abcdefghijklmnopqrstuvwxyz123456'\n", encoding="utf-8")
        output = Path(self.tmp.name) / "blocked.zip"
        result = run("--repo", str(self.repo), "--include", "src", "--output", str(output))
        self.assertEqual(result.returncode, 3, result.stderr)
        self.assertEqual(json.loads(result.stdout)["status"], "blocked")
        self.assertFalse(output.exists())

    def test_sensitive_filename_is_excluded(self) -> None:
        env = self.repo / ".env.local"
        env.write_text("SECRET=abc\n", encoding="utf-8")
        output = Path(self.tmp.name) / "safe.zip"
        result = run("--repo", str(self.repo), "--all", "--output", str(output))
        self.assertEqual(result.returncode, 0, result.stderr)
        with zipfile.ZipFile(output) as archive:
            self.assertNotIn("repo/.env.local", set(archive.namelist()))

    def test_rejects_path_traversal_and_overwrite(self) -> None:
        result = run("--repo", str(self.repo), "--include", "../outside")
        self.assertEqual(result.returncode, 2)
        output = Path(self.tmp.name) / "exists.zip"
        output.write_text("keep", encoding="utf-8")
        result = run("--repo", str(self.repo), "--include", "src", "--output", str(output))
        self.assertEqual(result.returncode, 2)
        self.assertEqual(output.read_text(encoding="utf-8"), "keep")

    def test_snapshot_detects_selected_path_change(self) -> None:
        selected, _ = BUNDLE.select_paths(BUNDLE.git_visible_paths(self.repo), ["src"], [])
        head = BUNDLE.run_git(self.repo, "rev-parse", "HEAD").decode().strip()
        (self.repo / "src" / "new.py").write_text("print('new')\n", encoding="utf-8")
        with self.assertRaisesRegex(RuntimeError, "selected file set changed"):
            BUNDLE.assert_source_snapshot(self.repo, head, selected, ["src"], [], [])

    def test_snapshot_detects_source_change(self) -> None:
        source = self.repo / "src" / "main.py"
        selected, _ = BUNDLE.select_paths(BUNDLE.git_visible_paths(self.repo), ["src"], [])
        head = BUNDLE.run_git(self.repo, "rev-parse", "HEAD").decode().strip()
        files = [{"path": "src/main.py", "sha256": BUNDLE.sha256_file(source)}]
        source.write_text("print('changed')\n", encoding="utf-8")
        with self.assertRaisesRegex(RuntimeError, "source changed"):
            BUNDLE.assert_source_snapshot(self.repo, head, selected, ["src"], [], files)


if __name__ == "__main__":
    unittest.main()
