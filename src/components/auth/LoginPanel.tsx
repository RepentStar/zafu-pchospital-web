import Link from "next/link";

import { LoginForm } from "@/components/auth/LoginForm";
import { loginCopy } from "@/config/auth";

export function LoginPanel() {
  return (
    <div className="auth-login__panel">
      <Link className="auth-login__brand" href="/" aria-label={`${loginCopy.brandName} · 返回首页`}>
        <b>{loginCopy.brandMark}</b>
        <span>{loginCopy.brandName}</span>
      </Link>

      <header className="auth-login__header">
        <p className="eyebrow">{loginCopy.eyebrow}</p>
        <h1 id="login-title">{loginCopy.title}</h1>
        <p>{loginCopy.lead}</p>
      </header>

      <LoginForm />

      <div className="auth-login__links">
        <p>
          {loginCopy.registerPrompt} <Link href="/register/member">{loginCopy.registerAction}</Link>
        </p>
        <Link className="auth-login__home" href="/">
          {loginCopy.backHome}
        </Link>
      </div>
    </div>
  );
}
