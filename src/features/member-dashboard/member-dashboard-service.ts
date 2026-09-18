import { requirePermission } from "@/lib/auth/permissions";
import { memberProfileRepository } from "@/features/member-profile/member-profile-repository";
import { memberProfilePolicy } from "@/features/member-profile/member-profile-policy";
import {
  loadMemberOverview,
  type MemberOverviewResult,
} from "@/features/member-dashboard/member-overview-provider";
import { skillRepository } from "@/features/skills/skill-repository";
import { toSkillView } from "@/features/skills/skill-service";
import type {
  AuthorizedActor,
  DeferredModule,
  MemberDashboard,
  MemberDashboardDegraded,
  MemberDashboardServiceContract,
  MemberRepairSummary,
  MemberWorkQueue,
} from "@/types/contracts";
import { MEMBER_RECENT_REPAIR_LIMIT } from "@/types/contracts";

/**
 * 成员工作台聚合服务（M3 任务书 §6.3、§9、§12.1）。
 *
 * 只接受 actor 推导出的身份，**不接受客户端传入 memberProfileId**。
 * M4/M5 接入位固定返回 `{ available: false }`，不产生任何模拟业务数字。
 */

const DEFERRED_NOTIFICATIONS: DeferredModule = { available: false, module: "M4" };
const DEFERRED_FAVORITES: DeferredModule = { available: false, module: "M4" };
const DEFERRED_RANKING: DeferredModule = { available: false, module: "M5" };

export const memberDashboardService: MemberDashboardServiceContract = {
  async getDashboard(actor: AuthorizedActor): Promise<MemberDashboard> {
    requirePermission(actor, "member.profile.read_self");
    const row = await memberProfileRepository.activeForUser(actor.userId);

    const [skills, overview] = await Promise.all([
      skillRepository.listMemberSkills(row.id),
      loadMemberOverview({
        memberProfileId: row.id,
        now: new Date(),
        recentLimit: MEMBER_RECENT_REPAIR_LIMIT,
      }),
    ]);

    return {
      profile: memberProfilePolicy.toSummary(row, skills.map(toSkillView)),
      // 区块级降级：四路查询各自收敛，这里如实透传每个区块的状态。
      // 契约要求 `MemberDashboard` 中这些字段是「数据」而非「结果包装」，
      // 因此失败区块回退为空数组/零值队列，并由 `degraded` 显式标注是哪几块失败 ——
      // 客户端据此渲染局部错误，而**不**把失败伪装成「真的没有数据」以外的含义。
      repairSummary: overview.repairSummary.status === "ready" ? overview.repairSummary.data : EMPTY_SUMMARY,
      workQueue: overview.workQueue.status === "ready" ? overview.workQueue.data : EMPTY_QUEUE,
      recentRepairs: overview.recentRepairs.status === "ready" ? overview.recentRepairs.data : [],
      recentActivity: overview.recentActivity.status === "ready" ? overview.recentActivity.data : [],
      degraded: degradedSections(overview),
      notifications: DEFERRED_NOTIFICATIONS,
      favorites: DEFERRED_FAVORITES,
      ranking: DEFERRED_RANKING,
    };
  },
};

/**
 * 空摘要：**只在区块失败时**作为结构占位，且所有 MetricValue 标为 `UNCONFIGURED`，
 * 保证前端渲染出「待配置」而不是伪造的 0。
 */
const EMPTY_SUMMARY: MemberRepairSummary = {
  totalApprovedCount: { value: null, status: "UNCONFIGURED" },
  termApprovedCount: { value: null, status: "UNCONFIGURED" },
  monthApprovedCount: { value: null, status: "UNCONFIGURED" },
  totalApprovedDurationMinutes: { value: null, status: "UNCONFIGURED" },
  source: "M2_APPROVED_REPAIRS",
  generatedAt: new Date(0).toISOString(),
};

const EMPTY_QUEUE: MemberWorkQueue = { draftCount: 0, pendingCount: 0, rejectedCount: 0 };

/** 列出失败的区块名，供页面做局部错误展示。 */
function degradedSections(overview: MemberOverviewResult): MemberDashboardDegraded[] {
  const degraded: MemberDashboardDegraded[] = [];
  if (overview.repairSummary.status === "failed") degraded.push("repairSummary");
  if (overview.workQueue.status === "failed") degraded.push("workQueue");
  if (overview.recentRepairs.status === "failed") degraded.push("recentRepairs");
  if (overview.recentActivity.status === "failed") degraded.push("recentActivity");
  return degraded;
}
