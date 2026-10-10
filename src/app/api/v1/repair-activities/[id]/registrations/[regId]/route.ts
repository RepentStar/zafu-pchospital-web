import {
  repairActivityIpRateLimitKey,
  repairActivityPhoneRateLimitKey,
} from "@/features/repair-activities/repair-activity-rate-limit";
import { repairActivityService } from "@/features/repair-activities/repair-activity-service";
import { AppError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { getRequestId } from "@/lib/api/request-id";
import { assertSameOrigin, requestContext } from "@/lib/auth/request";
import { normalizePhone } from "@/lib/security/normalization";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; regId: string }> },
) {
  const requestId = getRequestId(request.headers);
  const context = requestContext(request, requestId);
  try {
    assertSameOrigin(request);
    const ip = context.ipAddress ?? "unknown";
    // IP 只是防刷兜底，主力是手机号（5 次/分钟 + 同场唯一）；30 次/分钟让校园网 NAT 后的正常用户不被误伤。
    enforceRateLimit(repairActivityIpRateLimitKey(ip), 30, 60_000);
    const { id, regId } = await params;
    if (!id || !regId) throw new AppError("VALIDATION_FAILED", "参数无效");
    const body = (await request.json()) as Record<string, unknown>;
    const phoneRaw = String(body.phone ?? "");
    // 改类型沿用报名/查号的手机号限流；格式错误交由 service 统一校验。
    try {
      const phone = normalizePhone(phoneRaw);
      enforceRateLimit(repairActivityPhoneRateLimitKey(phone), 5, 60_000);
    } catch (error) {
      if (!(error instanceof AppError) || error.code !== "VALIDATION_FAILED") throw error;
    }
    const result = await repairActivityService.updateIssueType(
      id,
      regId,
      {
        issueType: body.issueType,
        phone: phoneRaw,
        editToken: String(body.editToken ?? ""),
      },
      context,
    );
    return apiSuccess(result, requestId);
  } catch (error) {
    return apiFailure(error, requestId);
  }
}
