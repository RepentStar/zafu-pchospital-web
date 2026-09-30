import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyHistoryRows,
  historyRowKey,
  mapHistoryHeader,
  normalizeHistoryDate,
  parseDelimitedRows,
  parseHistoryDuration,
  type HistoryInputRow,
} from "../../src/features/repairs/repair-history-import";

const members = [
  { profileId: "p-zhang", realName: "张三" },
  { profileId: "p-li1", realName: "李四" },
  { profileId: "p-li2", realName: "李四" },
];
const categories = [
  { id: "c-soft", name: "软件系统", isActive: true },
  { id: "c-hw", name: "硬件维护", isActive: false },
];
const today = "2026-09-28";

function row(lineNo: number, values: Partial<HistoryInputRow["raw"]>): HistoryInputRow {
  return {
    lineNo,
    raw: {
      name: "张三",
      repairDate: "2026-09-01",
      durationMinutes: "90",
      categoryName: "软件系统",
      content: "重装系统并清理灰尘",
      ...values,
    },
  };
}

test("表头按别名识别，缺列时报出缺失项", () => {
  const { fields, missing } = mapHistoryHeader([
    "序号",
    "姓名",
    "维修日期",
    "时长(分钟)",
    "故障分类",
    "维修内容",
    "备注",
  ]);
  assert.deepEqual(missing, []);
  assert.equal(fields.name, 1);
  assert.equal(fields.repairDate, 2);
  assert.equal(fields.durationMinutes, 3);
  assert.equal(fields.categoryName, 4);
  assert.equal(fields.content, 5);
  assert.equal(fields.remark, 6);
  const short = mapHistoryHeader(["姓名", "日期"]);
  assert.deepEqual(short.missing, ["content"]);
});

test("真实收集表表头（带（必填）后缀）可识别，无时长/分类列不算缺列", () => {
  const repair = mapHistoryHeader([
    "提交时间（自动）",
    "机主姓名（必填）",
    "机主联系电话（必填）",
    "机主班级（必填）",
    "维修人员姓名（必填）",
    "故障（必填）",
    "维修时长（必填）",
    "请机主加入交流群",
    "提交者（自动）",
  ]);
  assert.deepEqual(repair.missing, []);
  assert.equal(repair.fields.repairDate, 0);
  assert.equal(repair.fields.name, 4);
  assert.equal(repair.fields.content, 5);
  assert.equal(repair.fields.durationMinutes, 6);
  assert.equal(repair.fields.categoryName, undefined);

  const clinic = mapHistoryHeader([
    "提交时间（自动）",
    "公益电脑维修服务免责声明书（必填）",
    "官方群",
    "机主姓名（必填）",
    "机主联系电话（必填）",
    "机主班级（必填）",
    "维修人员（必填）",
    "故障（必填）",
    "机型 颜色（必填）",
    "提交者（自动）",
  ]);
  assert.deepEqual(clinic.missing, []);
  assert.equal(clinic.fields.name, 6);
  assert.equal(clinic.fields.durationMinutes, undefined);
});

test("CSV 解析支持引号、逗号、CRLF 与 BOM", () => {
  const rows = parseDelimitedRows('\ufeff姓名,内容\r\n张三,"换硅脂,清灰"\r\n李四,装系统\r\n');
  assert.deepEqual(rows, [
    ["姓名", "内容"],
    ["张三", "换硅脂,清灰"],
    ["李四", "装系统"],
  ]);
});

test("按姓名匹配成员：唯一命中通过，重名与查无整行拒收", () => {
  const plan = classifyHistoryRows(
    [row(2, {}), row(3, { name: "李四" }), row(4, { name: "王五" }), row(5, { name: "  " })],
    { members, categories, today },
  );
  assert.equal(plan.valid.length, 1);
  assert.equal(plan.valid[0].memberProfileId, "p-zhang");
  assert.deepEqual(
    plan.rejected.map((r) => [
      r.lineNo,
      r.reason.startsWith("姓名重名") ||
        r.reason.startsWith("未找到在册成员") ||
        r.reason === "缺少姓名",
    ]),
    [
      [3, true],
      [4, true],
      [5, true],
    ],
  );
});

test("日期、时长、分类与正文逐行校验", () => {
  const plan = classifyHistoryRows(
    [
      row(2, { repairDate: "2026/9/5" }),
      row(3, { repairDate: "2019-12-31" }),
      row(4, { repairDate: "2026-09-29" }),
      row(5, { durationMinutes: "0" }),
      row(6, { durationMinutes: "10081" }),
      row(7, { durationMinutes: "1.5" }),
      row(8, { durationMinutes: "45分钟" }),
      row(9, { categoryName: "硬件维护" }),
      row(10, { categoryName: "不存在" }),
      row(11, { content: "  " }),
    ],
    { members, categories, today },
  );
  // 斜杠日期规范化、分钟后缀容忍、停用分类拒收。
  // 纯数字 1.5（≤12）按社团口径解释为 1.5 小时 = 90 分钟。
  assert.deepEqual(
    plan.valid.map((v) => [v.lineNo, v.repairDate, v.durationMinutes]),
    [
      [2, "2026-09-05", 90],
      [7, "2026-09-01", 90],
      [8, "2026-09-01", 45],
    ],
  );
  assert.deepEqual(
    plan.rejected.map((r) => r.lineNo),
    [3, 4, 5, 6, 9, 10, 11],
  );
});

test("时长文本按社团口径解析：分钟/小时/半小时/两小时/复合/纯数字分界", () => {
  const cases: [string, number | null][] = [
    ["30分钟", 30],
    ["30min", 30],
    ["15mins", 15],
    ["30分", 30],
    ["40min左右", 40],
    ["1h", 60],
    ["1小时", 60],
    ["1个小时", 60],
    ["0.5h", 30],
    ["半小时", 30],
    ["两个小时", 120],
    ["1小时05分", 65],
    ["1小时10分", 70],
    ["60", 60], // 纯数字 >12 按分钟
    ["20", 20],
    ["1", 60], // 纯数字 ≤12 按小时
    ["12", 720],
    ["13", 13],
    ["一次", null],
    ["1次", null],
    ["十五min", null],
    ["", null],
  ];
  for (const [text, expected] of cases) assert.equal(parseHistoryDuration(text), expected, text);
});

test("日期允许带时间尾巴（提交时间列）", () => {
  assert.equal(normalizeHistoryDate("2024-10-08 19:18:01"), "2024-10-08");
  assert.equal(normalizeHistoryDate("2024/9/5 8:00"), "2024-09-05");
  assert.equal(normalizeHistoryDate("2024-10-08 19:18"), "2024-10-08");
  assert.equal(normalizeHistoryDate("2024-10-08 abc"), null);
});

test("一格多名维修人员归属第一人并留痕；班级前缀姓名剥离匹配", () => {
  const plan = classifyHistoryRows(
    [
      row(2, { name: "张三，莫依诚，王五" }),
      row(3, { name: "计算机233张三" }),
      row(4, { name: "张三 郭文辉" }),
    ],
    { members, categories, today },
  );
  assert.equal(plan.valid.length, 3);
  assert.deepEqual(
    plan.valid.map((v) => v.memberProfileId),
    ["p-zhang", "p-zhang", "p-zhang"],
  );
  assert.match(plan.valid[0]!.remark ?? "", /维修人员一格多人，归属第一人/);
  assert.match(plan.valid[0]!.remark ?? "", /原格：张三，莫依诚，王五/);
  assert.match(plan.valid[1]!.remark ?? "", /班级前缀剥离匹配：计算机233张三 → 张三/);
  assert.match(plan.valid[2]!.remark ?? "", /一格多人/);
});

test("缺时长列/缺分类列按社团口径补录，未给口径则逐行拒收", () => {
  const withOptions = classifyHistoryRows(
    [row(2, { durationMinutes: undefined, categoryName: undefined })],
    {
      members,
      categories,
      today,
      options: { defaultDurationMinutes: 30, fallbackCategoryId: "c-fallback" },
    },
  );
  assert.equal(withOptions.valid.length, 1);
  assert.equal(withOptions.valid[0].durationMinutes, 30);
  assert.equal(withOptions.valid[0].categoryId, "c-fallback");
  assert.match(withOptions.valid[0].remark ?? "", /时长缺失，按默认 30 分钟补录/);
  assert.match(withOptions.valid[0].remark ?? "", /故障分类挂兜底分类/);

  const withoutOptions = classifyHistoryRows(
    [row(2, { durationMinutes: undefined, categoryName: undefined })],
    { members, categories, today },
  );
  assert.equal(withoutOptions.valid.length, 0);
  assert.match(withoutOptions.rejected[0]?.reason ?? "", /缺少维修时长/);
});

test("结果列只接受已完成/未完成，缺省为已完成", () => {
  const plan = classifyHistoryRows(
    [row(2, { result: "未完成" }), row(3, { result: "已完成" }), row(4, { result: "大概好了" })],
    { members, categories, today },
  );
  assert.equal(plan.valid[0].result, "NOT_COMPLETED");
  assert.equal(plan.valid[1].result, "COMPLETED");
  assert.equal(plan.rejected[0]?.lineNo, 4);
});

test("storePendingUnmatched：姓名未在册的有效行进暂存，重名与字段无效仍拒收", () => {
  const plan = classifyHistoryRows(
    [
      row(2, { name: "王五" }),
      row(3, { name: "计算机233赵六" }),
      row(4, { name: "李四" }),
      row(5, { name: "钱七", repairDate: "2026/13/40" }),
      row(6, { name: "孙八", durationMinutes: "一次" }),
    ],
    {
      members,
      categories,
      today,
      options: {
        defaultDurationMinutes: 30,
        fallbackCategoryId: "c-fallback",
        storePendingUnmatched: true,
      },
    },
  );
  assert.equal(plan.valid.length, 0);
  assert.deepEqual(
    plan.pending.map((p) => [p.lineNo, p.realName, p.categoryId, p.durationMinutes]),
    [
      [2, "王五", "c-soft", 90],
      [3, "赵六", "c-soft", 90],
    ],
  );
  assert.match(
    plan.pending[1]!.remark ?? "",
    /班级前缀剥离（该成员尚未在册，暂存待认领）：计算机233赵六 → 赵六/,
  );
  assert.deepEqual(
    plan.rejected.map((r) => r.lineNo),
    [4, 5, 6],
  );
});

test("暂存行与日后 CLI 直接导入算出同一指纹：先导入后注册也只落一条", () => {
  const options = {
    defaultDurationMinutes: 30,
    fallbackCategoryId: "c-fallback",
    storePendingUnmatched: true,
  };
  const beforeRegister = classifyHistoryRows([row(2, { name: "王五" })], {
    members,
    categories,
    today,
    options,
  });
  const afterRegister = classifyHistoryRows([row(2, { name: "王五" })], {
    members: [...members, { profileId: "p-wang", realName: "王五" }],
    categories,
    today,
    options,
  });
  assert.equal(beforeRegister.pending.length, 1);
  assert.equal(afterRegister.valid.length, 1);
  assert.equal(afterRegister.valid[0]!.idempotencyKey, beforeRegister.pending[0]!.fingerprint);
  assert.equal(afterRegister.valid[0]!.memberProfileId, "p-wang");
});

test("行指纹稳定且随字段变化", () => {
  const base = {
    realName: "王五",
    categoryId: "c",
    repairDate: "2026-09-01",
    durationMinutes: 90,
    content: "x",
    result: "COMPLETED",
  };
  assert.equal(historyRowKey(base), historyRowKey({ ...base }));
  assert.notEqual(historyRowKey(base), historyRowKey({ ...base, durationMinutes: 91 }));
  assert.notEqual(historyRowKey(base), historyRowKey({ ...base, realName: "张三" }));
  assert.ok(historyRowKey(base).startsWith("history-import:"));
  assert.ok(historyRowKey(base).length <= 128);
});

test("同组第 2..N 行追加出现序号：一天多台机器做同样的活不再被吞", () => {
  const options = {
    defaultDurationMinutes: 30,
    fallbackCategoryId: "c-fallback",
    storePendingUnmatched: true,
  };
  const plan = classifyHistoryRows(
    [
      // 前两行业务字段完全相同（同一人同一天两台机器，都写「清灰」）→ 第 2 行 #2
      row(2, {}),
      row(3, {}),
      // 时长不同 → 独立键，不受序号影响
      row(4, { durationMinutes: "60" }),
      // 未在册的两行同理：第 2 行按 #2 暂存，注册后才补得回来
      row(5, { name: "王五" }),
      row(6, { name: "王五" }),
    ],
    { members, categories, today, options },
  );
  assert.equal(plan.valid.length, 3);
  const keys = plan.valid.map((entry) => entry.idempotencyKey);
  assert.equal(keys[1], `${keys[0]}#2`, "同组第 2 行应追加 #2");
  assert.notEqual(keys[2], keys[0], "不同组不应追加序号");
  assert.equal(new Set(keys).size, 3);
  assert.equal(plan.pending.length, 2);
  assert.equal(plan.pending[1]!.fingerprint, `${plan.pending[0]!.fingerprint}#2`);
});
