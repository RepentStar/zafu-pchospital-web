# 维修活动模块 · 技术方案与任务卡

> **基线**：`4472b49`（`origin/main`，PR #57 已合入）  
> **分支**：`feat/repair-activity`（基于上述基线）  
> **工程约束**：做完测过后向上游开 PR；**未经 Hanlin 明确允许不得 merge**（含 squash/rebase）。  
> **产品交接**：公开报名 / 成员签到排队接待落单 / 管理 CRUD；本轮不做登录后报名、预约时段、二次确认编辑页、活动评价、短信验证码。

调研底稿：`/workspace/repair-activity-survey.md`。

---

## 1. 目标与边界

| 做 | 不做 |
|---|---|
| 活动 CRUD + 服务端四态 | 登录态报名 |
| 公开列表/详情/报名/查号改类型 | 预约时段 |
| 成员出勤 → 多选签到 → 排队 → 任选接待 → 自动落维修单 | 维修单编辑页二次确认 |
| 管理端查看/改/删报名 | 活动评价、短信 OTP |
| 防注入、防刷（技术定）；异常高频必须拦住 | 多实例分布式限流（沿用现有内存限流，文档注明） |

---

## 2. 领域模型（新建）

均在 `prisma/schema.prisma` 新增；表名 snake_case；主键 UUID Char(36)；时间 `DateTime(3)` 存 UTC。

### 2.1 `RepairActivity`（活动）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | Char(36) | PK |
| `title` | VarChar(120) | 标题 |
| `activityAt` | DateTime(3) | **活动时间**（举行时刻；`now >= activityAt` ⇒ 已结束） |
| `capacity` | Int | 人数上限 ≥ 1 |
| `signupOpensAt` | DateTime(3) | 报名开始 |
| `signupClosesAt` | DateTime(3) | 报名截止 |
| `createdBy` / `createdAt` / `updatedAt` / `deletedAt` | 同站内惯例 | 软删 |

**时间校验（写入时强制，写进任务卡）**：

1. `signupOpensAt < signupClosesAt`
2. `signupClosesAt <= activityAt`（报名不得晚于活动开始）
3. 更新时若已有报名，不允许把 `capacity` 调到 **低于** 当前有效报名数；其它字段可改

**派生状态（不落库，服务端按 UTC `now` 计算，展示用 Asia/Shanghai）**：

| 对外四态 | 条件（优先级从上到下） |
|---|---|
| `ENDED` 已结束 | `now >= activityAt` |
| `CLOSED` 报名截止 | `now >= signupClosesAt` |
| `FULL` 已报满 | `signupOpensAt <= now < signupClosesAt` 且有效报名数 ≥ `capacity` |
| `OPEN` 报名中 | `signupOpensAt <= now < signupClosesAt` 且有效报名数 < `capacity` |
| （隐藏）未开始 | `now < signupOpensAt` → 列表可显示为「未开始」或并入不可报名；**公开列表仍展示**，详情可进但报名按钮禁用。若产品只要四态，未开始对外文案用「报名截止」易误导——**本方案对外第五态文案：`UPCOMING`「未开始」**；若产品坚持四态，则未开始并入列表展示但不可报名，badge 用「未开始」。**默认实现：五态计算，UI 文案五态；验收对照产品四态时，将 UPCOMING 与 CLOSED 均视为「不可新报」。** |

名额：有效报名 = `deletedAt IS NULL` 且状态 ∈ {`REGISTERED`,`CHECKED_IN`,`SERVED`}（删除才释放；撤回排队不删报名，只改状态）。

### 2.2 `RepairActivityRegistration`（客户报名）

| 字段 | 说明 |
|---|---|
| `id` | PK |
| `activityId` | FK → RepairActivity |
| `name` | 姓名 VarChar(40) |
| `phone` | **规范化后** 11 位手机号 |
| `phoneLast4` | 冗余后四位，便于查询索引（可选；也可用 phone 等值查） |
| `issueType` | 枚举：`CLEAN_PASTE` \| `CLEAN_ONLY` \| `SOFTWARE_SYSTEM` \| `OTHER`（清灰换硅脂 / 清灰 / 软件 / 系统问题 / 其他故障） |
| `status` | `REGISTERED` \| `CHECKED_IN` \| `SERVED` |
| `consentVersion` | 报名时同意的免责声明版本（`repairActivityConsentVersion`），nullable —— 历史报名没有签署动作（issue #62 前端3） |
| `consentAcceptedAt` | 同意时间，nullable，与 `consentVersion` 同时写入 |
| `checkedInAt` | 签到入队时间，nullable |
| `servedAt` | 接待完成时间，nullable |
| `servedByMemberProfileId` | 接待成员，nullable |
| `repairRecordId` | 落单后的维修单，nullable，unique |
| `createdAt` / `updatedAt` / `deletedAt` | 管理删除 = 软删，释放名额 |

约束：

- `@@unique([activityId, phone])` 在 `deletedAt IS NULL` 上：MariaDB 对可空唯一支持差，**用应用层 + 事务内查重**；另加普通索引 `(activityId, phone)`、`(activityId, status, checkedInAt)`。
- 同活动同手机号仅一条有效报名。

### 2.3 `RepairActivityAttendance`（成员本场出勤）

| 字段 | 说明 |
|---|---|
| `id` | PK |
| `activityId` | FK |
| `memberProfileId` | FK |
| `checkedInAt` | 出勤时间 |
| `@@unique([activityId, memberProfileId])` | 本场一次 |

无出勤 ⇒ 不可签到客户 / 不可接待。

---

## 3. 状态机与关键操作

### 3.1 报名生命周期

```
(公开报名) → REGISTERED
     │ 成员多选签到
     ▼
CHECKED_IN（入队，记录 checkedInAt）
     │ 成员接待成功落单
     ▼
SERVED（不可撤回）

CHECKED_IN ─撤回→ REGISTERED（清空 checkedInAt；可再签到）
管理软删 → 名额释放；公开端不可再改
```

### 3.2 公开改类型

- 仅可改 `issueType`
- 允许：`status === REGISTERED` 且活动未 `ENDED`
- 拒绝：`CHECKED_IN` / `SERVED`，或查无

### 3.3 接待落单映射

复用现有 `repairService.createDraft` + `submit`（同一可序列化事务内）：

| `issueType` | `categoryId` |
|---|---|
| `CLEAN_PASTE` / `CLEAN_ONLY` | seed 已有 `COOLING_CLEANING`（「散热 / 清灰」） |
| `SOFTWARE_SYSTEM` | seed 已有 `SYSTEM`（「系统问题」）—— issue #62 新增的报名选项 |
| `OTHER` | **新建**分类 `OTHER_FAULT` / 「其他故障」（seed + migration；勿复用笼统的 `OTHER`「其他」，避免语义漂移） |

落单字段建议：

- `repairDate`：活动日（`activityAt` 的上海日历日）
- `content`：固定模板含活动标题、客户姓名、脱敏电话、故障类型文案
- `result`：`COMPLETED`（时长本轮不管 → `durationMinutes` 可 null 若校验允许；若 submit 强制时长，填 `1` 并在 remark 注明「活动接待自动落单」）
- 照片：若 submit 强制 ≥1 张——**风险点**。落地前写手必须确认 `validateSubmission`；若强制照片，本轮在事务内挂一张系统占位图 **或** 为活动落单增加 service 内部通道 `createFromActivityServe` 跳过照片校验（优先：**内部 service 方法**，不放开公开 API）。技术方案定：**在 `repair-service` 增加 `createSubmittedForActivity`，权限仅活动接待调用，跳过照片必填，仍写 timeline 与审计**。

失败：整单回滚；报名保持 `CHECKED_IN`，不标 `SERVED`。

---

## 4. API 草图

权限码新增（写入 `Permission` + `rolePermissions`）：

- `activity:admin` — 管理 CRUD / 报名管理（ADMIN）
- `activity:staff` — 成员出勤/签到/排队/接待（MEMBER + ADMIN）

公开接口无登录；写操作 `assertSameOrigin` + `enforceRateLimit`。

### 4.1 公开

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/repair-activities` | 列表，按 `activityAt` 升序；含派生 status、剩余名额；电话不出现 |
| GET | `/api/v1/repair-activities/[id]` | 详情；**ENDED 返回 404 或 410 + 文案**（列表不可点，直链也不可进） |
| POST | `/api/v1/repair-activities/[id]/registrations` | 报名；body: name, phone, issueType, consentAccepted（必须为 `true`，否则 400 `ACTIVITY_CONSENT_REQUIRED`） |
| POST | `/api/v1/repair-activities/[id]/registrations/lookup` | 查询；body: phone → 返回可改类型所需字段（脱敏） |
| PATCH | `/api/v1/repair-activities/[id]/registrations/[regId]` | 仅 issueType；需 phone 校验或 lookup 签发的短期 token（**推荐：lookup 返回 `editToken`（HMAC，10min），PATCH 带 token**，避免只靠 regId 枚举） |

限流：按 IP，报名/查询/改类型均 `enforceRateLimit`，建议 `key=activity-signup:{ip}` limit=10/min；同一 phone 另限 5/min。

校验：`normalizePhone`；姓名 trim 2–40；`issueType` 白名单；防注入：参数化 Prisma，禁止拼接 SQL；文本输出 React 默认转义。

### 4.2 成员

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/v1/member/repair-activities/[id]/attendance` | 参加本场 |
| GET | `/api/v1/member/repair-activities/[id]/board` | 左侧报名（可签到）+ 右侧排队；电话脱敏 |
| POST | `/api/v1/member/repair-activities/[id]/check-in` | body: `registrationIds[]` + 可选 `issueTypeUpdates: { registrationId, issueType }[]`，核对后整批原子签到与改类型 |
| POST | `/api/v1/member/repair-activities/[id]/withdraw` | body: `registrationId` 撤回 |
| POST | `/api/v1/member/repair-activities/[id]/serve` | body: `registrationId` 接待落单 |

均需 `requirePermission(…, "activity:staff")` + 已出勤（serve/check-in/withdraw）。

签到确认弹窗按待签到列表顺序展示姓名、脱敏电话、已填机型与原类型，可独立修改类型；
取消不保存，最终确认只提交快照 ID 与实际编辑项。普通成员无需签到、交给现场管理员的 XS 提醒
不改变 MEMBER / ADMIN 权限。类型、状态、时间及类型变更 USER 审计在同一事务内提交；
已入队相同类型重试幂等、不同类型拒绝，任一客户无效整批回滚。撤回保留修正后的类型，
后续接待草稿分类使用该类型。完整输入与错误语义见 `docs/contracts/api-v1.md`。

### 4.3 管理

| 方法 | 路径 | 说明 |
|---|---|---|
| CRUD | `/api/v1/admin/repair-activities` | 列表/创建/改/软删 |
| GET/PATCH/DELETE | `/api/v1/admin/repair-activities/[id]/registrations`… | 报名管理；PATCH 可改 name/phone/issueType；DELETE 软删 |

模板对齐 `SkillAdminPanel` / `CategoryAdminPanel`；删除用确认模态。

---

## 5. 前端路由与导航

| 端 | 路由 | 导航 |
|---|---|---|
| 公开 | `/repair-activities` 列表；`/repair-activities/[id]` 详情（含报名+查询改类型） | `mainNav` 增加「05 维修活动」（后续 docs 顺延或产品接受编号插入；**实现：新条目 index `05`，原文档改为 `06`**——需产品知悉编号变动） |
| 成员 | `/member/repair-activities` 活动列表；`/member/repair-activities/[id]` 双栏工作台 | `memberNav` 工作组增加「维修活动」 |
| 管理 | `/admin/repair-activities`；`/[id]` 报名管理 | `adminNavGroups` 常驻或设置菜单择一：**常驻**（活动运营频度高） |

电话展示：中间四位 `****`（`138****5678`），公开与成员一致；管理端可看全号。

已结束：列表卡片 `aria-disabled` / 无链接；不要用「假链接」。

---

## 6. 目录落位（建议）

```
src/features/repair-activities/
  repair-activity-service.ts      # 状态计算、CRUD、报名
  repair-activity-staff-service.ts # 出勤/签到/排队/接待
  repair-activity-validation.ts
  repair-activity-http.ts
  phone-mask.ts
prisma/migrations/…_repair_activities/
src/app/repair-activities/...
src/app/member/repair-activities/...
src/app/admin/repair-activities/...
src/app/api/v1/repair-activities/...
src/app/api/v1/member/repair-activities/...
src/app/api/v1/admin/repair-activities/...
```

单测：状态机纯函数、名额边界、改类型拒绝矩阵、落单映射、限流键。不强制 E2E。

---

## 7. 里程碑与任务卡

### M1 — 活动 + 公开报名（对应 US-P* + US-A1）

| ID | 任务 | 验收要点 | 依赖 |
|---|---|---|---|
| **T-RA-1** | Prisma：三表 + migration + seed `OTHER_FAULT` | migrate 干净；分类可查 | 基线 |
| **T-RA-2** | 状态纯函数 + 时间校验单测 | 四态/未开始、满员释放回 OPEN、截止与结束边界 | T-RA-1 |
| **T-RA-3** | Admin API：活动 CRUD | 时间规则拒绝非法组合；软删 | T-RA-1 |
| **T-RA-4** | Admin UI：活动列表/表单 | 对齐 skills 面板交互 | T-RA-3 |
| **T-RA-5** | 公开 API：列表/详情/报名/lookup/改类型 + 限流 + editToken | 同号拒绝；ENDED 详情不可进；高频 429 | T-RA-2 |
| **T-RA-6** | 公开页 + `mainNav` | 排序、四态文案、已结束不可点、报名/改类型体验 | T-RA-5 |

### M2 — 成员签到接待（US-M*）

| ID | 任务 | 验收要点 | 依赖 |
|---|---|---|---|
| **T-RA-7** | 出勤 API + 板面 API | 未出勤操作 403 | M1 |
| **T-RA-8** | 多选签到 + 撤回 | 队序按 `checkedInAt` ASC；已接待不可撤回 | T-RA-7 |
| **T-RA-9** | 接待落单 `createSubmittedForActivity` | 分类映射正确；失败不 SERVED；成功挂 repairRecordId | T-RA-8 |
| **T-RA-10** | 成员 UI 双栏工作台 + 导航 | 左多选签到，右排队+故障类型，任选接待 | T-RA-9 |

### M3 — 管理报名、联调、PR（US-A2）

| ID | 任务 | 验收要点 | 依赖 |
|---|---|---|---|
| **T-RA-11** | 管理端报名查看/改/删 | 删后名额释放；有确认 | M1 |
| **T-RA-12** | 联调 + 测试对照验收清单 | 静态/实点按测试卡；修缺陷 | M2+T-RA-11 |
| **T-RA-13** | 向上游开 PR（**不 merge**） | PR 描述含基线 SHA、测试说明；等 Hanlin | T-RA-12 |

---

## 8. 测试验收清单（给测试）

**公开**：列表顺序；状态文案；已结束不可进详情（含直链）；仅 OPEN 可新报；同号二次报名失败；查号改类型成功/已签到失败；限流触发。  
**成员**：未出勤阻断；多选签到；排队序；撤回；接待后有维修单且分类对；落单失败残留在队。  
**管理**：CRUD 时间非法拒绝；删报名后 FULL→OPEN（窗口内）。  
**回归**：现有维修提交、分类管理、导航设置菜单不受损。

---

## 9. 产品确认（2026-09-25 · 产品经理）

以下已确认，写手按此实现与验收，无需再等口径：

1. 公开导航插入「05 维修活动」，原技术文档改「06」。
2. `now < signupOpensAt` 对外文案「未开始」，不可新报；列表可展示、详情可进但报名禁用。验收上将 UPCOMING 与 CLOSED 均视为「不可新报」；对外允许五态文案，不机械四态 badge。
3. 已结束直链友好 404「活动已结束」。

补充验收（方案已有，产品明示认可）：

- 改类型：仅 `REGISTERED` 且活动未 `ENDED`（报名截止后、活动未开始前仍可改类型）；已签到/排队/已接待不可改。
- 名额只随管理软删释放；撤回排队不减名额。
