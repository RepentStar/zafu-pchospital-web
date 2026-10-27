"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { browserHintCopy as copy, browserHintDismissedKey } from "@/config/browser-hint";
import { detectInAppBrowser, type InAppBrowser } from "@/lib/in-app-browser";
import { cn } from "@/lib/utils";

export function BrowserHint({
  loginPath,
  className,
}: {
  /** 仅由 LoginPanel 用已校验的 mode / returnTo 构造，不接收原始查询串。 */
  loginPath?: string;
  className?: string;
}) {
  const [browser, setBrowser] = useState<InAppBrowser>(null);
  const [result, setResult] = useState<"idle" | "copying" | "copied" | "failed">("idle");
  const [manualLink, setManualLink] = useState("");

  useEffect(() => {
    // 服务端与客户端首帧均不显示；存储受限时仍提供提醒和本次挂载内的关闭。
    try {
      if (sessionStorage.getItem(browserHintDismissedKey) === "1") return;
    } catch {}
    setBrowser(detectInAppBrowser(navigator.userAgent));
  }, []);

  function dismiss() {
    setBrowser(null);
    try {
      sessionStorage.setItem(browserHintDismissedKey, "1");
    } catch {}
  }

  async function copyLink() {
    // 成员页只复制当前 pathname，不携带查询串或片段；登录页使用服务端过滤后的路径。
    const url = new URL(loginPath ?? window.location.pathname, window.location.origin).href;
    setResult("copying");
    try {
      await navigator.clipboard.writeText(url);
      setResult("copied");
      setManualLink("");
    } catch {
      setManualLink(url);
      setResult("failed");
    }
  }

  if (!browser) return null;

  return (
    <Card variant="notice" className={cn("block min-w-0 p-4", className)}>
      <div>
        <h2 className="mb-2 text-base leading-normal font-bold">{copy.title}</h2>
        <p className="text-ink-2 mb-3 text-[0.9375rem] wrap-anywhere">
          {copy.description.replace("{browser}", copy.browsers[browser])}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void copyLink()} disabled={result === "copying"}>
          {result === "copying" ? copy.copying : copy.copy}
        </Button>
        <Button variant="ghost" onClick={dismiss}>
          {copy.close}
        </Button>
      </div>
      <div role="status" className="text-ink-2 text-sm wrap-anywhere [&:not(:empty)]:mt-3">
        {result === "copied" ? copy.copied : result === "failed" ? copy.copyFailed : null}
      </div>
      {manualLink ? (
        <label className="text-ink-2 mt-3 grid gap-2 text-sm">
          <span>{copy.linkLabel}</span>
          <textarea
            className="field__input w-full min-w-0 resize-y"
            readOnly
            rows={3}
            value={manualLink}
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>
      ) : null}
    </Card>
  );
}
