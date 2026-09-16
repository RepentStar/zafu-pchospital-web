import type { Metadata } from "next";
import { LoginPanel } from "@/components/auth/LoginPanel";
import { Section } from "@/components/ui/Section";
export const metadata: Metadata = { title: "成员登录" };
export default function LoginPage() {
  return (
    <Section variant="page-head" className="auth-login" labelledBy="login-title">
      <LoginPanel />
    </Section>
  );
}
