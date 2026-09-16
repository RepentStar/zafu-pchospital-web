import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { PageHead } from "@/components/layout/PageHead";
import { Section } from "@/components/ui/Section";
export const metadata: Metadata = { title: "成员登录" };
export default function LoginPage() {
  return (
    <>
      <PageHead
        id="login-title"
        index="05"
        label="Account"
        title="成员登录"
        lead="使用已绑定的 QQ 号与密码登录。"
      />
      <Section labelledBy="login-form-title">
        <h2 className="sr-only" id="login-form-title">
          登录表单
        </h2>
        <LoginForm />
      </Section>
    </>
  );
}
