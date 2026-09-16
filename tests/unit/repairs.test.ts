import assert from "node:assert/strict";
import test from "node:test";
import { AppError, ApiErrorCode } from "../../src/lib/api/errors";
import { detectImageType } from "../../src/features/repairs/repair-photo-service";
import { isRepairTransitionAllowed } from "../../src/features/repairs/repair-state";
import {
  validateDraftFields,
  validateSubmission,
} from "../../src/features/repairs/repair-validation";
import { RepairResult, RepairStatus, RepairTimelineEventType } from "../../src/types/contracts";

test("M2 公共枚举与错误码已冻结", () => {
  assert.deepEqual(RepairStatus, ["DRAFT", "PENDING", "APPROVED", "REJECTED"]);
  assert.deepEqual(RepairResult, ["COMPLETED", "NOT_COMPLETED"]);
  assert.equal(RepairTimelineEventType.includes("FLAG_CHANGED"), true);
  for (const code of [
    "MEMBER_REQUIRED",
    "REPAIR_NOT_FOUND",
    "REPAIR_VERSION_CONFLICT",
    "REPAIR_PHOTO_STORAGE_FAILED",
  ])
    assert.equal(ApiErrorCode.includes(code as never), true);
});
test("维修状态机只接受任务书规定流转", () => {
  assert.equal(isRepairTransitionAllowed("DRAFT", "PENDING"), true);
  assert.equal(isRepairTransitionAllowed("REJECTED", "PENDING"), true);
  assert.equal(isRepairTransitionAllowed("PENDING", "APPROVED"), true);
  assert.equal(isRepairTransitionAllowed("PENDING", "REJECTED"), true);
  assert.equal(isRepairTransitionAllowed("APPROVED", "DRAFT"), false);
  assert.equal(isRepairTransitionAllowed("DRAFT", "APPROVED"), false);
});
test("提交完整性覆盖日期、时长、正文和照片边界", () => {
  assert.throws(
    () =>
      validateSubmission({
        repairDate: null,
        durationMinutes: 0,
        categoryId: null,
        content: "短",
        result: null,
        remark: null,
        photoCount: 0,
      }),
    (e) => e instanceof AppError && e.code === "REPAIR_SUBMISSION_INCOMPLETE",
  );
  validateSubmission({
    repairDate: new Date("2026-09-15T00:00:00.000Z"),
    durationMinutes: 90,
    categoryId: "category",
    content: "这是一段符合长度要求的维修过程记录",
    result: "COMPLETED",
    remark: null,
    photoCount: 1,
  });
  assert.throws(() => validateDraftFields({ durationMinutes: 10081 }), AppError);
});
test("图片魔数拒绝伪造 MIME 并识别 JPEG PNG WebP", () => {
  assert.equal(detectImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0x00])), "image/jpeg");
  assert.equal(
    detectImageType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    "image/png",
  );
  assert.equal(
    detectImageType(Uint8Array.from([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")])),
    "image/webp",
  );
  assert.equal(detectImageType(Uint8Array.from(Buffer.from("not-an-image"))), null);
});
