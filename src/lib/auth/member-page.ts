import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authService } from "@/features/auth/auth-service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/request";

export async function requireMemberPage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value ?? "";
  let principal;
  try {
    principal = await authService.authenticate(token);
  } catch {
    redirect("/login");
  }
  if (principal.mustChangePassword) redirect("/account/change-password");
  if (!principal.memberProfileId || principal.memberStatus !== "ACTIVE") redirect("/member");
  return principal;
}
