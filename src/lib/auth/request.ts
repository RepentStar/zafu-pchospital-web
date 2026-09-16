import { AppError } from "@/lib/api/errors";
import { authService } from "@/features/auth/auth-service";
import type { AuthorizedActor, PublicRequestContext, SessionPrincipal } from "@/types/contracts";

export const SESSION_COOKIE_NAME = "pc_hospital_session";

export function requestContext(request: Request, requestId: string): PublicRequestContext {
  return {
    requestId,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
    userAgent: request.headers.get("user-agent") ?? undefined,
  };
}

export function readSessionToken(request: Request): string {
  const cookie = request.headers.get("cookie") ?? "";
  return (
    cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
      ?.slice(SESSION_COOKIE_NAME.length + 1) ?? ""
  );
}

export async function authenticateRequest(
  request: Request,
  requestId: string,
  allowForcedPasswordChange = false,
): Promise<{
  principal: SessionPrincipal & { sessionId: string; expiresAt: string };
  actor: AuthorizedActor;
  token: string;
}> {
  const context = requestContext(request, requestId);
  const token = readSessionToken(request);
  const principal = await authService.authenticate(token);
  if (principal.mustChangePassword && !allowForcedPasswordChange)
    throw new AppError("PASSWORD_CHANGE_REQUIRED", "请先修改初始密码");
  return {
    principal,
    token,
    actor: {
      ...context,
      actorType: "USER",
      userId: principal.userId,
      userStatus: "ACTIVE",
      permissions: principal.permissions,
      mustChangePassword: principal.mustChangePassword,
    },
  };
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) throw new AppError("FORBIDDEN", "请求来源无效");
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new AppError("FORBIDDEN", "请求来源无效");
  }
  if (originHost !== host) throw new AppError("FORBIDDEN", "请求来源无效");
}

export function sessionCookie(token: string, expiresAt: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(expiresAt),
  };
}
