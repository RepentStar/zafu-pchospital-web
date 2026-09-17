/** Phase 2 public contract constants. Database values and API inputs must use these constants. */
export const UserStatus = ["ACTIVE", "DISABLED"] as const;
export const RoleCode = ["MEMBER", "ADMIN"] as const;
export const MemberStatus = ["ACTIVE", "REVOKED"] as const;
export const IdentityType = ["PHONE", "QQ", "QQ_OAUTH", "WECHAT_OAUTH"] as const;
export const JoinApplicationStatus = [
  "SUBMITTED",
  "INTERVIEW_PENDING",
  "INTERVIEW_PASSED",
  "INTERVIEW_REJECTED",
  "WITHDRAWN",
] as const;
export const InterviewResult = ["PASSED", "REJECTED"] as const;
export const ProvisionStatus = ["NOT_REQUIRED", "PENDING", "SUCCEEDED", "FAILED"] as const;
export const ProvisionSourceType = [
  "JOIN_APPLICATION",
  "INVITE_REDEMPTION",
  "ADMIN_CREATED",
] as const;
export const InviteCodeStoredStatus = ["ACTIVE", "REVOKED"] as const;
export const InviteCodeEffectiveStatus = [
  "NOT_STARTED",
  "ACTIVE",
  "REVOKED",
  "EXPIRED",
  "EXHAUSTED",
] as const;
export const AuditActorType = ["USER", "SYSTEM"] as const;
export const RepairStatus = ["DRAFT", "PENDING", "APPROVED", "REJECTED"] as const;
export const RepairResult = ["COMPLETED", "NOT_COMPLETED"] as const;
export const RepairReviewDecision = ["APPROVED", "REJECTED"] as const;
export const RepairTimelineEventType = [
  "CREATED",
  "UPDATED",
  "PHOTO_ADDED",
  "PHOTO_REMOVED",
  "SUBMITTED",
  "RESUBMITTED",
  "APPROVED",
  "REJECTED",
  "DELETED",
  "FLAG_CHANGED",
] as const;

type ValueOf<T extends readonly string[]> = T[number];

export type UserStatus = ValueOf<typeof UserStatus>;
export type RoleCode = ValueOf<typeof RoleCode>;
export type MemberStatus = ValueOf<typeof MemberStatus>;
export type IdentityType = ValueOf<typeof IdentityType>;
export type JoinApplicationStatus = ValueOf<typeof JoinApplicationStatus>;
export type InterviewResult = ValueOf<typeof InterviewResult>;
export type ProvisionStatus = ValueOf<typeof ProvisionStatus>;
export type ProvisionSourceType = ValueOf<typeof ProvisionSourceType>;
export type InviteCodeStoredStatus = ValueOf<typeof InviteCodeStoredStatus>;
export type InviteCodeEffectiveStatus = ValueOf<typeof InviteCodeEffectiveStatus>;
export type AuditActorType = ValueOf<typeof AuditActorType>;
export type RepairStatus = ValueOf<typeof RepairStatus>;
export type RepairResult = ValueOf<typeof RepairResult>;
export type RepairReviewDecision = ValueOf<typeof RepairReviewDecision>;
export type RepairTimelineEventType = ValueOf<typeof RepairTimelineEventType>;

export const Permission = [
  "join:submit",
  "join:read",
  "join:review",
  "member:provision",
  "member:manage",
  "invite:create",
  "invite:read",
  "invite:revoke",
  "invite:redeem",
  "audit:read",
  "repair:create",
  "repair:read",
  "repair:update",
  "repair:submit",
  "repair:review",
  "repair:delete",
  "repair:flag",
  "repair:category:manage",
  "member.profile.read_self",
  "member.profile.update_self",
  "member.profile.read_internal",
  "member.skill.assign_self",
] as const;
export type Permission = ValueOf<typeof Permission>;

export type RequestContext = {
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
};

export type PublicRequestContext = RequestContext;

export type AuthorizedActor = RequestContext & {
  actorType: AuditActorType;
  userId?: string;
  userStatus: UserStatus;
  permissions: readonly Permission[];
  mustChangePassword?: boolean;
};

export type LoginInput = { qq: string; password: string };
export type SessionPrincipal = {
  userId: string;
  displayName: string | null;
  roles: RoleCode[];
  permissions: Permission[];
  memberProfileId: string | null;
  memberStatus: MemberStatus | null;
  mustChangePassword: boolean;
};
export type AuthSessionResult = SessionPrincipal & {
  sessionId: string;
  token: string;
  expiresAt: string;
};
export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirmation: string;
};

export type PaginationInput = { page: number; pageSize: number };
export type PaginationMeta = PaginationInput & {
  total: number;
  totalPages: number;
};

export type SubmitJoinApplicationInput = {
  recruitmentCycle: string;
  realName: string;
  qq: string;
  phone: string;
  selfIntroduction?: string;
  preferredDirection?: string;
  applicantRemark?: string;
  privacyConsent: boolean;
};

export type JoinReceipt = {
  id: string;
  ticketNo: string;
  status: JoinApplicationStatus;
  submittedAt: string;
  duplicate: boolean;
};

export type ReviewJoinApplicationInput = {
  applicationId: string;
  result: InterviewResult;
  interviewedAt: string;
  internalNote?: string;
  idempotencyKey: string;
};

export type JoinApplicationView = {
  id: string;
  status: JoinApplicationStatus;
  provisionStatus: ProvisionStatus;
  lastReviewedAt: string | null;
  initializationSecret?: string;
};

export type JoinApplicationListInput = PaginationInput & {
  status?: JoinApplicationStatus;
  provisionStatus?: ProvisionStatus;
  submittedFrom?: string;
  submittedTo?: string;
  query?: string;
};

export type JoinApplicationSummary = JoinApplicationView & {
  ticketNo: string;
  recruitmentCycle: string;
  realName: string;
  qqMasked: string;
  phoneMasked: string;
  submittedAt: string;
};

export type JoinApplicationDetail = JoinApplicationView & {
  ticketNo: string;
  recruitmentCycle: string;
  realName: string;
  qq: string;
  phone: string;
  selfIntroduction: string | null;
  preferredDirection: string | null;
  applicantRemark: string | null;
  submittedAt: string;
  reviews: Array<{
    id: string;
    result: string;
    interviewedAt: string;
    internalNote: string | null;
  }>;
};

export type CreateInviteCodeInput = {
  activeFrom?: string | null;
  expiresAt?: string | null;
  maxUses: number;
  boundQq?: string;
  boundPhone?: string;
};

export type UpdateInviteCodeInput = {
  activeFrom?: string | null;
  expiresAt?: string | null;
  maxUses?: number;
};

export type InviteCodeView = {
  id: string;
  displayPrefix: string;
  status: InviteCodeEffectiveStatus;
  activeFrom: string | null;
  expiresAt: string | null;
  maxUses: number;
  usedCount: number;
};

export type CreateInviteCodeResult = InviteCodeView & { plainCode: string };

export type RedeemInviteCodeInput = {
  code: string;
  idempotencyKey: string;
  realName: string;
  qq: string;
  phone: string;
  studentId?: string;
  className?: string;
  password: string;
};

export type ProvisionView = {
  id: string;
  status: ProvisionStatus;
  userId: string | null;
  memberProfileId: string | null;
  attemptCount: number;
  lastErrorCode: string | null;
};

export type ProvisionResult = ProvisionView & { initializationSecret?: string };

export type MemberRegistrationResult = {
  userId: string;
  memberProfileId: string;
  redemptionId: string;
  provisionId: string;
};

export type CreateMemberInput = {
  realName: string;
  qq: string;
  phone: string;
  studentId?: string;
  className?: string;
  nickname?: string;
  idempotencyKey: string;
};

export type MemberView = {
  id: string;
  userId: string;
  realName: string;
  nickname: string | null;
  studentId: string | null;
  className: string | null;
  status: MemberStatus;
};
export type MemberMutationResult = { member: MemberView; initializationSecret?: string };

export type RepairPhotoView = {
  id: string;
  contentUrl: string;
  originalName: string | null;
  mimeType: string;
  sizeBytes: number;
  sortOrder: number;
  createdAt: string;
};
export type RepairCategoryView = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};
export type RepairMemberOption = { id: string; name: string };
export type RepairTimelineView = {
  id: string;
  eventType: RepairTimelineEventType;
  summary: unknown;
  actorName: string | null;
  createdAt: string;
};
export type RepairReviewView = {
  id: string;
  decision: RepairReviewDecision;
  note: string | null;
  reviewerName: string | null;
  createdAt: string;
};
export type RepairView = {
  id: string;
  member: { id: string; name: string };
  repairDate: string | null;
  durationMinutes: number | null;
  category: RepairCategoryView | null;
  content: string | null;
  result: RepairResult | null;
  remark: string | null;
  status: RepairStatus;
  isDifficult: boolean;
  isTypical: boolean;
  version: number;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  photos: RepairPhotoView[];
};
export type RepairDetailView = RepairView & {
  reviews: RepairReviewView[];
  timeline: RepairTimelineView[];
  canEdit: boolean;
  canReview: boolean;
};
export type RepairDraftFields = {
  repairDate?: string | null;
  durationMinutes?: number | null;
  categoryId?: string | null;
  content?: string | null;
  result?: RepairResult | null;
  remark?: string | null;
};
export type CreateRepairDraftInput = RepairDraftFields & { idempotencyKey: string };
export type UpdateRepairInput = RepairDraftFields & { version: number };
export type SubmitRepairInput = { version: number; idempotencyKey: string };
export type ReviewRepairInput = {
  decision: RepairReviewDecision;
  note?: string;
  idempotencyKey: string;
};
export type RepairFlagsInput = { isDifficult: boolean; isTypical: boolean };
export type RepairListInput = PaginationInput & {
  memberId?: string;
  categoryId?: string;
  status?: RepairStatus;
  result?: RepairResult;
  repairDateFrom?: string;
  repairDateTo?: string;
  isDifficult?: boolean;
  isTypical?: boolean;
  query?: string;
};
export type RepairListResult = { items: RepairView[]; pagination: PaginationMeta };
export type CreateRepairCategoryInput = {
  code: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
};
export type UpdateRepairCategoryInput = {
  name?: string;
  description?: string | null;
  sortOrder?: number;
};

// ---------------------------------------------------------------------------
// M3 成员工作台与个人主页
// ---------------------------------------------------------------------------

/** 指标值。`UNCONFIGURED` 表示口径未配置（如学期区间缺失），此时 `value` 必须为 null，
 *  页面显示「待配置」，绝不回退为伪造的 0。 */
export type MetricStatus = "AVAILABLE" | "UNCONFIGURED";
export type MetricValue = {
  value: number | null;
  status: MetricStatus;
};

export const SkillStatus = ["ACTIVE", "INACTIVE"] as const;
export type SkillStatus = ValueOf<typeof SkillStatus>;

/** 技能标签展示视图。含 code 便于前端按稳定机器码分支，不依赖名称文案。 */
export type SkillView = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

/** 成员资料摘要：工作台欢迎区与个人主页共用的最小身份信息。
 *  不含 QQ、学号、班级、userId —— 那些只在受保护的单成员内部详情出现。 */
export type MemberProfileSummary = {
  memberProfileId: string;
  displayName: string;
  nickname: string | null;
  realName: string | null;
  avatarUrl: string | null;
  status: string;
  joinedAt: string;
  roles: RoleCode[];
  skills: SkillView[];
  version: number;
};

/** 自我可见的完整资料（`/member/profile`）。QQ 只在此处出现，且页面标注「内部可见」。 */
export type MemberSelfProfile = MemberProfileSummary & {
  qq: string | null;
  studentId: string | null;
  className: string | null;
  /** 性别等扩展字段留待 M6；此处置空表示不受 M3 管理。 */
  editableFields: readonly ["nickname", "skills"];
};

/** 他人内部主页视图（`/member/profile/[memberProfileId]`）。
 *  比 self 更窄：不含学号、班级、账号状态细节与管理字段。 */
export type MemberInternalProfile = MemberProfileSummary & {
  qq: string | null;
};

export type MemberRecentRepair = {
  id: string;
  repairDate: string | null;
  durationMinutes: number | null;
  categoryName: string | null;
  result: string | null;
  contentExcerpt: string;
  updatedAt: string;
};

/** 工作台「最近操作」条目。可包含未通过记录，因此字段与 `MemberRecentRepair` 区分，
 *  带显式 status，禁止冒充「已通过维修」。 */
export type MemberRecentActivity = {
  id: string;
  status: RepairStatus;
  repairDate: string | null;
  contentExcerpt: string;
  updatedAt: string;
};

export type MemberRepairSummary = {
  totalApprovedCount: MetricValue;
  termApprovedCount: MetricValue;
  monthApprovedCount: MetricValue;
  totalApprovedDurationMinutes: MetricValue;
  source: "M2_APPROVED_REPAIRS";
  generatedAt: string;
};

export type MemberWorkQueue = {
  draftCount: number;
  pendingCount: number;
  rejectedCount: number;
};

/** M4/M5 尚未接入的中性占位。**禁止**为其编造业务数字。 */
export type DeferredModule = {
  available: false;
  module: "M4" | "M5";
};

/**
 * 工作台中允许独立降级的区块。
 *
 * 四路维修查询相互独立，某一路失败不应导致整页报错（任务书 §12.1
 * 「指标加载用稳定骨架，失败时局部错误」）。失败区块在 `MemberDashboard`
 * 里回退为空数组 / 空队列，并在此字段中列名，供客户端只对该区块渲染错误态。
 */
export type MemberDashboardDegraded =
  | "repairSummary"
  | "workQueue"
  | "recentRepairs"
  | "recentActivity";

export type MemberDashboard = {
  profile: MemberProfileSummary;
  repairSummary: MemberRepairSummary;
  workQueue: MemberWorkQueue;
  recentRepairs: MemberRecentRepair[];
  recentActivity: MemberRecentActivity[];
  /** 加载失败的区块清单；空数组表示全部成功。 */
  degraded: MemberDashboardDegraded[];
  notifications: DeferredModule;
  favorites: DeferredModule;
  ranking: DeferredModule;
};

/** 个人主页（自己）聚合视图：资料 + 技能 + 摘要 + 最近已通过记录。 */
export type MemberSelfProfileView = {
  profile: MemberSelfProfile;
  repairSummary: MemberRepairSummary;
  recentRepairs: MemberRecentRepair[];
};

/** 他人内部主页聚合视图。 */
export type MemberInternalProfileView = {
  profile: MemberInternalProfile;
  repairSummary: MemberRepairSummary;
  recentRepairs: MemberRecentRepair[];
};

export type UpdateMemberProfileInput = {
  nickname?: string | null;
  version: number;
};

export type UpdateMemberProfileResult = {
  profile: MemberSelfProfile;
  version: number;
};

export type UpdateMemberSkillsInput = {
  skillIds: string[];
  profileVersion: number;
};

export type UpdateMemberSkillsResult = {
  skills: SkillView[];
  version: number;
};

export const MEMBER_SKILL_LIMIT = 12;
export const MEMBER_NICKNAME_MAX_LENGTH = 64;
export const MEMBER_RECENT_REPAIR_LIMIT = 5;

export interface MemberProfileServiceContract {
  getSelf(actor: AuthorizedActor): Promise<MemberSelfProfileView>;
  getInternal(memberProfileId: string, actor: AuthorizedActor): Promise<MemberInternalProfileView>;
  updateProfile(
    input: UpdateMemberProfileInput,
    actor: AuthorizedActor,
  ): Promise<UpdateMemberProfileResult>;
  updateSkills(
    input: UpdateMemberSkillsInput,
    actor: AuthorizedActor,
  ): Promise<UpdateMemberSkillsResult>;
}

export interface SkillQueryServiceContract {
  listActive(): Promise<SkillView[]>;
}

export interface MemberDashboardServiceContract {
  getDashboard(actor: AuthorizedActor): Promise<MemberDashboard>;
}

export interface JoinApplicationServiceContract {
  list(
    input: JoinApplicationListInput,
    actor: AuthorizedActor,
  ): Promise<{ items: JoinApplicationSummary[]; pagination: PaginationMeta }>;
  get(applicationId: string, actor: AuthorizedActor): Promise<JoinApplicationDetail>;
  submit(input: SubmitJoinApplicationInput, context: PublicRequestContext): Promise<JoinReceipt>;
  review(input: ReviewJoinApplicationInput, actor: AuthorizedActor): Promise<JoinApplicationView>;
  retryProvision(applicationId: string, actor: AuthorizedActor): Promise<ProvisionView>;
  provision(applicationId: string, actor: AuthorizedActor): Promise<ProvisionView>;
}

export interface InviteCodeServiceContract {
  create(input: CreateInviteCodeInput, actor: AuthorizedActor): Promise<CreateInviteCodeResult>;
  update(
    inviteCodeId: string,
    input: UpdateInviteCodeInput,
    actor: AuthorizedActor,
  ): Promise<InviteCodeView>;
  revoke(inviteCodeId: string, actor: AuthorizedActor): Promise<InviteCodeView>;
  redeem(
    input: RedeemInviteCodeInput,
    context: PublicRequestContext,
  ): Promise<MemberRegistrationResult>;
}

export interface AccountProvisionServiceContract {
  provisionFromApplication(applicationId: string, idempotencyKey: string): Promise<ProvisionResult>;
  provisionFromInvite(redemptionId: string, idempotencyKey: string): Promise<ProvisionResult>;
}

export interface RepairServiceContract {
  createDraft(input: CreateRepairDraftInput, actor: AuthorizedActor): Promise<RepairView>;
  update(recordId: string, input: UpdateRepairInput, actor: AuthorizedActor): Promise<RepairView>;
  submit(recordId: string, input: SubmitRepairInput, actor: AuthorizedActor): Promise<RepairView>;
  softDelete(recordId: string, reason: string, actor: AuthorizedActor): Promise<void>;
}
export interface RepairReviewServiceContract {
  review(recordId: string, input: ReviewRepairInput, actor: AuthorizedActor): Promise<RepairView>;
}
export interface RepairQueryServiceContract {
  list(input: RepairListInput, actor: AuthorizedActor): Promise<RepairListResult>;
  getById(recordId: string, actor: AuthorizedActor): Promise<RepairDetailView>;
}
