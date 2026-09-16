import { idempotencyKey } from "@/features/repairs/repair-http";
import { repairReviewService } from "@/features/repairs/repair-review-service";
import { AppError } from "@/lib/api/errors";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { getRequestId } from "@/lib/api/request-id";
import { assertSameOrigin, authenticateRequest } from "@/lib/auth/request";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request.headers);
  try {
    assertSameOrigin(request);
    const { actor } = await authenticateRequest(request, requestId);
    const body = (await request.json()) as Record<string, unknown>;
    if (body.decision !== "APPROVED" && body.decision !== "REJECTED")
      throw new AppError("VALIDATION_FAILED", "审核结果无效");
    return apiSuccess(
      await repairReviewService.review(
        (await params).id,
        {
          decision: body.decision,
          note: typeof body.note === "string" ? body.note : undefined,
          idempotencyKey: idempotencyKey(request),
        },
        actor,
      ),
      requestId,
    );
  } catch (error) {
    return apiFailure(error, requestId);
  }
}
