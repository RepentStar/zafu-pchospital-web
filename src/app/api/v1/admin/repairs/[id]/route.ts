import { repairQueryService } from "@/features/repairs/repair-query-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { getRequestId } from "@/lib/api/request-id";
import { authenticateRequest } from "@/lib/auth/request";
import { requirePermission } from "@/lib/auth/permissions";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request.headers);
  try {
    const { actor } = await authenticateRequest(request, requestId);
    requirePermission(actor, "repair:review");
    return apiSuccess(await repairQueryService.getById((await params).id, actor), requestId);
  } catch (error) {
    return apiFailure(error, requestId);
  }
}
