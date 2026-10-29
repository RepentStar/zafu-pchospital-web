export type PreviewScene = "members" | "repairs" | "join" | "audit";
export type PreviewPlan = "A" | "B" | "C" | "D" | "old";

export const previewCopy = {
  title: "后台筛选 · 低保真预览",
  note: "仅开发环境 · 全部为虚构数据 · 请求在本地模拟",
  planSwitch: "切换预览方案",
  planHint: "A/B/C 以成员列表对照，D 自动切换到维修审核",
  scenario: "状态样例",
  samples: ["默认", "多个条件", "编辑未应用", "长标签", "零结果", "刷新中", "失败保留旧数据"],
  plans: {
    A: {
      title: "短搜索＋浮面板",
      benefit: "搜索随手可用，常用筛选按需打开",
      cost: "快捷筛选与高级条件分开编辑",
    },
    B: {
      title: "统一入口＋抽屉",
      benefit: "首屏最简洁，所有条件集中编辑",
      cost: "搜索多一次打开，抽屉遮住部分列表",
    },
    C: {
      title: "折叠查询带",
      benefit: "完整表单原位展开，改造成本较低",
      cost: "展开后列表下移；收起保留草稿",
    },
    D: {
      title: "状态页签",
      benefit: "先切换审核队列，再搜索和细筛",
      cost: "仅为维修预览；页签不展示估算数量",
    },
    old: {
      title: "现有查询区",
      benefit: "复用当前 AdminTableQuery，作为布局基线",
      cost: "仅供只读布局对比；所有快捷字段常驻，首屏占用较多",
    },
  },
  guide: "试一试：搜索“林” → 添加两个筛选 → 取消一次编辑 → 移除一项 → 清除筛选 / 重置查询",
};

export const previewScenes = {
  members: {
    title: "成员管理",
    unit: "名",
    search: "搜索成员",
    plans: ["A", "B", "C", "old"],
    fields: [
      { key: "status", label: "状态", values: ["启用", "停用"] },
      { key: "role", label: "角色", values: ["维修员", "管理员", "普通成员"] },
    ],
    columns: ["姓名", "班级", "角色", "状态", "加入时间"],
  },
  repairs: {
    title: "维修审核",
    unit: "条",
    search: "搜索维修记录",
    plans: ["A", "D", "old"],
    fields: [
      { key: "status", label: "状态", values: ["待审核", "已通过", "已退回", "草稿"] },
      { key: "category", label: "分类", values: ["软件问题", "硬件问题", "清灰维护"] },
    ],
    columns: ["设备 / 故障", "提交人", "分类", "状态", "维修日期"],
  },
  join: {
    title: "招募申请",
    unit: "份",
    search: "搜索申请人",
    plans: ["B"],
    fields: [
      { key: "batch", label: "招募批次", values: ["2026 秋季", "2026 春季"] },
      { key: "status", label: "状态", values: ["待面试", "面试通过", "未通过"] },
      { key: "provision", label: "账号开通", values: ["未开通", "已开通"] },
    ],
    columns: ["申请人", "招募批次", "账号开通", "状态", "申请时间"],
  },
  audit: {
    title: "审计日志",
    unit: "条",
    search: "",
    plans: ["B"],
    fields: [
      { key: "action", label: "操作", values: ["成员更新", "维修审核", "账号登录"] },
      { key: "result", label: "结果", values: ["成功", "失败"] },
    ],
    columns: ["操作人", "操作", "目标", "结果", "时间"],
  },
} satisfies Record<
  PreviewScene,
  {
    title: string;
    unit: string;
    search: string;
    plans: string[];
    fields: { key: string; label: string; values: string[] }[];
    columns: string[];
  }
>;

export const previewNames = [
  "林同学",
  "陈同学",
  "周同学",
  "林小雨",
  "王同学",
  "李同学",
  "吴同学",
  "郑同学",
  "许同学",
  "沈同学",
  "陆同学",
  "赵同学",
];
export const longPreviewValue =
  "林同学与维修志愿服务小组的超长查询内容，用于检查窄屏标签截断与完整值查看";
