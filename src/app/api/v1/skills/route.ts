import { skillService } from "@/features/skills/skill-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { getRequestId } from "@/lib/api/request-id";
import { authenticateRequest } from "@/lib/auth/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `GET /api/v1/skills` —— 启用中的技能标签，用于成员技能选择。
 * 只读、不含成员信息，但仍要求登录：技能选择是成员内部能力。
 */
export async function GET(request: Request) {
  const requestId = getRequestId(request.headers);
  try {
    await authenticateRequest(request, requestId);
    return apiSuccess(await skillService.listActive(), requestId, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiFailure(error, requestId);
  }
}
