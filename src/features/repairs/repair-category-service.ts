import { randomUUID } from "node:crypto";
import { appendAuditLog } from "@/lib/audit/audit-service";
import { AppError } from "@/lib/api/errors";
import { requirePermission } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db/client";
import { inSerializableTransaction } from "@/lib/db/transaction";
import type {
  AuthorizedActor,
  CreateRepairCategoryInput,
  RepairCategoryView,
  UpdateRepairCategoryInput,
} from "@/types/contracts";

export const repairCategoryService = {
  async list(): Promise<RepairCategoryView[]> {
    const rows = await getDb().repairCategory.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    });
    return rows.map(view);
  },
  async create(input: CreateRepairCategoryInput, actor: AuthorizedActor) {
    requirePermission(actor, "repair:category:manage");
    const code = input.code.trim().toUpperCase();
    const name = input.name.trim();
    if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(code) || !name || name.length > 80)
      throw new AppError("VALIDATION_FAILED", "分类 code 或名称无效");
    const row = await inSerializableTransaction(async (tx) => {
      const created = await tx.repairCategory.create({
        data: {
          id: randomUUID(),
          code,
          name,
          description: input.description?.trim() || null,
          sortOrder: input.sortOrder ?? 0,
          createdBy: actor.userId,
          createdAt: new Date(),
        },
      });
      await appendAuditLog(tx, {
        actor,
        actorType: "USER",
        actorUserId: actor.userId,
        action: "repair.category.created",
        targetType: "RepairCategory",
        targetId: created.id,
        result: "SUCCESS",
        after: { code, name },
      });
      return created;
    });
    return view(row);
  },
  async update(id: string, input: UpdateRepairCategoryInput, actor: AuthorizedActor) {
    requirePermission(actor, "repair:category:manage");
    const before = await getDb().repairCategory.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new AppError("RESOURCE_NOT_FOUND", "分类不存在");
    if (input.name !== undefined && (!input.name.trim() || input.name.trim().length > 80))
      throw new AppError("VALIDATION_FAILED", "分类名称无效");
    const row = await inSerializableTransaction(async (tx) => {
      const updated = await tx.repairCategory.update({
        where: { id },
        data: {
          name: input.name?.trim(),
          description:
            input.description === undefined ? undefined : input.description?.trim() || null,
          sortOrder: input.sortOrder,
        },
      });
      await appendAuditLog(tx, {
        actor,
        actorType: "USER",
        actorUserId: actor.userId,
        action: "repair.category.updated",
        targetType: "RepairCategory",
        targetId: id,
        result: "SUCCESS",
        before,
        after: updated,
      });
      return updated;
    });
    return view(row);
  },
  async deactivate(id: string, actor: AuthorizedActor) {
    requirePermission(actor, "repair:category:manage");
    return inSerializableTransaction(async (tx) => {
      const updated = await tx.repairCategory.update({ where: { id }, data: { isActive: false } });
      await appendAuditLog(tx, {
        actor,
        actorType: "USER",
        actorUserId: actor.userId,
        action: "repair.category.deactivated",
        targetType: "RepairCategory",
        targetId: id,
        result: "SUCCESS",
        after: { isActive: false },
      });
      return view(updated);
    });
  },
};
function view(row: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}): RepairCategoryView {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  };
}
