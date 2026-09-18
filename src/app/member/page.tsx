import type { Metadata } from "next";

import { MemberDashboard } from "@/components/member/MemberDashboard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { memberCopy } from "@/config/member";
import { requireMemberPage } from "@/lib/auth/member-page";

export const metadata: Metadata = { title: memberCopy.dashboard.title };

/**
 * `/member` —— 成员工作台
 *
 * 用 `requireMemberPage()`（只保证登录 + 已改密）而不是 `requireActiveMemberPage()`：
 * 已登录但还没有有效成员档案的用户**不能**在这里被重定向到 `/member`，
 * 否则会与 `requireActiveMemberPage()` 形成重定向自环。这类用户走下面的空态分支。
 */
export default async function MemberPage() {
  const principal = await requireMemberPage();
  const isActiveMember = Boolean(principal.memberProfileId) && principal.memberStatus === "ACTIVE";

  if (!isActiveMember) {
    return (
      <Section variant="page-head" className="member-workspace" labelledBy="member-title">
        <h1 className="sr-only" id="member-title">
          {memberCopy.dashboard.title}
        </h1>
        <Card variant="notice">
          <p>当前账号尚未开通成员身份，暂时无法使用成员工作台。</p>
          <p>如果你的入团申请已通过审核，请联系管理员确认账号状态。</p>
          <Button href="/">返回首页</Button>
        </Card>
      </Section>
    );
  }

  return (
    <Section variant="page-head" className="member-workspace" labelledBy="member-title">
      <MemberDashboard
        initialDisplayName={principal.displayName ?? memberCopy.common.fallbackName}
        roles={principal.roles}
      />
    </Section>
  );
}
