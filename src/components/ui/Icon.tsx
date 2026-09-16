import type { ReactNode, SVGProps } from "react";

/**
 * 图标
 *
 * 设计基准 Demo 使用内联 SVG 线性图标（24 格、stroke 2、round 端点）。
 * 这里把用到的图标集中成一份，避免各页面零散粘贴 SVG 造成风格漂移。
 * 新增图标时保持同样的画布、线宽与端点规则。
 */

export type IconName =
  | "menu"
  | "close"
  | "book"
  | "chevronRight"
  | "chevronLeft"
  | "chevronDown"
  | "arrowDown"
  | "arrowUpRight"
  | "fileText"
  | "github"
  | "eye"
  | "eyeOff"
  | "sun"
  | "moon";

const shapes: Record<IconName, ReactNode> = {
  menu: (
    <>
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </>
  ),
  close: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  book: (
    <>
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </>
  ),
  chevronRight: <path d="m9 18 6-6-6-6" />,
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  arrowDown: (
    <>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </>
  ),
  arrowUpRight: (
    <>
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </>
  ),
  fileText: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </>
  ),
  github: (
    <>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3.3-.4 6.8-1.6 6.8-7.4A5.8 5.8 0 0 0 18.2 3a5.4 5.4 0 0 0-.1-2.8S17.1-.2 15 1.8a13.4 13.4 0 0 0-7 0C5.9-.2 4.9.2 4.9.2A5.4 5.4 0 0 0 4.8 3a5.8 5.8 0 0 0-1.6 4.1c0 5.8 3.5 7 6.8 7.4A4.8 4.8 0 0 0 9 18v4" />
      <path d="M9 19c-3 .9-3-1.5-4.2-2" />
    </>
  ),
  eye: (
    <>
      <path d="M2.1 12s3.6-7 9.9-7 9.9 7 9.9 7-3.6 7-9.9 7-9.9-7-9.9-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="m3 3 18 18" />
      <path d="M10.6 5.2Q11.3 5 12 5c6.3 0 9.9 7 9.9 7a16 16 0 0 1-2.4 3.4" />
      <path d="M6.1 6.1C3.5 8 2.1 12 2.1 12s3.6 7 9.9 7c1.6 0 3-.4 4.2-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  /* 正常模式 / 深色模式：主题切换入口使用。两者互为对照，线宽与端点规则与其他图标一致。 */
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </>
  ),
  moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
};

export type IconProps = { name: IconName } & SVGProps<SVGSVGElement>;

export function Icon({ name, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {shapes[name]}
    </svg>
  );
}
