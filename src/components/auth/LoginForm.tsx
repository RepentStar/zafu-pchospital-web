"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

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
      setProblem(payload.error?.message ?? "登录失败");
      setBusy(false);
      return;
    }
    router.replace(payload.data?.mustChangePassword ? "/account/change-password" : "/member");
    router.refresh();
  }
  return (
    <form className="signup__form" onSubmit={submit}>
      <Field
        name="qq"
        label="QQ 号"
        type="text"
        autoComplete="username"
        minLength={5}
        maxLength={11}
      />
      <Field
        name="password"
        label="密码"
        type="password"
        autoComplete="current-password"
        minLength={12}
        maxLength={128}
      />
      <div className="signup__actions">
        <Button type="submit" variant="solid" disabled={busy}>
          {busy ? "登录中" : "登录"}
        </Button>
      </div>
      {problem ? (
        <p className="signup__status signup__status--alert" role="alert">
          {problem}
        </p>
      ) : null}
    </form>
  );
}

function Field(props: {
  name: string;
  label: string;
  type: string;
  autoComplete: string;
  minLength: number;
  maxLength: number;
}) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={`auth-${props.name}`}>
        {props.label}
      </label>
      <input
        className="field__input"
        id={`auth-${props.name}`}
        name={props.name}
        type={props.type}
        autoComplete={props.autoComplete}
        minLength={props.minLength}
        maxLength={props.maxLength}
        required
      />
    </div>
  );
}
