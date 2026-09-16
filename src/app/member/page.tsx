import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MemberPanel } from "@/components/auth/MemberPanel";
import { authService } from "@/features/auth/auth-service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/request";
import { PageHead } from "@/components/layout/PageHead";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
export const metadata: Metadata = { title: "成员中心" };
export default async function MemberPage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value ?? "";
  let principal;
  try {
    principal = await authService.authenticate(token);
  } catch {
    redirect("/login");
  }
  if (principal.mustChangePassword) redirect("/account/change-password");
  return (
    <>
      <PageHead
        id="member-title"
        index="05"
        label="Member"
        title="成员中心"
        lead="当前仅提供身份验证后的最小落地页。"
      />
      <Section labelledBy="member-panel-title">
        <h2 className="sr-only" id="member-panel-title">
          成员信息
        </h2>
        <MemberPanel name={principal.displayName ?? "成员"} roles={principal.roles} />
        <div className="mt-s-6">
          <Button href="/member/repairs" variant="solid">
            进入维修记录
          </Button>
        </div>
      </Section>
    </>
  );
}
