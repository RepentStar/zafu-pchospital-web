import { AppError } from "@/lib/api/errors";
import type { RepairListInput, RepairResult, RepairStatus } from "@/types/contracts";

export function repairListInput(
  params: URLSearchParams,
  page: number,
  pageSize: number,
): RepairListInput {
  return {
    page,
    pageSize,
    memberId: value(params, "memberId"),
    categoryId: value(params, "categoryId"),
    status: oneOf(
      value(params, "status"),
      ["DRAFT", "PENDING", "APPROVED", "REJECTED"],
      "status",
    ) as RepairStatus | undefined,
    result: oneOf(value(params, "result"), ["COMPLETED", "NOT_COMPLETED"], "result") as
      RepairResult | undefined,
    repairDateFrom: value(params, "repairDateFrom"),
    repairDateTo: value(params, "repairDateTo"),
    isDifficult: bool(value(params, "isDifficult"), "isDifficult"),
    isTypical: bool(value(params, "isTypical"), "isTypical"),
    query: value(params, "query"),
  };
}
export function draftInput(body: Record<string, unknown>) {
  return {
    repairDate: nullableString(body.repairDate),
    durationMinutes: nullableNumber(body.durationMinutes),
    categoryId: nullableString(body.categoryId),
    content: nullableString(body.content),
    result: nullableResult(body.result),
    remark: nullableString(body.remark),
  };
}
export function idempotencyKey(request: Request): string {
  return request.headers.get("idempotency-key") ?? "";
}
function value(params: URLSearchParams, key: string) {
  return params.get(key) || undefined;
}
function oneOf(value: string | undefined, values: readonly string[], name: string) {
  if (!value) return undefined;
  if (!values.includes(value)) throw new AppError("VALIDATION_FAILED", `${name} 参数无效`);
  return value;
}
function bool(value: string | undefined, name: string) {
  if (!value) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new AppError("VALIDATION_FAILED", `${name} 参数无效`);
}
function nullableString(value: unknown): string | null | undefined {
  return value === undefined ? undefined : value === null ? null : String(value);
}
function nullableNumber(value: unknown): number | null | undefined {
  return value === undefined ? undefined : value === null || value === "" ? null : Number(value);
}
function nullableResult(value: unknown): RepairResult | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (value === "COMPLETED" || value === "NOT_COMPLETED") return value;
  throw new AppError("VALIDATION_FAILED", "维修结果无效");
}
