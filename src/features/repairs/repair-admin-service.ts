import { appendAuditLog } from "@/lib/audit/audit-service";
import { requirePermission } from "@/lib/auth/permissions";
import { inSerializableTransaction } from "@/lib/db/transaction";
import { repairDetailInclude, repairRepository } from "./repair-repository";
import { timeline } from "./repair-service";
import { toRepairView } from "./repair-view";
import type { AuthorizedActor, RepairFlagsInput } from "@/types/contracts";

export const repairAdminService = {
  async updateFlags(recordId: string, input: RepairFlagsInput, actor: AuthorizedActor) {
    requirePermission(actor, "repair:flag");
    const before = await repairRepository.getById(recordId);
    const changed =
      before.isDifficult !== input.isDifficult || before.isTypical !== input.isTypical;
    if (!changed) return toRepairView(before);
    const now = new Date();
    const updated = await inSerializableTransaction(async (tx) => {
      await tx.repairRecord.update({
        where: { id: recordId },
        data: {
          isDifficult: input.isDifficult,
          isTypical: input.isTypical,
          version: { increment: 1 },
        },
      });
      await timeline(tx, recordId, actor.userId, "FLAG_CHANGED", input, now);
      await appendAuditLog(tx, {
        actor,
        actorType: "USER",
        actorUserId: actor.userId,
        action: "repair.flags.changed",
        targetType: "RepairRecord",
        targetId: recordId,
        result: "SUCCESS",
        before: { isDifficult: before.isDifficult, isTypical: before.isTypical },
        after: input,
      });
      return tx.repairRecord.findUniqueOrThrow({
        where: { id: recordId },
        include: repairDetailInclude,
      });
    });
    return toRepairView(updated);
  },
};
