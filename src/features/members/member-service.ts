import { randomBytes, randomUUID } from "node:crypto";

import {
  ensureMemberProfile,
  grantMemberRole,
  resolveOrCreateUser,
  setInitialPassword,
} from "@/features/accounts/account-repository";
import { AppError } from "@/lib/api/errors";
import { appendAuditLog } from "@/lib/audit/audit-service";
import { requirePermission } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db/client";
import { inSerializableTransaction } from "@/lib/db/transaction";
import { normalizePhone, normalizeQq } from "@/lib/security/normalization";
import { hashPassword } from "@/lib/security/secrets";
import type {
  AuthorizedActor,
  CreateMemberInput,
  MemberMutationResult,
  MemberView,
} from "@/types/contracts";

export class MemberService {
  async create(input: CreateMemberInput, actor: AuthorizedActor): Promise<MemberMutationResult> {
    requirePermission(actor, "member:manage");
    if (
      input.realName.trim().length < 2 ||
      input.realName.trim().length > 64 ||
      !input.idempotencyKey.trim()
    ) {
      throw new AppError("VALIDATION_FAILED", "成员姓名或幂等键无效");
    }
    const replay = await getDb().accountProvision.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (replay) {
      if (replay.sourceType !== "ADMIN_CREATED" || !replay.memberProfileId)
        throw new AppError("IDEMPOTENCY_CONFLICT", "幂等键已被其他请求使用");
      const profile = await getDb().memberProfile.findUniqueOrThrow({
        where: { id: replay.memberProfileId },
        include: { user: { include: { identities: { where: { deletedAt: null } } } } },
      });
      const sameQq = profile.user.identities.some(
        (identity) =>
          identity.type === "QQ" && identity.identifierNormalized === normalizeQq(input.qq),
      );
      const samePhone = profile.user.identities.some(
        (identity) =>
          identity.type === "PHONE" &&
          identity.identifierNormalized === normalizePhone(input.phone),
      );
      if (!sameQq || !samePhone || profile.realName !== input.realName.trim()) {
        throw new AppError("IDEMPOTENCY_CONFLICT", "幂等键已用于另一项成员创建请求");
      }
      return { member: await this.getView(replay.memberProfileId) };
    }
    const secret = randomBytes(18).toString("base64url");
    const member = await inSerializableTransaction(async (tx) => {
      const sourceId = randomUUID();
      const userId = await resolveOrCreateUser(
        tx,
        { qq: normalizeQq(input.qq), phone: normalizePhone(input.phone) },
        input.realName.trim(),
      );
      const memberProfileId = await ensureMemberProfile(tx, {
        userId,
        realName: input.realName.trim(),
        studentId: clean(input.studentId),
        className: clean(input.className),
      });
      if (input.nickname !== undefined)
        await tx.memberProfile.update({
          where: { id: memberProfileId },
          data: { nickname: clean(input.nickname) },
        });
      await grantMemberRole(tx, {
        userId,
        sourceType: "ADMIN_CREATED",
        sourceId,
        grantedBy: actor.userId,
      });
      const passwordCreated = await setInitialPassword(tx, userId, secret);
      await tx.accountProvision.create({
        data: {
          id: randomUUID(),
          sourceType: "ADMIN_CREATED",
          sourceId,
          idempotencyKey: input.idempotencyKey,
          status: "SUCCEEDED",
          userId,
          memberProfileId,
          attemptCount: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: new Date(),
        },
      });
      await appendAuditLog(tx, {
        actor,
        actorType: "USER",
        actorUserId: actor.userId,
        action: "member.created",
        targetType: "MemberProfile",
        targetId: memberProfileId,
        result: "SUCCESS",
        after: { userId, realName: input.realName, qq: input.qq, phone: input.phone },
      });
      return { memberProfileId, passwordCreated };
    });
    return {
      member: await this.getView(member.memberProfileId),
      ...(member.passwordCreated ? { initializationSecret: secret } : {}),
    };
  }

  async setEnabled(
    memberId: string,
    enabled: boolean,
    actor: AuthorizedActor,
  ): Promise<MemberView> {
    requirePermission(actor, "member:manage");
    await inSerializableTransaction(async (tx) => {
      const profile = await tx.memberProfile.findUnique({ where: { id: memberId } });
      if (!profile || profile.deletedAt) throw new AppError("RESOURCE_NOT_FOUND", "成员不存在");
      const memberRole = await tx.role.findUniqueOrThrow({ where: { code: "MEMBER" } });
      if (enabled) {
        await tx.user.update({ where: { id: profile.userId }, data: { status: "ACTIVE" } });
        await tx.memberProfile.update({ where: { id: memberId }, data: { status: "ACTIVE" } });
        await grantMemberRole(tx, {
          userId: profile.userId,
          sourceType: "ADMIN_CREATED",
          sourceId: memberId,
          grantedBy: actor.userId,
        });
      } else {
        await tx.memberProfile.update({ where: { id: memberId }, data: { status: "REVOKED" } });
        await tx.userRole.updateMany({
          where: { userId: profile.userId, roleId: memberRole.id, revokedAt: null },
          data: { revokedAt: new Date(), activeKey: null },
        });
        await tx.authSession.updateMany({
          where: { userId: profile.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await appendAuditLog(tx, {
          actor,
          actorType: "USER",
          actorUserId: actor.userId,
          action: "auth.session.revoked",
          targetType: "User",
          targetId: profile.userId,
          result: "SUCCESS",
        });
      }
      await appendAuditLog(tx, {
        actor,
        actorType: "USER",
        actorUserId: actor.userId,
        action: enabled ? "member.enabled" : "member.disabled",
        targetType: "MemberProfile",
        targetId: memberId,
        result: "SUCCESS",
        after: { status: enabled ? "ACTIVE" : "REVOKED" },
      });
    });
    return this.getView(memberId);
  }

  async resetPassword(memberId: string, actor: AuthorizedActor): Promise<MemberMutationResult> {
    requirePermission(actor, "member:manage");
    const secret = randomBytes(18).toString("base64url");
    const passwordHash = await hashPassword(secret);
    await inSerializableTransaction(async (tx) => {
      const profile = await tx.memberProfile.findUnique({ where: { id: memberId } });
      if (!profile || profile.deletedAt) throw new AppError("RESOURCE_NOT_FOUND", "成员不存在");
      await tx.passwordCredential.upsert({
        where: { userId: profile.userId },
        create: {
          userId: profile.userId,
          passwordHash,
          mustChangePassword: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        update: { passwordHash, mustChangePassword: true, passwordChangedAt: null },
      });
      await tx.authSession.updateMany({
        where: { userId: profile.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await appendAuditLog(tx, {
        actor,
        actorType: "USER",
        actorUserId: actor.userId,
        action: "auth.password.reset",
        targetType: "MemberProfile",
        targetId: memberId,
        result: "SUCCESS",
      });
      await appendAuditLog(tx, {
        actor,
        actorType: "USER",
        actorUserId: actor.userId,
        action: "auth.session.revoked",
        targetType: "User",
        targetId: profile.userId,
        result: "SUCCESS",
      });
    });
    return { member: await this.getView(memberId), initializationSecret: secret };
  }

  private async getView(memberId: string): Promise<MemberView> {
    const profile = await getDb().memberProfile.findUnique({ where: { id: memberId } });
    if (!profile || profile.deletedAt) throw new AppError("RESOURCE_NOT_FOUND", "成员不存在");
    return {
      id: profile.id,
      userId: profile.userId,
      realName: profile.realName,
      nickname: profile.nickname,
      studentId: profile.studentId,
      className: profile.className,
      status: profile.status as MemberView["status"],
    };
  }
}

function clean(value?: string): string | undefined {
  return value?.trim() || undefined;
}
export const memberService = new MemberService();
