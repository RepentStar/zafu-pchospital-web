import { AppError } from "@/lib/api/errors";

export function normalizeQq(value: string): string {
  const normalized = value.replace(/\D/g, "");
  if (!/^\d{5,11}$/.test(normalized)) {
    throw new AppError("VALIDATION_FAILED", "QQ 号格式不正确", {
      fieldErrors: { qq: ["请输入 5–11 位数字"] },
    });
  }
  return normalized;
}

/**
 * 大陆手机号规则（剔除非数字后的 11 位）。
 *
 * 维修记录的机主电话（`ownerPhone`）复用这一份正则：两边各写一份，
 * 迟早会出现「报名能填、记录不能填」这类只在一侧生效的格式漂移。
 */
export const CN_MOBILE_PATTERN = /^1[3-9]\d{9}$/;

export function normalizePhone(value: string): string {
  const normalized = value.replace(/\D/g, "");
  if (!CN_MOBILE_PATTERN.test(normalized)) {
    throw new AppError("VALIDATION_FAILED", "手机号格式不正确", {
      fieldErrors: { phone: ["请输入 11 位中国大陆手机号"] },
    });
  }
  return normalized;
}

export function normalizeInviteCode(value: string): string {
  const normalized = value.trim().replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-Z0-9]{16,64}$/.test(normalized)) {
    throw new AppError("INVITE_CODE_INVALID", "邀请码无效");
  }
  return normalized;
}
