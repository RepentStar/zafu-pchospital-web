export type InAppBrowser = "qq" | "wechat" | null;

/** 仅识别明确的应用标记；MQQBrowser / QQBrowser / TBS 本身不表示 QQ 内置浏览器。 */
export function detectInAppBrowser(userAgent: string): InAppBrowser {
  if (/(?:^|[\s;(])MicroMessenger\//i.test(userAgent)) return "wechat";
  if (/(?:^|[\s;(])QQ\/\d+(?:\.\d+)*(?=$|[\s;)])/i.test(userAgent)) return "qq";
  return null;
}
