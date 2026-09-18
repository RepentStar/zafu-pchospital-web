# Phase 2 API v1 契约

## 通用信封

成功：`{ success: true, data, meta: { requestId, pagination? } }`。

失败：`{ success: false, error: { code, message, fieldErrors? }, meta: { requestId } }`。

生产响应不包含堆栈、SQL、表名、连接串、完整联系方式或账户存在性细节。客户端可以传
合法的 `X-Request-Id`，否则服务端生成 `req_<uuid>`。

分页默认 `page=1&pageSize=20`，`pageSize` 范围为 1–100。

## 已接线端点

### `GET /api/v1/health`

执行服务端数据库探测。成功返回 `{ status: "ok", database: "reachable" }`。

### `POST /api/v1/join-applications`

请求字段：`realName`、`qq`、`phone`、可选 `selfIntroduction`、可选
`preferredDirection`、`privacyConsent: true`。招募批次由服务端
`RECRUITMENT_CYCLE` 配置，不接受客户端指定。

首次创建返回 201；同一批次相同规范化 QQ 或手机号的重复有效提交返回原回执和 200，
`data.duplicate=true`。该公开入口保留独立的公开报名限流。

### 认证与当前用户

- `POST /api/v1/auth/login`：QQ + 密码登录并设置数据库 Session Cookie。
- `POST /api/v1/auth/logout`：撤销当前 Session 并清除 Cookie。
- `POST /api/v1/auth/password/change`：验证当前密码、修改密码、撤销其他 Session 并轮换当前 Session。
- `GET /api/v1/me`：返回当前 User、Role、Permission、MemberProfile 状态与首次改密标记。

管理员初始密码登录后，除 `/me`、改密和登出外均返回 `PASSWORD_CHANGE_REQUIRED`。所有使用
Cookie 的写接口校验 `Origin` 与 `Host` 同源。Cookie 名为 `pc_hospital_session`，使用
HttpOnly、SameSite=Lax、Path=/，生产环境启用 Secure。

### 招募、邀请码与成员核心 API

- `GET /api/v1/admin/join-applications`
- `GET /api/v1/admin/join-applications/:id`
- `POST /api/v1/admin/join-applications/:id/reviews`
- `POST /api/v1/admin/join-applications/:id/provision`
- `POST /api/v1/admin/join-applications/:id/provision/retry`
- `POST /api/v1/admin/invite-codes`
- `GET /api/v1/admin/invite-codes`
- `PATCH /api/v1/admin/invite-codes/:id`
- `POST /api/v1/admin/invite-codes/:id/revoke`
- `POST /api/v1/member-registrations/invite`
- `GET /api/v1/me`
- `POST /api/v1/admin/members`
- `POST /api/v1/admin/members/:id/disable`
- `POST /api/v1/admin/members/:id/enable`
- `POST /api/v1/admin/members/:id/password-reset`

报名列表接受 `page`、`pageSize`、`status`、`provisionStatus`、`submittedFrom`、
`submittedTo` 与 `query`；列表只返回脱敏 QQ/手机号，完整联系方式、内部备注和审核记录只在
管理员详情接口返回。邀请码注册要求密码确认，并与报名入口一样执行公开写限流。

这些端点的输入/输出 Service 契约位于 `src/types/contracts.ts`。管理员路径不是权限边界；
Route Handler 必须从数据库 Session、账号状态和有效 UserRole 构造 actor，Service 再
调用 `requirePermission`；不得信任客户端传入的角色或权限。

## 稳定错误码

错误码的唯一事实来源是 `src/lib/api/errors.ts`，包括校验、鉴权、状态机、幂等、账号冲突、
发放失败、邀请码状态、限流与内部错误。不得按 Feature 新建另一套错误格式。

## Contract 变更

修改公共 Type、Enum、错误码、API 信封或已记录端点时，必须先搜索所有生产者与消费者并在
PR 中记录影响范围。不强制单独评审；但若影响其他模块，必须在同一变更中同步 Route、Service、
客户端调用、数据迁移（如有）、Contract 测试和文档，不能保留新旧两套不兼容语义。

## M2 维修记录

成员端：

- `GET/POST /api/v1/repairs`
- `GET/PATCH/DELETE /api/v1/repairs/:id`（DELETE 仅管理员）
- `POST /api/v1/repairs/:id/submit`
- `POST /api/v1/repairs/:id/photos`
- `PATCH/DELETE /api/v1/repairs/:id/photos/:photoId`
- `GET /api/v1/repair-photos/:photoId/content`
- `GET /api/v1/repair-categories`
- `GET /api/v1/repair-members`

管理端核心 API（M6 消费，不在 M2 建完整管理页面）：

- `GET /api/v1/admin/repairs`、`GET /api/v1/admin/repairs/:id`
- `POST /api/v1/admin/repairs/:id/reviews`
- `PATCH /api/v1/admin/repairs/:id/flags`
- `POST /api/v1/admin/repair-categories`
- `PATCH /api/v1/admin/repair-categories/:id`
- `POST /api/v1/admin/repair-categories/:id/deactivate`

创建草稿、提交和审核使用 `Idempotency-Key`。更新草稿携带 `version`；过期版本返回
`REPAIR_VERSION_CONFLICT`。列表支持分页、成员、分类、状态、结果、日期、疑难、典型和关键词
筛选；普通成员只能看到本人全部状态与他人的 `APPROVED` 记录。照片内容接口要求有效 Session，
并返回私有缓存、`nosniff`、正确 MIME 与长度。

## M3 成员工作台与个人主页

```text
GET   /api/v1/member/dashboard                     # 工作台聚合视图
GET   /api/v1/member/profile                       # 自我可见资料 + 摘要 + 最近记录
PATCH /api/v1/member/profile                       # 更新昵称（乐观锁）
PUT   /api/v1/member/profile/skills                # 覆盖式保存技能集合（乐观锁）
GET   /api/v1/members/:memberProfileId/profile     # 他人内部主页（字段已裁剪）
GET   /api/v1/skills                               # 启用中的技能标签（供选择器使用）
```

所有端点为 `runtime = "nodejs"` + `dynamic = "force-dynamic"`，响应头固定
`Cache-Control: private, no-store` —— 成员资料与会话上下文不允许被任何共享缓存留存。

写入约束：

- `PATCH /member/profile` 的请求体只接受 `nickname` 与 `version`；出现其他字段
  （如 `realName`、`studentId`、`className`）返回 `VALIDATION_FAILED` 400，
  而不是静默忽略，避免客户端误以为越权字段已被写入。
- `PUT /member/profile/skills` 接受**完整期望集合** `skillIds` + `profileVersion`，
  天然幂等：取消选择走 `UserSkill` 软删除，重新选择恢复同一行；
  数量上限与未知技能分别返回 `SKILL_LIMIT_EXCEEDED` 400 / `SKILL_NOT_FOUND` 404。
- 版本过期统一返回 `MEMBER_PROFILE_VERSION_CONFLICT` 409，客户端应提示刷新而非重试。
- 写接口全部执行 `assertSameOrigin()`（Cookie 认证的 CSRF 防护）。

可见性边界：

- `GET /member/dashboard` 与 `GET /skills` 的响应**不含** QQ、学号、班级与 `userId`；
- QQ 只出现在 `GET /member/profile`（自我）与 `GET /members/:id/profile`（内部）两处，
  页面必须标注「内部可见」；
- 他人主页对不存在、已软删除、非有效成员与无权访问统一返回 `MEMBER_PROFILE_NOT_FOUND` 404，
  避免成员枚举；
- M4/M5 占位字段固定为 `{ available: false, module: "M4" | "M5" }`，不携带任何业务数字。

局部降级与日期口径：

- `GET /member/dashboard` 额外返回 `degraded: MemberDashboardDegraded[]`，列出加载失败的区块
  （`repairSummary` / `workQueue` / `recentRepairs` / `recentActivity`）。四路查询相互独立，
  任一路失败**不得**让其余区块一并报错，客户端只对失败区块渲染错误态；全部成功时该字段为空数组。
  失败区块回退为空数组 / 空队列，`repairSummary` 回退时所有 `MetricValue` 标为 `UNCONFIGURED`，
  **绝不**伪造 `0`。
- 「本月 / 本学期」是日期相对口径。`GET /member/profile`、
  `GET /members/:memberProfileId/profile` 与工作台共用同一套
  `resolveMemberRanges(now)`，三个入口的同名指标必须相等。学期未配置时
  `termApprovedCount` 返回 `{ value: null, status: "UNCONFIGURED" }`。
