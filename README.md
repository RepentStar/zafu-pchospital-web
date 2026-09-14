# 浙江农林大学电脑医院 · 社团综合服务平台

浙江农林大学电脑医院社团的官方网站。除了对外展示社团与服务范围，这里也是后续
「清灰预约、活动维修、维修备案、志愿时长」等业务功能的载体。

当前仓库完成的是**第一阶段：官网基础框架**。

---

## 当前开发阶段

第一阶段的目标不是把页面做完，而是建立一个**风格统一、目录清晰、易于多人并行开发**的基础：

- 把团队已确认的视觉基准 Demo 工程化、组件化、规范化，形成统一的 Design System
- 搭好 Next.js + TypeScript + Tailwind 的正式开发框架
- 建立四个公开页面的路由骨架
- 写清协作文档，让新成员与 AI Agent 都知道代码该放哪里、什么不能改

**本阶段不实现**（属于后续阶段）：登录、用户/成员/权限系统、管理后台、数据库、
报修系统、活动报名、维修备案、志愿时长、API。详见
[`docs/architecture.md`](docs/architecture.md) 第 6 节。

已完成页面：

| 路由     | 页面         | 状态                                                       |
| -------- | ------------ | ---------------------------------------------------------- |
| `/`      | 首页         | 完整复刻设计基准的六个区块                                 |
| `/about` | 关于我们     | 内容骨架（社团介绍 / 服务范围 / 联系方式），待社团补充细节 |
| `/join`  | 加入我们     | 内容骨架，标注为「待补充」                                 |
| `/docs`  | 技术文档入口 | 站内文档入口：指向 `/handbook/`（mdBook 构建，不在本站重实现） |

---

## 技术栈

| 项目   | 选择                                           |
| ------ | ---------------------------------------------- |
| 框架   | Next.js 15（App Router）                       |
| 语言   | TypeScript（strict）                           |
| 样式   | Tailwind CSS v4 + `src/app/globals.css` 组件层 |
| 包管理 | pnpm                                           |
| 规范   | ESLint（`eslint-config-next`）+ Prettier       |

---

## 快速开始

```bash
pnpm install
pnpm dev
```

打开 `http://localhost:3000` 即可开始开发。

> 如果本机尚未启用 Corepack：
>
> ```bash
> corepack enable
> ```
>
> 随后直接在项目目录运行 `pnpm install`。corepack 会使用项目固定的 pnpm 版本

### 常用命令

| 命令                 | 说明                                                         |
| -------------------- | ------------------------------------------------------------ |
| `pnpm dev`           | 启动开发服务器                                               |
| `pnpm build`         | 生产构建（**含站内技术文档**，需要 mdBook，见下节）          |
| `pnpm build:site`    | 只编译官网，跳过文档构建（用当时磁盘上的清单，**不要用于部署**） |
| `pnpm docs:build`    | 只生成站内技术文档到 `public/handbook/`                      |
| `pnpm start`         | 以生产模式启动（需先 build）                                 |
| `pnpm lint`          | ESLint 检查 + 调色板一致性校验                               |
| `pnpm check:palette` | 只跑调色板校验（官网 vs 文档站两份令牌是否一致）             |
| `pnpm format`        | Prettier 格式化                                              |
| `pnpm format:check`  | 检查格式是否符合规范                                         |

### 站内技术文档（`/handbook`）

`/docs` 页指向站内的 `/handbook/`，正文由独立仓库
[`ZAFU-PCHospital-Doc`](https://github.com/ZAFU-PCHospital/ZAFU-PCHospital-Doc)
在**构建期**生成。`pnpm build` 已包含这一步，所以需要两个额外前置条件：

1. **mdBook**（Rust 工具链，npm 里没有）。二选一：

   ```bash
   cargo install mdbook
   # 或从 https://github.com/rust-lang/mdBook/releases 下载对应平台的二进制，然后
   MDBOOK_BIN=/path/to/mdbook pnpm build
   ```

2. **文档源码**：缺省会自动浅克隆到 `.docs-source/`（已 gitignore），**通常不用手动做**。
   想用本地已有的检出：`DOCS_SOURCE_DIR=/path/to/ZAFU-PCHospital-Doc pnpm build`。
   完全离线：`DOCS_OFFLINE=1`（但必须已经先有源码）。

只开发官网页面时不必装 mdBook：`pnpm install` 会通过 `postinstall` 写一份
**占位清单**（`src/data/doc-manifest.json`，目录为空），所以 `pnpm dev` 与
`pnpm build:site` 开箱可用；要看真实目录再跑 `pnpm docs:build`（需要 mdBook）。

> `src/data/doc-manifest.json` 是**构建产物**（已 gitignore、不进仓库），
> 而 `src/lib/docs.ts` 是静态 import 它 —— 文件缺失时 `next dev` / `next build`
> 会直接报 `Module not found`。`tools/ensure-doc-manifest.mjs` 负责在缺失时补占位清单，
> 已挂在 `postinstall`、`predev`、`prebuild:site` 上。
>
> `pnpm build:site` 用的是**当时磁盘上的**清单：若还是占位清单，站点 `/docs` 会显示
> 0 个条目。**不要用它部署** —— 部署必须用 `pnpm build`（含文档构建）。

> 注意 `public/handbook/` 是构建产物：`pnpm dev` 下 `/handbook/` 是空的
> （`/handbook` → `/handbook/index.html` 会 404），要本地看文档先跑一次 `pnpm docs:build`。

---

## 目录结构

```text
.
├── AGENTS.md              # 给 AI Agent 的项目规则（必读）
├── README.md              # 本文件
├── docs/                  # 协作文档
│   ├── design-system.md   # 视觉唯一来源
│   ├── architecture.md    # 架构与目录职责
│   └── git-workflow.md    # 分支与 PR 流程
│
├── src/
│   ├── app/               # 路由与页面
│   ├── components/
│   │   ├── layout/        # 全站骨架（Header / Footer / Container / PageHead / SiteEffects）
│   │   ├── ui/            # 通用 UI 原语（Button / Card / Section / Readout / Icon ...）
│   │   ├── home/          # 仅首页使用的区块
│   │   └── docs/          # 文档相关区块
│   ├── config/            # 站点配置与页面文案数据
│   ├── lib/               # 纯逻辑工具
│   └── data/              # 文档仓库清单（构建脚本生成）
│
├── public/
│   ├── fonts/             # 品牌字体
│   └── handbook/          # 【生成物】站内技术文档，pnpm docs:build 产出，已 gitignore
├── shots/                 # 视觉验证截图（按显示模式命名，见「本地验证」）
├── tools/                 # 文档构建 + 调色板校验 + 本地验证（CDP 诊断）
├── .docs-source/          # 【本地产物】文档仓库检出，构建时自动浅克隆，已 gitignore
└── zafu-pchospital-site/  # 【只读】设计基准 Demo
```

---

## 文档在哪

| 你想知道                                    | 看这个                                                                       |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| 界面应该长什么样、颜色/字号/间距/圆角的规则 | [`docs/design-system.md`](docs/design-system.md)                             |
| 代码应该放在哪里、各层职责、未来如何扩展    | [`docs/architecture.md`](docs/architecture.md)                               |
| 分支怎么建、commit 怎么写、PR 怎么提        | [`docs/git-workflow.md`](docs/git-workflow.md)                               |
| 业务需求与规则                              | [`电脑医院社团综合服务平台需求分析.md`](电脑医院社团综合服务平台需求分析.md) |

### AGENTS.md 的作用

[`AGENTS.md`](AGENTS.md) 是给后续 AI Agent（Codex / Claude Code / Kimi / Cursor 等）阅读的
**项目规则文件**。它规定了：

- 技术栈不得擅自更换（框架 / 包管理器 / CSS 体系 / UI Framework）
- 所有页面必须遵守 `docs/design-system.md`，不得自创品牌色或重建 Header / Footer / Button
- 只修改当前任务真正需要修改的代码，不做无关重构
- 已经存在且工作的代码优先复用

多人 + 多 Agent 并行开发时，这个文件是防止风格跑偏和互相覆盖的第一道约束。

---

## 关于设计基准 Demo

`zafu-pchospital-site/` 是团队已确认的视觉基准，**只读参考，不再改动**。

- 它不参与构建（Next.js 只处理 `src/`）
- ESLint / Prettier 已忽略该目录
- 需要确认某个视觉细节时，直接读其中的 `assets/css/style.css`

`src/app/globals.css` 中的设计令牌与该 Demo **逐值一致**，视觉规则在
[`docs/design-system.md`](docs/design-system.md) 中有完整记录。

---

## 本地验证

`tools/` 下有两个基于 Chrome DevTools Protocol 的验证脚本（无需额外依赖）：

```bash
# 1. 启动一个带调试端口的 Chrome
chrome --headless=new --remote-debugging-port=9222 --user-data-dir=./.chrome-profile about:blank

# 2. 诊断某个页面并截图
node tools/inspect.mjs http://localhost:3000/ shots/01-home-desktop-normal.png 1440 900
CAP_SEL="#services" node tools/inspect.mjs http://localhost:3000/ shots/02-home-services-normal.png

# 3. 收集 console 报错与运行时异常
node tools/console-probe.mjs http://localhost:3000/
```

脚本会输出 `PAGE_PROBLEMS`（页面异常 / console 错误）与 `BAD_REQUESTS`（失败请求），
两项都为空才算通过。

### shots/ 的命名

`shots/` 里的截图一律以 `<编号>-<页面>-<视图>-<模式>.png` 命名，模式取
`normal` / `dark`，与 `<html data-mode>` 一致。

**每个视图两种模式各一张，同一编号成对出现**，文件排序也天然相邻：

```text
01-home-desktop-normal.png       01-home-desktop-dark.png
14-join-signup-done-normal.png   14-join-signup-done-dark.png
```

站点有两套主题（见 design-system 第 9 节）。主题改的不只是颜色 —— 走线栅格、
扫描线、水印描边、索引栏面板色、准星混合模式都随主题变，所以**每个视图都要
两种模式各拍一张**，不能只留一套。

模式用 `THEME_MODE` 指定，成对拍：

```bash
THEME_MODE=normal CAP_SEL="#services" node tools/inspect.mjs URL shots/02-home-services-normal.png
THEME_MODE=dark   CAP_SEL="#services" node tools/inspect.mjs URL shots/02-home-services-dark.png
```

站点把用户的选择存在 `localStorage` 里、引导脚本在 hydration 之前就读它，
所以模式必须在**文档创建之前**写进去。`tools/inspect.mjs` 已经处理好这件事；
**不传 `THEME_MODE` 时它会主动清掉那个键**，避免上一轮留下的深色选择
把后面所有截图都拍成深色（这个坑踩过一次）。

---

## 持续集成（CI）

`.github/workflows/ci.yml` 在 **PR** 与 **push 到 `main`** 时运行（也可手动触发）：

1. 解析并固定文档版本（`DOCS_REF` → sha，保证构建可复现）
2. 把文档仓库检出到 `.docs-source/`
3. 安装**固定版** mdBook（版本写在 workflow 的 `MDBOOK_VERSION`，不用 `latest`）
4. `pnpm install` → `pnpm lint` → `pnpm build`（含文档）
5. 校验构建产物：`public/handbook/index.html`、`searchindex`、官网主题 CSS/JS、清单结构
6. 起生产服务冒烟：`/`、`/about`、`/join`、`/docs`、`/handbook/` 必须全部 200
7. `main` 上通过后调用部署

**有两件事只能在 GitHub 上操作才生效**（代码里做不到）：

- **把 `CI / 校验与构建` 设为 `main` 的必需状态检查**（Settings → Branches）。
  当前 `main` **未启用任何分支保护**；不设置的话 CI 只是"跑给你看"，拦不住合并。
- **配置部署**：设置仓库变量 `DEPLOY_COMMAND`（部署目标尚未确定，见 workflow 内注释）。
  未配置时部署步骤只打印 `::warning::`，不会失败。

可选：设置仓库变量 `DOCS_REF` 指定文档仓库的分支（默认 `main`）。

---

## 参与开发

1. 读 [`AGENTS.md`](AGENTS.md) 与 [`docs/design-system.md`](docs/design-system.md)
2. 从最新 `main` 建分支：`git switch -c feat/xxx`
3. 开发后自检：`pnpm lint && pnpm build`
   （`build` 需要 mdBook，见[「站内技术文档」](#站内技术文档handbook)；
   只改页面、本机没有 mdBook 时可用 `pnpm build:site`）
4. 提交并发起 Pull Request（**禁止直接 push `main`**）

完整流程见 [`docs/git-workflow.md`](docs/git-workflow.md)。
