"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { loginCopy } from "@/config/auth";

export function LoginForm() {
  const router = useRouter();
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setProblem("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qq: data.get("qq"), password: data.get("password") }),
    });
    const payload = (await response.json()) as {
      success: boolean;
      data?: { mustChangePassword?: boolean };
      error?: { message?: string };
    };
    if (!response.ok || !payload.success) {
      setProblem(payload.error?.message ?? loginCopy.failed);
      setBusy(false);
      return;
    }
    router.replace(payload.data?.mustChangePassword ? "/account/change-password" : "/member");
    router.refresh();
  }
  return (
    <form className="auth-login__form" onSubmit={submit}>
      <Field
        name="qq"
        label={loginCopy.qqLabel}
        placeholder={loginCopy.qqPlaceholder}
        type="text"
        autoComplete="username"
        minLength={5}
        maxLength={11}
      />
      <Field
        name="password"
        label={loginCopy.passwordLabel}
        placeholder={loginCopy.passwordPlaceholder}
        type="password"
        autoComplete="current-password"
        minLength={12}
        maxLength={128}
      />
      <Button className="auth-login__submit" type="submit" variant="solid" disabled={busy}>
        {busy ? loginCopy.submitting : loginCopy.submit}
      </Button>
      {problem ? (
        <p className="auth-login__problem" role="alert">
          {problem}
        </p>
      ) : null}
    </form>
  );
}

function Field(props: {
  name: string;
  label: string;
  placeholder: string;
  type: string;
  autoComplete: string;
  minLength: number;
  maxLength: number;
}) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = props.type === "password";
  return (
    <div className="field">
      <label className="field__label" htmlFor={`auth-${props.name}`}>
        {props.label}
      </label>
      <div className={isPassword ? "auth-login__password" : undefined}>
        <input
          className="field__input"
          id={`auth-${props.name}`}
          name={props.name}
          type={isPassword && revealed ? "text" : props.type}
          inputMode={props.name === "qq" ? "numeric" : undefined}
          placeholder={props.placeholder}
          autoComplete={props.autoComplete}
          minLength={props.minLength}
          maxLength={props.maxLength}
          required
        />
        {isPassword ? (
          <button
            className="auth-login__password-toggle"
            type="button"
            aria-label={revealed ? loginCopy.hidePassword : loginCopy.showPassword}
            aria-pressed={revealed}
            onClick={() => setRevealed((visible) => !visible)}
          >
            <Icon name={revealed ? "eyeOff" : "eye"} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
