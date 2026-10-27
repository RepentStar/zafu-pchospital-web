export const browserHintCopy = {
  title: "建议使用手机浏览器打开",
  description:
    "当前可能在 {browser} 内打开。请通过页面菜单选择「在浏览器中打开」，或复制链接到浏览器后重新登录。",
  browsers: { qq: "QQ", wechat: "微信" },
  copy: "复制链接",
  copying: "正在复制…",
  copied: "链接已复制，请在手机浏览器中打开并重新登录。",
  copyFailed: "未能自动复制，请选中下方链接手动复制。",
  linkLabel: "当前页面链接",
  close: "关闭",
} as const;

export const browserHintDismissedKey = "zafu-pchospital:browser-hint-dismissed:v1";

export const repairWorkflowLink = {
  href: "/handbook/Manual/Workflow.html",
  label: "查看维修流程",
  newTab: "（新标签页打开）",
} as const;
