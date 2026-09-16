import { getDb } from "@/lib/db/client";
import { AppError } from "@/lib/api/errors";
import { Prisma } from "@/generated/prisma/client";

export const repairDetailInclude = {
  memberProfile: { include: { user: true } },
  category: true,
  photos: {
    where: { deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  },
  reviews: { include: { reviewer: true }, orderBy: { createdAt: "asc" } },
  timeline: { include: { actor: true }, orderBy: { createdAt: "asc" } },
} satisfies Prisma.RepairRecordInclude;

export const repairRepository = {
  async activeMemberForUser(userId: string | undefined) {
    if (!userId) throw new AppError("MEMBER_REQUIRED", "需要有效成员身份");
    const member = await getDb().memberProfile.findFirst({
      where: { userId, status: "ACTIVE", deletedAt: null },
    });
    if (!member) throw new AppError("MEMBER_REQUIRED", "需要有效成员身份");
    return member;
  },
  async getById(id: string) {
    const record = await getDb().repairRecord.findUnique({
      where: { id },
      include: repairDetailInclude,
    });
    if (!record || record.deletedAt) throw new AppError("REPAIR_NOT_FOUND", "维修记录不存在");
    return record;
  },
};
