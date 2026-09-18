/**
 * M3 成员工作台与个人主页文案
 *
 * 规则：
 * - 页面与组件不得硬编码展示文案，一律从这里取；
 * - 不得编造事实：不确定的信息标注「待补充」，未接入的模块明确说明「尚未接入」；
 * - 时长底层始终是整数分钟，展示时统一用下面的格式化函数。
 */

export const memberCopy = {
  common: {
    /** 无昵称也无实名时的兜底展示名 */
    fallbackName: "成员",
    /** 未配置学期区间时的展示文案（**不是** "0 次"） */
    unconfigured: "待配置",
    unconfiguredTerm: "学期范围待配置",
    loading: "正在加载…",
    loadError: "加载失败，请稍后重试。",
    /** 局部区块加载失败：与整页 loadError 区分，避免用户误以为整页不可用 */
    sectionLoadError: "这部分内容暂时无法加载，其余内容不受影响。",
    reload: "重新加载",
    saving: "保存中…",
    save: "保存",
    cancel: "取消",
    edit: "编辑",
    /** 当前成员自己的角色标签 */
    roleLabels: {
      MEMBER: "成员",
      ADMIN: "管理员",
    } as Record<string, string>,
    internalOnly: "内部可见",
    unsupported: "该功能尚未接入",
  },

  dashboard: {
    title: "成员工作台",
    label: "Member Workspace",
    lead: "查看个人维修概览、处理待办，并进入维修记录与个人主页。",
    welcome: "欢迎回来",
    joinedAtLabel: "加入时间",
    skillsLabel: "技能标签",
    noSkills: "尚未选择技能标签",
    settingsAction: "编辑个人资料",

    metricsTitle: "维修概览",
    metricsTag: "Repair Metrics",
    metricTotal: "累计已通过",
    metricTerm: "本学期已通过",
    metricMonth: "本月已通过",
    metricDuration: "累计维修时长",
    unitCount: "次",
    /** 统计口径说明：让「已通过」的口径对用户可见 */
    metricsFootnote: "仅统计审核已通过的维修记录。",

    queueTitle: "待处理维修",
    queueTag: "Work Queue",
    queueDraft: "草稿",
    queuePending: "待审核",
    queueRejected: "已退回",
    queueEmpty: "当前没有待处理的维修记录。",

    quickTitle: "快捷操作",
    quickTag: "Shortcuts",
    quickNew: "新增维修记录",
    quickAll: "查看全部记录",
    quickProfile: "编辑个人资料",

    recentTitle: "最近已通过维修",
    recentTag: "Recent Approved",
    recentEmpty: "暂时还没有已通过的维修记录。",
    recentMore: "查看全部记录",

    /** 后续模块接入位：中性说明，不出现虚假红点或数字 */
    upcomingTitle: "后续模块",
    upcomingTag: "Upcoming",
    upcomingNotifications: "消息通知",
    upcomingFavorites: "收藏",
    upcomingRanking: "维修排行",
    upcomingNote: "以上能力将在后续模块开放，当前不提供任何数据。",
  },

  profile: {
    title: "个人资料",
    label: "Member Profile",
    lead: "查看与维护自己的成员资料、技能标签与维修概览。",
    identityTitle: "成员身份",
    identityTag: "Identity",
    skillsTitle: "技能标签",
    skillsTag: "Skills",
    skillsLead: "最多选择 {limit} 项。取消选择不会删除历史记录，重新选择即可恢复。",
    skillsEmpty: "尚未选择任何技能标签。",
    skillsUnavailable: "技能列表加载失败。",
    skillsLimitReached: "最多只能选择 {limit} 项技能。",
    skillInactiveSelected: "已停用，可取消",
    metricsTitle: "维修概览",
    metricsTag: "Repair Metrics",
    recentTitle: "最近已通过维修",
    recentTag: "Recent Approved",

    /** 只读字段：明确标注不可自助修改，且不渲染成输入框 */
    readonlyNote: "以下信息由管理员维护，暂不支持自助修改。",
    fieldRealName: "实名",
    fieldStudentId: "学号",
    fieldClassName: "班级",
    fieldQq: "QQ",
    fieldJoinedAt: "加入时间",
    fieldRoles: "角色",
    fieldStatus: "成员状态",
    notProvided: "未填写",

    nicknameLabel: "昵称",
    nicknameHint: "留空则展示实名。最多 {max} 个字符，不支持换行与控制字符。",
    nicknamePlaceholder: "例如：小林",

    /** 乐观锁冲突与校验错误 */
    conflict: "资料已在其他位置被修改，请刷新后重试。",
    saveFailed: "保存失败，请稍后重试。",
    invalidNickname: "昵称格式不正确。",
    saved: "已保存。",
    skillsSaved: "技能标签已更新。",
  },

  internal: {
    title: "成员主页",
    label: "Member Profile",
    lead: "查看该成员的公开资料、技能标签与已通过维修概览。",
    identityTitle: "成员身份",
    identityTag: "Identity",
    skillsTitle: "技能标签",
    skillsTag: "Skills",
    noSkills: "该成员尚未选择技能标签。",
    metricsTitle: "维修概览",
    metricsTag: "Repair Metrics",
    recentTitle: "最近已通过维修",
    recentTag: "Recent Approved",
    recentEmpty: "该成员暂时还没有已通过的维修记录。",
    selfAction: "这是你自己的主页，前往个人资料编辑",
    /** 明确说明他人视图的可见性边界 */
    visibilityNote: "仅展示已通过的维修记录；草稿、待审核与已退回记录不可见。",
  },
} as const;

/** 把整数分钟格式化为「x 小时 y 分钟」。底层仍存整数分钟，这里只做展示。 */
export function formatDurationMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return "—";
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest} 分钟`;
  if (rest === 0) return `${hours} 小时`;
  return `${hours} 小时 ${rest} 分钟`;
}

/** 把「次」类指标格式化为带单位的字符串；`null` 显示为传入的占位文案。 */
export function formatCount(value: number | null, unconfiguredLabel: string): string {
  if (value === null) return unconfiguredLabel;
  return `${value} 次`;
}

/** 把 ISO 时间戳格式化为 `YYYY-MM-DD`（Asia/Shanghai），失败时返回占位。 */
export function formatShanghaiDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "—";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
