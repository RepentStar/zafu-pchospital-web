import { AppError } from "@/lib/api/errors";
import type { RepairDraftFields, RepairResult } from "@/types/contracts";

export function normalizeDraftFields(input: RepairDraftFields): RepairDraftFields {
  return {
    repairDate: input.repairDate === undefined ? undefined : input.repairDate || null,
    durationMinutes: input.durationMinutes,
    categoryId: input.categoryId === undefined ? undefined : input.categoryId || null,
    content: input.content === undefined ? undefined : clean(input.content),
    result: input.result,
    remark: input.remark === undefined ? undefined : clean(input.remark),
  };
}

export function validateDraftFields(input: RepairDraftFields): void {
  const errors: Record<string, string[]> = {};
  if (input.repairDate != null && !isDate(input.repairDate))
    errors.repairDate = ["维修日期格式无效"];
  if (
    input.durationMinutes != null &&
    (!Number.isInteger(input.durationMinutes) ||
      input.durationMinutes < 1 ||
      input.durationMinutes > 10080)
  )
    errors.durationMinutes = ["维修时长须为 1–10080 分钟"];
  if (input.content != null && input.content.length > 10000)
    errors.content = ["维修内容不能超过 10000 字"];
  if (input.remark != null && input.remark.length > 2000) errors.remark = ["备注不能超过 2000 字"];
  if (input.result != null && !isRepairResult(input.result)) errors.result = ["维修结果无效"];
  if (Object.keys(errors).length)
    throw new AppError("VALIDATION_FAILED", "维修记录字段无效", { fieldErrors: errors });
}

export function validateSubmission(record: {
  repairDate: Date | null;
  durationMinutes: number | null;
  categoryId: string | null;
  content: string | null;
  result: string | null;
  remark: string | null;
  photoCount: number;
}): void {
  const errors: Record<string, string[]> = {};
  if (!record.repairDate) errors.repairDate = ["请填写维修日期"];
  else if (formatShanghaiDate(record.repairDate) > currentShanghaiDate())
    errors.repairDate = ["维修日期不能晚于今天"];
  if (
    !Number.isInteger(record.durationMinutes) ||
    record.durationMinutes! < 1 ||
    record.durationMinutes! > 10080
  )
    errors.durationMinutes = ["维修时长须为 1–10080 分钟"];
  if (!record.categoryId) errors.categoryId = ["请选择故障分类"];
  const content = record.content?.trim() ?? "";
  if (content.length < 10 || content.length > 10000) errors.content = ["维修内容须为 10–10000 字"];
  if (!isRepairResult(record.result)) errors.result = ["请选择维修结果"];
  if ((record.remark?.trim().length ?? 0) > 2000) errors.remark = ["备注不能超过 2000 字"];
  if (record.photoCount < 1) errors.photos = ["至少上传一张维修照片"];
  if (Object.keys(errors).length)
    throw new AppError("REPAIR_SUBMISSION_INCOMPLETE", "请补全维修记录后再提交", {
      fieldErrors: errors,
    });
}

export function parseRepairDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (!isDate(value)) throw new AppError("VALIDATION_FAILED", "维修日期格式无效");
  return new Date(`${value}T00:00:00.000Z`);
}

function clean(value: string | null): string | null {
  const result = value?.trim() ?? "";
  return result || null;
}
function isDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).valueOf())
  );
}
function isRepairResult(value: unknown): value is RepairResult {
  return value === "COMPLETED" || value === "NOT_COMPLETED";
}
function currentShanghaiDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function formatShanghaiDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
