import type { Metadata } from "next";
import { InviteRegistrationForm } from "@/components/auth/InviteRegistrationForm";
import { PageHead } from "@/components/layout/PageHead";
import { Section } from "@/components/ui/Section";
export const metadata: Metadata = { title: "邀请码注册" };
export default function MemberRegistrationPage() {
  return (
    <>
      <PageHead
        id="member-registration-title"
        index="05"
        label="Account"
        title="邀请码注册"
        lead="持有效邀请码登记成员身份并设置登录密码。"
      />
      <Section labelledBy="member-registration-form-title">
        <h2 className="sr-only" id="member-registration-form-title">
          成员注册表单
        </h2>
        <InviteRegistrationForm />
      </Section>
    </>
  );
}
