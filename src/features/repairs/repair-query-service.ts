import type { Prisma } from "@/generated/prisma/client";
import { AppError } from "@/lib/api/errors";
import { paginationMeta } from "@/lib/api/pagination";
import { requirePermission } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db/client";
import { assertCanReadRepair } from "./repair-policy";
import { repairDetailInclude, repairRepository } from "./repair-repository";
import { toRepairDetail, toRepairView } from "./repair-view";
import type {
  AuthorizedActor,
  RepairListInput,
  RepairQueryServiceContract,
} from "@/types/contracts";

export const repairQueryService: RepairQueryServiceContract = {
  async list(input, actor) {
    requirePermission(actor, "repair:read");
    await repairRepository.activeMemberForUser(actor.userId);
    const where = listWhere(input, actor);
    const [total, rows] = await Promise.all([
      getDb().repairRecord.count({ where }),
      getDb().repairRecord.findMany({
        where,
        include: repairDetailInclude,
        orderBy: [{ repairDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
    ]);
    return { items: rows.map(toRepairView), pagination: paginationMeta(input, total) };
  },
  async getById(recordId, actor) {
    const record = await repairRepository.getById(recordId);
    assertCanReadRepair(actor, record);
    return toRepairDetail(record, actor);
  },
};

export async function listApprovedRepairsForAnalytics(input: { from?: Date; to?: Date } = {}) {
  return getDb().repairRecord.findMany({
    where: { status: "APPROVED", deletedAt: null, repairDate: { gte: input.from, lte: input.to } },
    select: {
      id: true,
      memberProfileId: true,
      repairDate: true,
      durationMinutes: true,
      categoryId: true,
      isDifficult: true,
      isTypical: true,
    },
    orderBy: [{ repairDate: "desc" }, { id: "desc" }],
  });
}

export async function listRepairMemberOptions(actor: AuthorizedActor) {
  requirePermission(actor, "repair:read");
  await repairRepository.activeMemberForUser(actor.userId);
  const rows = await getDb().memberProfile.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    select: { id: true, realName: true, nickname: true, user: { select: { displayName: true } } },
    orderBy: [{ realName: "asc" }, { id: "asc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.nickname || row.realName || row.user.displayName || "成员",
  }));
}

function listWhere(
  input: RepairListInput,
  actor: { userId?: string; permissions: readonly string[] },
): Prisma.RepairRecordWhereInput {
  if (input.repairDateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(input.repairDateFrom))
    throw new AppError("VALIDATION_FAILED", "起始日期无效");
  if (input.repairDateTo && !/^\d{4}-\d{2}-\d{2}$/.test(input.repairDateTo))
    throw new AppError("VALIDATION_FAILED", "结束日期无效");
  const visibility: Prisma.RepairRecordWhereInput = actor.permissions.includes("repair:review")
    ? {}
    : { OR: [{ memberProfile: { userId: actor.userId } }, { status: "APPROVED" }] };
  const query = input.query?.trim();
  return {
    deletedAt: null,
    AND: [visibility],
    memberProfileId: input.memberId,
    categoryId: input.categoryId,
    status: input.status,
    result: input.result,
    repairDate: {
      gte: input.repairDateFrom ? new Date(`${input.repairDateFrom}T00:00:00.000Z`) : undefined,
      lte: input.repairDateTo ? new Date(`${input.repairDateTo}T00:00:00.000Z`) : undefined,
    },
    isDifficult: input.isDifficult,
    isTypical: input.isTypical,
    OR: query
      ? [
          { content: { contains: query } },
          { remark: { contains: query } },
          {
            memberProfile: {
              OR: [{ realName: { contains: query } }, { nickname: { contains: query } }],
            },
          },
        ]
      : undefined,
  };
}
