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
