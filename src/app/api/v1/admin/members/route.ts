import { memberService } from "@/features/members/member-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { getRequestId } from "@/lib/api/request-id";
import { assertSameOrigin, authenticateRequest } from "@/lib/auth/request";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const requestId = getRequestId(request.headers);
  try {
    assertSameOrigin(request);
    const { actor } = await authenticateRequest(request, requestId);
    const body = (await request.json()) as Record<string, unknown>;
    return apiSuccess(
      await memberService.create(
        {
          realName: String(body.realName ?? ""),
          qq: String(body.qq ?? ""),
          phone: String(body.phone ?? ""),
          studentId: optional(body.studentId),
          className: optional(body.className),
          nickname: optional(body.nickname),
          idempotencyKey: String(body.idempotencyKey ?? ""),
        },
        actor,
      ),
      requestId,
      { status: 201 },
    );
  } catch (error) {
    return apiFailure(error, requestId);
  }
}
function optional(value: unknown) {
  return typeof value === "string" ? value : undefined;
}
