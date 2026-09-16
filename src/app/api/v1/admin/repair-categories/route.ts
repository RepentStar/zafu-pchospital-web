import { repairCategoryService } from "@/features/repairs/repair-category-service";
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
      await repairCategoryService.create(
        {
          code: String(body.code ?? ""),
          name: String(body.name ?? ""),
          description: typeof body.description === "string" ? body.description : null,
          sortOrder: body.sortOrder === undefined ? undefined : Number(body.sortOrder),
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
