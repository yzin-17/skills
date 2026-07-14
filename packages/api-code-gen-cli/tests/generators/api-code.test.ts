import { describe, expect, it } from "vitest";
import type { ApiCodeArtifact, ApiEndpoint, MapperStep, VoField } from "../../src/artifact/types.js";
import { generateApiCode } from "../../src/generators/api-code.js";

const field: VoField = { name: "userName", type: "string", sources: [{ path: "response.body.user_name", role: "userName" }], confidence: "medium", origin: "inferred" };
const step: MapperStep = { id: "step-001", order: 1, operation: "rename", inputs: ["response.body.user_name"], output: "vo.userName", params: {}, confidence: "medium" };

function endpoint(overrides: Partial<ApiEndpoint> = {}): ApiEndpoint {
  return { id: "ep-get-user", operationId: "getUser", method: "GET", path: "/api/users/{id}", dto: { response: "GetUserResponseDTO" }, vo: { name: "GetUserVO", fields: [field] }, mapper: { name: "toGetUserVO", enabled: true, steps: [step] }, ...overrides };
}

function artifact(overrides: Partial<ApiCodeArtifact> = {}): ApiCodeArtifact {
  return { schemaVersion: "0.1.0", openapi: { file: "openapi.yaml", sha256: "abc", origin: "imported", reviewStatus: "confirmed" }, reviewItems: [], endpoints: [endpoint()], output: { splitApiOutput: false, file: "src/api.ts", transformResponse: true, reviewStatus: "confirmed" }, ...overrides };
}

describe("generateApiCode", () => {
  it("generates DTO, VO, mapper, and a VO-returning request function", () => {
    const code = generateApiCode(artifact());
    expect(code).toContain("export interface GetUserResponseDTO");
    expect(code).toContain("export interface GetUserVO");
    expect(code).toContain("export function toGetUserVO");
    expect(code).toContain("export async function getUser(id: string | number): Promise<GetUserVO>");
    expect(code).toContain("return toGetUserVO(dto);");
  });

  it("preserves nested DTO paths and quotes non-identifier properties", () => {
    const code = generateApiCode(artifact({ endpoints: [endpoint({ vo: { name: "GetUserVO", fields: [{ ...field, name: "displayName", sources: [{ path: "response.body.user.profile.display-name" }] }] }, mapper: { name: "toGetUserVO", enabled: true, steps: [{ ...step, inputs: ["response.body.user.profile.display-name"], output: "vo.displayName" }] } })] }));
    expect(code).toContain('"display-name": string;');
    expect(code).toContain('vo.displayName = dto.user.profile["display-name"];');
  });

  it("sanitizes path parameters and can return DTOs without transformation", () => {
    const base = artifact({ endpoints: [endpoint({ path: "/api/{class}/{user-id}/{user_id}" })] });
    const code = generateApiCode({ ...base, output: { ...base.output, transformResponse: false } });
    expect(code).toContain("getUser(class_: string | number, user_id: string | number, user_id_2: string | number)");
    expect(code).toContain("Promise<GetUserResponseDTO>");
    expect(code).toContain("return request<GetUserResponseDTO>(path");
  });

  it("sorts mapper steps and reports unsupported operations", () => {
    const code = generateApiCode(artifact({ endpoints: [endpoint({ mapper: { name: "toGetUserVO", enabled: true, steps: [{ ...step, id: "step-002", order: 2, output: "vo.second" }, { ...step, id: "step-001", order: 1, output: "vo.first" }, { ...step, id: "step-003", order: 3, operation: "concat" }] } })] }));
    expect(code.indexOf("vo.first = dto.user_name;")).toBeLessThan(code.indexOf("vo.second = dto.user_name;"));
    expect(code).toContain("api-code-gen needsReview: Unsupported mapper operation concat");
  });
});
