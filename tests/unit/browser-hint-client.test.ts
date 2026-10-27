import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { type TestContext } from "node:test";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { browserHintCopy, browserHintDismissedKey } from "../../src/config/browser-hint";

const require = createRequire(import.meta.url);
const React = require("react") as typeof import("react");

async function mount(
  t: TestContext,
  options: { blockedStorage?: boolean; loginPath?: string } = {},
) {
  (globalThis as unknown as { React: typeof React }).React = React;
  const storage = new Map<string, string>();
  let rejectCopy = false;
  const copied: string[] = [];
  const originals = ["window", "navigator", "sessionStorage"].map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  );
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: {
        origin: "https://pczafu.cn",
        pathname: "/member/repair-activities/a",
        search: "?token=must-not-copy&phone=must-not-copy",
        hash: "#must-not-copy",
      },
    },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      userAgent: "Mozilla/5.0 QQ/9.0.0",
      clipboard: {
        async writeText(url: string) {
          if (rejectCopy) throw new Error("denied");
          copied.push(url);
        },
      },
    },
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem(key: string) {
        if (options.blockedStorage) throw new Error("blocked");
        return storage.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        if (options.blockedStorage) throw new Error("blocked");
        storage.set(key, value);
      },
    },
  });

  let slots: unknown[] = [];
  let cursor = 0;
  let effect: (() => void) | undefined;
  let initialized = false;
  t.mock.method(React, "useState", (initial: unknown) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], (value: unknown) => (slots[index] = value)];
  });
  t.mock.method(React, "useEffect", (callback: () => void) => {
    if (!initialized) effect = callback;
  });
  const { BrowserHint } = await import("../../src/components/ui/BrowserHint");
  const view = () => {
    cursor = 0;
    return BrowserHint({ loginPath: options.loginPath });
  };
  const hydrate = () => {
    const first = view();
    assert.equal(first, null, "首帧保持与 SSR 一致");
    initialized = true;
    effect?.();
    return view();
  };
  const html = () => renderToStaticMarkup(view());
  const buttons = () => {
    const node = view();
    assert.ok(node);
    const children = React.Children.toArray(node.props.children);
    const actions = children[1] as React.ReactElement<{ children: ReactNode }>;
    return React.Children.toArray(actions.props.children) as React.ReactElement<{
      onClick: () => void;
    }>[];
  };
  t.after(() => {
    for (const [key, original] of originals) {
      if (original) Object.defineProperty(globalThis, key, original);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  return {
    hydrate,
    html,
    view,
    storage,
    copied,
    async copy(fail = false) {
      rejectCopy = fail;
      buttons()[0].props.onClick();
      await new Promise((resolve) => setImmediate(resolve));
    },
    close() {
      buttons()[1].props.onClick();
    },
    remount() {
      slots = [];
      initialized = false;
      return hydrate();
    },
  };
}

test("复制成员 pathname、失败时手动复制，关闭状态跨挂载保留", async (t) => {
  const hint = await mount(t);
  hint.hydrate();
  assert.match(hint.html(), /当前可能在 QQ 内打开/);
  await hint.copy();
  assert.deepEqual(hint.copied, ["https://pczafu.cn/member/repair-activities/a"]);
  assert.ok(hint.html().includes(browserHintCopy.copied));
  await hint.copy(true);
  assert.ok(hint.html().includes(browserHintCopy.copyFailed));
  assert.match(hint.html(), /<textarea[^>]*readonly/i);
  hint.close();
  assert.equal(hint.view(), null);
  assert.equal(hint.storage.get(browserHintDismissedKey), "1");
  assert.equal(hint.remount(), null);
});

test("存储受限不影响关闭；登录页复制已过滤的模式和业务回跳", async (t) => {
  const hint = await mount(t, {
    blockedStorage: true,
    loginPath: "/login?mode=register&returnTo=%2Fmember%2Frepair-activities",
  });
  hint.hydrate();
  await hint.copy();
  assert.deepEqual(hint.copied, [
    "https://pczafu.cn/login?mode=register&returnTo=%2Fmember%2Frepair-activities",
  ]);
  hint.close();
  assert.equal(hint.view(), null);
});

test("未知 UA 不提示；剪贴板不可用时仍提供手动复制", async (t) => {
  const hint = await mount(t);
  Object.assign(navigator, { userAgent: "unknown-client" });
  assert.equal(hint.hydrate(), null);
  Object.assign(navigator, { userAgent: "MicroMessenger/8.0.40", clipboard: undefined });
  hint.remount();
  assert.match(hint.html(), /当前可能在 微信 内打开/);
  await hint.copy();
  assert.ok(hint.html().includes(browserHintCopy.copyFailed));
});

test("共用登录面板在两种模式保留流程入口，提醒与表单、账号链接顺序正确", async () => {
  (globalThis as unknown as { React: typeof React }).React = React;
  const [
    { LoginPanel },
    { BrowserHint },
    { RepairWorkflowLink },
    { LoginForm },
    { InviteRegistrationForm },
  ] = await Promise.all([
    import("../../src/components/auth/LoginPanel"),
    import("../../src/components/ui/BrowserHint"),
    import("../../src/components/ui/RepairWorkflowLink"),
    import("../../src/components/auth/LoginForm"),
    import("../../src/components/auth/InviteRegistrationForm"),
  ]);
  for (const mode of ["login", "register"] as const) {
    const panel = LoginPanel({ mode, returnTo: "/member/repair-activities/a" });
    const children = React.Children.toArray(panel.props.children) as React.ReactElement<{
      loginPath?: string;
      children?: ReactNode;
    }>[];
    assert.equal(children[0].type, BrowserHint);
    assert.equal(children[1].type, mode === "login" ? LoginForm : InviteRegistrationForm);
    const path = new URL(children[0].props.loginPath!, "https://pczafu.cn");
    assert.equal(path.searchParams.get("returnTo"), "/member/repair-activities/a");
    assert.equal(path.searchParams.get("mode"), mode === "register" ? "register" : null);
    const links = React.Children.toArray(children[2].props.children) as React.ReactElement<{
      className?: string;
    }>[];
    assert.equal(links.at(-2)?.type, RepairWorkflowLink);
    assert.equal(links.at(-1)?.props.className, "auth-login__home");
  }
  const html = renderToStaticMarkup(RepairWorkflowLink());
  assert.match(html, /href="\/handbook\/Manual\/Workflow.html"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /新标签页打开/);
});
