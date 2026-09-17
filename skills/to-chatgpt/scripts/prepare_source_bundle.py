#!/usr/bin/env python3
"""Create a minimal sanitized source ZIP for external ChatGPT delegation."""

from __future__ import annotations

import argparse
import fnmatch
import hashlib
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

EXCLUDED_DIRS = {
    ".git", ".cache", ".next", ".nuxt", ".pytest_cache", ".ruff_cache",
    ".turbo", ".venv", ".yarn", "__pycache__", "build", "coverage",
    "deriveddata", "dist", "logs", "node_modules", "out", "pods",
    "target", "tmp", "vendor",
}

SENSITIVE_BASENAMES = {
    ".env", ".npmrc", ".pypirc", "auth.json", "credentials.json",
    "cookies.json", "id_dsa", "id_ed25519", "id_ecdsa", "id_rsa",
    "service-account.json",
}

SENSITIVE_SUFFIXES = {
    ".cer", ".crt", ".db", ".der", ".jks", ".key", ".keystore",
    ".p12", ".pem", ".pfx", ".sqlite", ".sqlite3",
}

SECRET_PATTERNS = (
    ("private-key", re.compile(rb"-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----")),
    ("openai-api-key", re.compile(rb"\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b")),
    ("github-token", re.compile(rb"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b")),
    ("github-fine-grained-token", re.compile(rb"\bgithub_pat_[A-Za-z0-9_]{20,}\b")),
    ("aws-access-key", re.compile(rb"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b")),
    ("google-api-key", re.compile(rb"\bAIza[0-9A-Za-z_-]{30,}\b")),
    ("slack-token", re.compile(rb"\bxox[baprs]-[A-Za-z0-9-]{20,}\b")),
    ("stripe-live-key", re.compile(rb"\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b")),
    ("jwt-token", re.compile(rb"\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b")),
    ("telegram-bot-token", re.compile(rb"\b\d{8,10}:[A-Za-z0-9_-]{35,}\b")),
    ("aliyun-access-key", re.compile(rb"\bLTAI[A-Za-z0-9]{12,20}\b")),
    ("tencent-secret-id", re.compile(rb"\bAKID[A-Za-z0-9]{13,40}\b")),
    (
        "database-credential-uri",
        re.compile(rb"\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis)://[^:\s/@]+:[^@\s/]{4,}@", re.I),
    ),
    (
        "generic-secret-assignment",
        re.compile(rb"\b(?:api[_-]?key|client[_-]?secret|access[_-]?token|token|secret)\s*[:=]\s*[\"'][A-Za-z0-9_./+=-]{20,}[\"']", re.I),
    ),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create a sanitized ZIP from Git-visible files.")
    parser.add_argument("--repo", required=True, help="Absolute path to the Git repository root")
    parser.add_argument("--include", action="append", default=[], help="Relative file/dir/glob to include; repeatable")
    parser.add_argument("--all", action="store_true", help="Explicitly include all Git-visible files")
    parser.add_argument("--exclude", action="append", default=[], help="Relative file/dir/glob to exclude; repeatable")
    parser.add_argument("--output", help="Output .zip path; defaults to a private temp directory")
    parser.add_argument("--max-file-mb", type=int, default=20)
    parser.add_argument("--max-total-mb", type=int, default=100)
    return parser.parse_args()


def run_git(repo: Path, *args: str, check: bool = True) -> bytes:
    proc = subprocess.run(["git", "-C", str(repo), *args], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if check and proc.returncode != 0:
        raise RuntimeError(proc.stderr.decode("utf-8", "replace").strip() or f"git {' '.join(args)} failed")
    return proc.stdout


def normalize_rule(rule: str) -> str:
    value = rule.replace("\\", "/").strip()
    while value.startswith("./"):
        value = value[2:]
    value = value.rstrip("/")
    pure = PurePosixPath(value)
    if not value or pure.is_absolute() or ".." in pure.parts:
        raise ValueError(f"rule must stay inside the repository: {rule}")
    return value


def matches_rule(path: str, rule: str) -> bool:
    if any(ch in rule for ch in "*?["):
        return fnmatch.fnmatch(path, rule) or fnmatch.fnmatch(path, f"{rule}/**")
    return path == rule or path.startswith(rule + "/")


def exclusion_reason(path: str) -> str | None:
    pure = PurePosixPath(path)
    parent_parts = {part.lower() for part in pure.parts[:-1]}
    blocked = sorted(parent_parts.intersection(EXCLUDED_DIRS))
    if blocked:
        return f"excluded-dir:{blocked[0]}"
    base = pure.name.lower()
    if base == ".env" or base.startswith(".env."):
        return "sensitive-env"
    if base in SENSITIVE_BASENAMES or base.startswith(("cookies.", "credentials.", "service-account.")):
        return "sensitive-name"
    if pure.suffix.lower() in SENSITIVE_SUFFIXES:
        return "sensitive-suffix"
    return None


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def scan_file(path: Path, relative_path: str) -> list[dict[str, object]]:
    data = path.read_bytes()
    hits: list[dict[str, object]] = []
    for rule, pattern in SECRET_PATTERNS:
        for match in pattern.finditer(data):
            hits.append({"path": relative_path, "line": data.count(b"\n", 0, match.start()) + 1, "rule": rule})
    return hits


def safe_name(repo: Path) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "-", repo.name).strip("-") or "source"


def select_paths(candidates: list[str], includes: list[str], excludes: list[str]) -> tuple[list[str], list[dict[str, str]]]:
    selected: list[str] = []
    skipped: list[dict[str, str]] = []
    for rel in candidates:
        if includes and not any(matches_rule(rel, rule) for rule in includes):
            continue
        if any(matches_rule(rel, rule) for rule in excludes):
            skipped.append({"path": rel, "reason": "user-exclude"})
            continue
        reason = exclusion_reason(rel)
        if reason:
            skipped.append({"path": rel, "reason": reason})
            continue
        selected.append(rel)
    return selected, skipped


def git_visible_paths(repo: Path) -> list[str]:
    raw = run_git(repo, "ls-files", "-z", "--cached", "--others", "--exclude-standard")
    return sorted(x.decode("utf-8", "surrogateescape") for x in raw.split(b"\0") if x)


def assert_source_snapshot(
    repo: Path,
    expected_head: str,
    expected_selected: list[str],
    includes: list[str],
    excludes: list[str],
    files: list[dict[str, object]],
) -> None:
    current_head = run_git(repo, "rev-parse", "HEAD", check=False).decode().strip() or "UNBORN"
    if current_head != expected_head:
        raise RuntimeError("HEAD changed while preparing the bundle; regenerate it")

    current_selected, _ = select_paths(git_visible_paths(repo), includes, excludes)
    if current_selected != expected_selected:
        raise RuntimeError("selected file set changed while preparing the bundle; regenerate it")

    for entry in files:
        source = repo / str(entry["path"])
        if not source.exists() or source.is_symlink() or sha256_file(source) != entry["sha256"]:
            raise RuntimeError(f"source changed while preparing the bundle: {entry['path']}")


def choose_output(repo: Path, requested: str | None) -> Path:
    if requested:
        output = Path(requested).expanduser().resolve()
        if output.suffix.lower() != ".zip":
            raise ValueError("--output must end with .zip")
        output.parent.mkdir(parents=True, exist_ok=True)
    else:
        base = Path(tempfile.gettempdir()) / "codex-chatgpt-bundles"
        base.mkdir(mode=0o700, parents=True, exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        output = base / f"{safe_name(repo)}-{stamp}-{uuid.uuid4().hex[:8]}.zip"
    if output.exists():
        raise FileExistsError(f"refusing to overwrite existing file: {output}")
    return output


def write_zip_exclusive(output: Path, staging: Path) -> None:
    fd = os.open(output, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    try:
        with os.fdopen(fd, "w+b") as handle:
            fd = -1
            with zipfile.ZipFile(handle, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
                for path in sorted(staging.rglob("*")):
                    if path.is_file():
                        archive.write(path, path.relative_to(staging.parent).as_posix())
    except Exception:
        if fd >= 0:
            os.close(fd)
        output.unlink(missing_ok=True)
        raise


def main() -> int:
    args = parse_args()
    if not args.include and not args.all:
        raise ValueError("specify at least one --include, or explicitly use --all")
    if args.include and args.all:
        raise ValueError("--include and --all are mutually exclusive")
    if args.max_file_mb <= 0 or args.max_total_mb <= 0:
        raise ValueError("size limits must be positive")

    repo = Path(args.repo).expanduser().resolve()
    if not repo.is_dir():
        raise ValueError(f"repository not found: {repo}")
    git_root = Path(run_git(repo, "rev-parse", "--show-toplevel").decode().strip()).resolve()
    if git_root != repo:
        raise ValueError(f"--repo must be the Git root: {git_root}")

    includes = [normalize_rule(x) for x in args.include]
    excludes = [normalize_rule(x) for x in args.exclude]
    selected, skipped = select_paths(git_visible_paths(repo), includes, excludes)
    if not selected:
        raise RuntimeError("no files selected; check include/exclude rules")

    head = run_git(repo, "rev-parse", "HEAD", check=False).decode().strip() or "UNBORN"
    status_before = run_git(repo, "status", "--porcelain=v1", "--untracked-files=normal").decode("utf-8", "replace")
    max_file = args.max_file_mb * 1024 * 1024
    max_total = args.max_total_mb * 1024 * 1024
    output = choose_output(repo, args.output)

    files: list[dict[str, object]] = []
    hits: list[dict[str, object]] = []
    total = 0

    with tempfile.TemporaryDirectory(prefix="codex-chatgpt-bundle-") as td:
        staging = Path(td) / safe_name(repo)
        staging.mkdir()
        for rel in selected:
            source = repo / rel
            try:
                info = source.lstat()
            except FileNotFoundError:
                skipped.append({"path": rel, "reason": "missing"})
                continue
            if stat.S_ISLNK(info.st_mode):
                skipped.append({"path": rel, "reason": "symlink"})
                continue
            if not stat.S_ISREG(info.st_mode):
                skipped.append({"path": rel, "reason": "not-regular-file"})
                continue
            if info.st_size > max_file:
                skipped.append({"path": rel, "reason": "file-too-large"})
                continue
            if total + info.st_size > max_total:
                raise RuntimeError(f"selected content exceeds {args.max_total_mb} MiB; narrow the bundle")

            dest = staging / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, dest)
            digest = sha256_file(dest)
            total += dest.stat().st_size
            hits.extend(scan_file(dest, rel))
            files.append({"path": rel, "bytes": dest.stat().st_size, "sha256": digest})

        if not files:
            raise RuntimeError("all selected files were excluded or unavailable")
        if hits:
            print(json.dumps({"status": "blocked", "reason": "secret-scan-hit", "hits": hits,
                              "message": "exclude the matched file or send a smaller excerpt; do not bypass the scan"}, ensure_ascii=False, indent=2))
            return 3

        assert_source_snapshot(repo, head, selected, includes, excludes, files)

        status_after = run_git(repo, "status", "--porcelain=v1", "--untracked-files=normal").decode("utf-8", "replace")
        manifest = {
            "schema_version": 1,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "repo_name": repo.name,
            "head_commit": head,
            "dirty": bool(status_before.strip()),
            "worktree_changed_during_bundle": status_before != status_after,
            "include_rules": includes or ["<all-git-visible-files>"],
            "exclude_rules": excludes,
            "file_count": len(files),
            "source_bytes": total,
            "files": files,
            "skipped": skipped,
        }
        (staging / "BUNDLE-MANIFEST.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        write_zip_exclusive(output, staging)

    summary = {
        "status": "ok",
        "archive": str(output),
        "archive_bytes": output.stat().st_size,
        "sha256": sha256_file(output),
        "head_commit": head,
        "dirty": bool(status_before.strip()),
        "worktree_changed_during_bundle": status_before != status_after,
        "file_count": len(files),
        "source_bytes": total,
        "skipped_count": len(skipped),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (FileExistsError, RuntimeError, ValueError) as exc:
        print(json.dumps({"status": "error", "message": str(exc)}, ensure_ascii=False, indent=2), file=sys.stderr)
        raise SystemExit(2)
