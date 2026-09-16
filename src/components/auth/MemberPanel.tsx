"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
export function MemberPanel({ name, roles }: { name: string; roles: readonly string[] }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }
  return (
    <div className="signup__done">
      <p className="eyebrow">Member</p>
      <h2 className="signup__done-title">欢迎，{name}</h2>
      <p className="signup__done-note">当前角色：{roles.join(" / ")}</p>
      <p className="signup__done-note">成员业务功能将在后续模块按依赖逐步开放。</p>
      <Button href="/account/change-password" variant="outline">
        修改密码
      </Button>
      <Button variant="ghost" onClick={logout}>
        退出登录
      </Button>
    </div>
  );
}
