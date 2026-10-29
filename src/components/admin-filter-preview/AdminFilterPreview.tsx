"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { AdminModal } from "@/components/admin/AdminModal";
import { AdminTableQuery } from "@/components/admin/AdminTableQuery";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import {
  longPreviewValue,
  previewCopy as copy,
  previewNames,
  previewScenes,
  type PreviewPlan,
  type PreviewScene,
} from "@/config/admin-filter-preview";
import { tableQueryOptions } from "@/config/table-queries";

import styles from "./preview.module.css";

type Query = {
  query: string;
  fixed: Record<string, string>;
  advanced: string;
  sort: string;
  secondary: boolean;
  group: boolean;
};
const emptyQuery = (): Query => ({
  query: "",
  fixed: {},
  advanced: "",
  sort: "date",
  secondary: false,
  group: false,
});
type Row = { id: number; cells: string[]; fields: Record<string, string>; date: string };

function makeRows(scene: PreviewScene): Row[] {
  const fields = previewScenes[scene].fields;
  return previewNames.map((name, i) => {
    const fixed = Object.fromEntries(
      fields.map((field, j) => [
        field.key,
        field.values[Math.floor(i / (j + 1)) % field.values.length],
      ]),
    );
    const date = `2026-10-${String(28 - i).padStart(2, "0")}`;
    const cells =
      scene === "members"
        ? [name, `计算机 ${i % 2 ? "252" : "251"}`, fixed.role, fixed.status, date]
        : scene === "repairs"
          ? [`笔记本 ${i + 1} / 无法启动`, name, fixed.category, fixed.status, date]
          : scene === "join"
            ? [name, fixed.batch, fixed.provision, fixed.status, date]
            : [name, fixed.action, `示例记录 ${i + 1}`, fixed.result, date];
    return { id: i + 1, cells, fields: fixed, date };
  });
}

function resultRows(rows: Row[], q: Query) {
  return rows
    .filter(
      (row) =>
        (!q.query || row.cells.join(" ").includes(q.query)) &&
        Object.entries(q.fixed).every(([key, value]) => !value || row.fields[key] === value) &&
        (!q.advanced || row.date >= q.advanced),
    )
    .sort((a, b) =>
      q.sort === "name"
        ? a.cells[0].localeCompare(b.cells[0], "zh-CN") ||
          (q.secondary ? b.date.localeCompare(a.date) : 0)
        : b.date.localeCompare(a.date),
    );
}

// 保持生产弹层 API 不变，仅在预览中补充键盘焦点圈与背景 inert。
function PreviewModal({
  title,
  kind,
  anchor,
  onClose,
  children,
}: {
  title: string;
  kind: "popover" | "drawer" | "advanced";
  anchor: DOMRect | null;
  onClose: () => void;
  children: ReactNode;
}) {
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dialog = body.current?.closest<HTMLElement>('[role="dialog"]');
    if (!dialog) return;
    const main = document.getElementById("main");
    if (main) main.inert = true;
    if (kind === "popover" && anchor && window.innerWidth >= 760) {
      dialog.style.setProperty(
        "--preview-left",
        `${Math.max(12, Math.min(anchor.left, window.innerWidth - 396))}px`,
      );
      dialog.style.setProperty(
        "--preview-top",
        `${Math.min(anchor.bottom + 8, window.innerHeight - 390)}px`,
      );
    }
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = [
        ...dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input, select, summary, [tabindex="0"]',
        ),
      ].filter((el) => el.getClientRects().length);
      const first = items[0],
        last = items.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === dialog)
      ) {
        event.preventDefault();
        first?.focus();
      }
    };
    dialog.addEventListener("keydown", trap);
    return () => {
      if (main) main.inert = false;
      dialog.removeEventListener("keydown", trap);
    };
  }, [anchor, kind]);
  return (
    <AdminModal title={title} onClose={onClose}>
      <div ref={body} className={`${styles.editor} ${styles[kind]}`}>
        {children}
      </div>
    </AdminModal>
  );
}

export function AdminFilterPreview() {
  const [scene, setScene] = useState<PreviewScene>("members");
  const [plan, setPlan] = useState<PreviewPlan>("A");
  const [query, setQuery] = useState<Query>(emptyQuery);
  const [draft, setDraft] = useState<Query>(emptyQuery);
  const [search, setSearch] = useState("");
  const [overlay, setOverlay] = useState<"quick" | "advanced" | "value" | null>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [fullTags, setFullTags] = useState(false);
  const [fullValue, setFullValue] = useState("");
  const [result, setResult] = useState<Query>(emptyQuery);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(false);
  const [failNext, setFailNext] = useState(false);
  const [sample, setSample] = useState("默认");
  const [selected, setSelected] = useState<number[]>([]);
  const [limit, setLimit] = useState(8);
  const [notice, setNotice] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inlineTrigger = useRef<HTMLButtonElement>(null);
  const spec = previewScenes[scene];
  const rows = makeRows(scene);
  const shown = resultRows(rows, result);
  const dirty = JSON.stringify(draft) !== JSON.stringify(query);
  const tags = [
    ...(query.query ? [{ key: "query", label: `搜索：${query.query}` }] : []),
    ...spec.fields
      .filter((f) => query.fixed[f.key])
      .map((f) => ({ key: f.key, label: `${f.label}：${query.fixed[f.key]}` })),
    ...(query.advanced ? [{ key: "advanced", label: `高级 · 日期不早于 ${query.advanced}` }] : []),
  ];
  const count = tags.length - (query.query ? 1 : 0);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function commit(next: Query, fail = failNext, delay = 650) {
    if (timer.current) clearTimeout(timer.current);
    setQuery(next);
    setDraft(next);
    setSearch(next.query);
    setSelected([]);
    setLimit(8);
    setBusy(true);
    setProblem(false);
    setFailNext(false);
    timer.current = setTimeout(() => {
      setBusy(false);
      if (fail) setProblem(true);
      else setResult(next);
    }, delay);
  }
  function resetScene(next: PreviewScene) {
    if (timer.current) clearTimeout(timer.current);
    setScene(next);
    setPlan(next === "join" || next === "audit" ? "B" : "A");
    setQuery(emptyQuery());
    setDraft(emptyQuery());
    setResult(emptyQuery());
    setSearch("");
    setOverlay(null);
    setExpanded(false);
    setSearchOpen(false);
    setBusy(false);
    setProblem(false);
    setSelected([]);
    setSample("默认");
    setLimit(8);
    setNotice("");
  }
  function openQuick(event?: React.MouseEvent<HTMLButtonElement>) {
    setDraft(query);
    setAnchor(event?.currentTarget.getBoundingClientRect() ?? null);
    setOverlay("quick");
  }
  function closeInline(cancel: boolean) {
    if (cancel) setDraft(query);
    setExpanded(false);
    inlineTrigger.current?.focus();
  }
  function applyEditor() {
    const next = plan === "A" || plan === "D" ? { ...query, fixed: draft.fixed } : draft;
    commit(next);
    if (!(plan === "B" && next.group)) setOverlay(null);
    if (plan === "C") closeInline(false);
  }
  function sampleState(value: string) {
    if (timer.current) clearTimeout(timer.current);
    setSample(value);
    setOverlay(null);
    setExpanded(false);
    setProblem(false);
    setBusy(false);
    setNotice("");
    setSelected([]);
    setLimit(8);
    const applied = {
      ...emptyQuery(),
      query: spec.search ? "林" : "",
      fixed: Object.fromEntries(spec.fields.map((f) => [f.key, f.values[0]])),
      secondary: true,
      group: true,
    };
    const next =
      value === "默认" || value === "编辑未应用"
        ? emptyQuery()
        : value === "长标签"
          ? { ...applied, query: spec.search ? longPreviewValue : "" }
          : value === "零结果"
            ? { ...applied, advanced: "2027-01-01" }
            : applied;
    setQuery(next);
    setDraft(next);
    setSearch(next.query);
    setResult(next);
    if (value === "编辑未应用") {
      setDraft(applied);
      if (plan === "C" || plan === "old") setExpanded(true);
      else setOverlay("quick");
    }
    if (value === "刷新中" || value === "失败保留旧数据") {
      setResult(emptyQuery());
      commit(next, value === "失败保留旧数据", value === "刷新中" ? 5000 : 650);
    }
  }
  const updateDraft = (key: string, value: string) =>
    setDraft({ ...draft, fixed: { ...draft.fixed, [key]: value } });
  const quickFields = (
    <>
      {spec.fields.map((field) => (
        <label className="field" key={field.key}>
          <span className="field__label">{field.label}</span>
          <select
            className="field__input"
            value={draft.fixed[field.key] ?? ""}
            onChange={(e) => updateDraft(field.key, e.target.value)}
          >
            <option value="">全部</option>
            {field.values.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      ))}
    </>
  );
  const draftSearch = spec.search ? (
    <label className="field">
      <span className="field__label">关键字</span>
      <input
        className="field__input"
        value={draft.query}
        placeholder={spec.search}
        onChange={(e) => setDraft({ ...draft, query: e.target.value })}
      />
    </label>
  ) : null;
  const advancedFields = (
    <>
      <label className="field">
        <span className="field__label">列级条件 · 日期不早于</span>
        <input
          className="field__input"
          type="date"
          value={draft.advanced}
          onChange={(e) => setDraft({ ...draft, advanced: e.target.value })}
        />
      </label>
      <label className="field">
        <span className="field__label">第一排序</span>
        <select
          className="field__input"
          value={draft.sort}
          onChange={(e) => setDraft({ ...draft, sort: e.target.value })}
        >
          <option value="date">日期 ↓</option>
          <option value="name">首列文字 ↑</option>
        </select>
      </label>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={draft.secondary}
          onChange={(e) => setDraft({ ...draft, secondary: e.target.checked })}
        />
        第二排序：日期 ↓
      </label>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={draft.group}
          onChange={(e) => setDraft({ ...draft, group: e.target.checked })}
        />
        按{spec.fields[0].label}分组计数
      </label>
    </>
  );
  function removeTag(key: string) {
    commit(
      key === "query"
        ? { ...query, query: "" }
        : key === "advanced"
          ? { ...query, advanced: "" }
          : { ...query, fixed: { ...query.fixed, [key]: "" } },
    );
  }
  const searchForm = (
    <form
      className={styles.search}
      onSubmit={(e) => {
        e.preventDefault();
        commit({ ...query, query: search.trim() });
      }}
    >
      <label className="field">
        <span className="sr-only">{spec.search}</span>
        <input
          className="field__input"
          value={search}
          placeholder={spec.search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <Button type="submit">搜索</Button>
    </form>
  );
  const groupCounts = Object.entries(
    shown.reduce<Record<string, number>>((counts, row) => {
      const key = row.fields[spec.fields[0].key];
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {}),
  );

  return (
    <div className={`${styles.preview} admin-shell`}>
      <aside className={styles.sidebar}>
        <strong>电脑医院</strong>
        <span className={styles.muted}>管理后台 / 布局示意</span>
        <nav aria-label="预览场景">
          {(Object.keys(previewScenes) as PreviewScene[]).map((key) => (
            <button
              key={key}
              aria-current={scene === key ? "page" : undefined}
              onClick={() => resetScene(key)}
            >
              {previewScenes[key].title}
            </button>
          ))}
        </nav>
        <div className={styles.sidebarEnd}>
          <span className={styles.muted}>LOW-FIDELITY / P0</span>
          <ThemeSwitcher />
        </div>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.labHead}>
          <div>
            <span className={styles.eyebrow}>交互方案对照 / 2026.10</span>
            <h1>{copy.title}</h1>
            <p>{copy.note}</p>
          </div>
          <div className={styles.mobileTheme}>
            <ThemeSwitcher />
          </div>
        </header>
        <section className={styles.lab} aria-labelledby="preview-plan-switch">
          <h2 id="preview-plan-switch" className={styles.switchTitle}>
            {copy.planSwitch}
          </h2>
          <p className={styles.switchHint}>{copy.planHint}</p>
          <div className={styles.plans} aria-label={copy.planSwitch}>
            {(["A", "B", "C", "D", "old"] as PreviewPlan[]).map((key) => (
              <button
                key={key}
                aria-pressed={plan === key}
                onClick={() => {
                  if (!spec.plans.includes(key)) {
                    resetScene(key === "D" ? "repairs" : "members");
                  }
                  setPlan(key);
                  setOverlay(null);
                  setExpanded(false);
                  setDraft(spec.plans.includes(key) ? query : emptyQuery());
                }}
              >
                <b>{key === "old" ? "基线" : key}</b>
                <span>{copy.plans[key].title}</span>
              </button>
            ))}
          </div>
          <div className={styles.sample}>
            <label>
              {copy.scenario}
              <select
                className="field__input"
                value={sample}
                onChange={(e) => sampleState(e.target.value)}
              >
                {copy.samples.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={failNext}
                onChange={(e) => setFailNext(e.target.checked)}
              />
              下次请求失败
            </label>
          </div>
          <p className={styles.muted}>
            {copy.plans[plan].benefit} · {copy.plans[plan].cost}
          </p>
        </section>
        <section className={styles.canvas} aria-label="后台列表预览">
          <header className={styles.pageHead}>
            <div>
              <span className={styles.muted}>后台 / {spec.title}</span>
              <h2>{spec.title}</h2>
            </div>
            {scene !== "audit" && (
              <Button
                variant="solid"
                icon="plus"
                onClick={() => setNotice("新增仅为布局占位，本预览不写入数据")}
              >
                {scene === "members" ? "新增成员" : "新增记录"}
              </Button>
            )}
          </header>
          <div className={styles.queryArea} data-preview-query>
            {plan === "old" ? (
              <AdminTableQuery
                ready={false}
                value={{
                  fixed: { ...query.fixed, query: query.query },
                  sort: [{ field: "createdAt", direction: "desc" }],
                  filters: [],
                  groupBy: "",
                }}
                options={tableQueryOptions(scene === "members" ? "members" : "repairs")}
                quick={[
                  ...(spec.search
                    ? [{ key: "query", label: "关键字", placeholder: spec.search }]
                    : []),
                  ...spec.fields.map((f) => ({
                    key: f.key,
                    label: f.label,
                    options: f.values.map((v) => ({ value: v, label: v })),
                  })),
                ]}
                refreshing={busy}
                onChange={(v) => {
                  const { query: text, ...fixed } = v.fixed;
                  commit({ ...query, query: text, fixed });
                }}
                onClear={() => commit(emptyQuery())}
              />
            ) : (
              <>
                <div className={styles.toolbar}>
                  {plan === "A" && (
                    <>
                      {spec.search && searchForm}
                      <Button
                        icon="filter"
                        className={count ? styles.active : ""}
                        onClick={openQuick}
                      >
                        筛选{count ? ` ${count}` : ""}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setDraft(query);
                          setOverlay("advanced");
                        }}
                      >
                        高级
                      </Button>
                    </>
                  )}
                  {plan === "B" && (
                    <>
                      <span className={styles.muted}>
                        共 {shown.length} {spec.unit}
                      </span>
                      <Button
                        icon="filter"
                        className={tags.length ? styles.summary : ""}
                        onClick={openQuick}
                      >
                        {tags.length
                          ? `${tags
                              .slice(0, 2)
                              .map((t) => t.label)
                              .join(" · ")}${tags.length > 2 ? ` · +${tags.length - 2}` : ""}`
                          : spec.search
                            ? "搜索与筛选"
                            : "筛选"}
                      </Button>
                    </>
                  )}
                  {plan === "C" && (
                    <>
                      <span className={styles.muted}>
                        共 {shown.length} {spec.unit}
                      </span>
                      <button
                        ref={inlineTrigger}
                        className="btn"
                        aria-expanded={expanded}
                        aria-controls="preview-query-band"
                        onClick={() => setExpanded(!expanded)}
                      >
                        <Icon name="filter" />
                        搜索与筛选 {expanded ? "▴" : "▾"}
                        {dirty ? " · 未应用" : ""}
                      </button>
                    </>
                  )}
                  {plan === "D" && (
                    <>
                      <div className={styles.tabs} aria-label="审核状态">
                        {["", ...spec.fields[0].values].map((value) => (
                          <button
                            key={value}
                            aria-pressed={(query.fixed.status ?? "") === value}
                            onClick={() =>
                              commit({ ...query, fixed: { ...query.fixed, status: value } })
                            }
                          >
                            {value || "全部"}
                          </button>
                        ))}
                      </div>
                      <label className={styles.statusMobile}>
                        <span className="sr-only">审核状态</span>
                        <select
                          className="field__input"
                          value={query.fixed.status ?? ""}
                          onChange={(e) =>
                            commit({ ...query, fixed: { ...query.fixed, status: e.target.value } })
                          }
                        >
                          <option value="">全部</option>
                          {spec.fields[0].values.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                      <button
                        className="btn"
                        aria-expanded={searchOpen}
                        aria-controls="preview-search"
                        onClick={() => setSearchOpen(!searchOpen)}
                      >
                        搜索
                      </button>
                      <Button icon="filter" onClick={openQuick}>
                        更多筛选{count ? ` ${count}` : ""}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setDraft(query);
                          setOverlay("advanced");
                        }}
                      >
                        高级
                      </Button>
                    </>
                  )}
                </div>
                {plan === "D" && searchOpen && <div id="preview-search">{searchForm}</div>}
                {plan === "C" && expanded && (
                  <form
                    id="preview-query-band"
                    className={styles.band}
                    onSubmit={(e) => {
                      e.preventDefault();
                      applyEditor();
                    }}
                  >
                    <div className={styles.fields}>
                      {draftSearch}
                      {quickFields}
                    </div>
                    <div className={styles.actions}>
                      <Button type="submit" variant="solid">
                        应用
                      </Button>
                      <Button onClick={() => setOverlay("advanced")}>高级</Button>
                      <Button variant="ghost" onClick={() => closeInline(true)}>
                        取消
                      </Button>
                      {dirty && <span className={styles.muted}>未应用</span>}
                    </div>
                  </form>
                )}
                {tags.length > 0 && (
                  <div className={styles.chips} aria-label="已应用条件">
                    {(fullTags ? tags : tags.slice(0, 3)).map((tag) => (
                      <div className={styles.chip} key={tag.key}>
                        <button
                          onClick={() => {
                            setFullValue(tag.label);
                            setOverlay("value");
                          }}
                          aria-label={`查看完整条件 ${tag.label}`}
                        >
                          {tag.label}
                        </button>
                        <button aria-label={`移除 ${tag.label}`} onClick={() => removeTag(tag.key)}>
                          ×
                        </button>
                      </div>
                    ))}
                    {tags.length > 3 && (
                      <Button variant="ghost" onClick={() => setFullTags(!fullTags)}>
                        {fullTags ? "收起条件" : `其余 ${tags.length - 3} 项`}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() => commit({ ...query, query: "", fixed: {}, advanced: "" })}
                    >
                      清除筛选
                    </Button>
                  </div>
                )}
              </>
            )}
            <div className={styles.meta}>
              <span>
                排序：{query.sort === "date" ? "日期 ↓" : "首列 ↑"}
                {query.secondary ? " → 日期 ↓" : ""}
              </span>
              {query.group && <span>分组：{spec.fields[0].label}</span>}
              <Button variant="ghost" onClick={() => commit(emptyQuery())}>
                重置查询
              </Button>
            </div>
          </div>
          <div className={styles.listTools}>
            <span>
              {selected.length
                ? `已选 ${selected.length} 项`
                : `共 ${shown.length} ${spec.unit} · 虚构样例`}
            </span>
            <div className={styles.actions}>
              {selected.length > 0 && (
                <Button
                  onClick={() =>
                    setNotice(`已选 ${selected.length} 条虚构记录，批量操作仅作入口演示`)
                  }
                >
                  批量操作
                </Button>
              )}
              <Button
                icon="download"
                onClick={() => {
                  const blob = new Blob(
                    [
                      "\uFEFF" +
                        [spec.columns, ...shown.map((r) => r.cells)]
                          .map((r) => r.map((v) => `"${v.replaceAll('"', '""')}"`).join(","))
                          .join("\n"),
                    ],
                    { type: "text/csv;charset=utf-8" },
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "虚构数据预览.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                  setNotice(problem || busy ? "已导出当前保留的旧结果" : "已导出当前筛选结果");
                }}
              >
                导出样例
              </Button>
              <Button variant="ghost" onClick={() => commit(query)}>
                刷新
              </Button>
            </div>
          </div>
          <div role="status" aria-live="polite" className={styles.feedback}>
            {busy
              ? "刷新中 · 暂时保留上次结果与数量"
              : problem
                ? "刷新失败 · 以下仍为上次结果，当前条件尚未获得新结果"
                : notice}
          </div>
          {problem && <Button onClick={() => commit(query, false)}>重试</Button>}
          {result.group && (
            <div className={styles.groups} aria-label="分组计数">
              {groupCounts.length
                ? groupCounts.map(([key, n]) => (
                    <span key={key}>
                      {key} {n}
                    </span>
                  ))
                : "无分组结果"}
            </div>
          )}
          <div className={styles.tableWrap} tabIndex={0} aria-label="可横向滚动的示例列表">
            <table className={styles.table} aria-busy={busy}>
              <thead>
                <tr>
                  <th>
                    <input
                      aria-label="选择当前已显示记录"
                      type="checkbox"
                      checked={
                        shown.slice(0, limit).length > 0 &&
                        shown.slice(0, limit).every((r) => selected.includes(r.id))
                      }
                      onChange={(e) =>
                        setSelected(e.target.checked ? shown.slice(0, limit).map((r) => r.id) : [])
                      }
                    />
                  </th>
                  {spec.columns.map((column, i) => (
                    <th key={column}>
                      <button onClick={() => commit({ ...query, sort: i === 0 ? "name" : "date" })}>
                        {column}
                        {i === 0 && query.sort === "name"
                          ? " ↑"
                          : i === 4 && query.sort === "date"
                            ? " ↓"
                            : ""}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.slice(0, limit).map((row) => (
                  <tr key={row.id} data-preview-row>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`选择 ${row.cells[0]}`}
                        checked={selected.includes(row.id)}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, row.id]
                              : selected.filter((id) => id !== row.id),
                          )
                        }
                      />
                    </td>
                    {row.cells.map((cell, i) => (
                      <td key={i}>
                        {i === 3 ? <span className={styles.status}>{cell}</span> : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length === 0 && (
              <div className={styles.empty}>
                <strong>没有符合条件的记录</strong>
                <p>调整条件，或清除筛选后重试</p>
              </div>
            )}
          </div>
          <div className={styles.end}>
            {shown.length > limit ? (
              <Button onClick={() => setLimit(limit + 8)}>加载更多</Button>
            ) : (
              `已显示 ${shown.length} ${spec.unit}`
            )}
          </div>
        </section>
        <p className={styles.footnote}>{copy.guide}</p>
      </div>
      {overlay === "value" && (
        <PreviewModal
          title="完整条件"
          kind="advanced"
          anchor={null}
          onClose={() => setOverlay(null)}
        >
          <p className={styles.fullValue}>{fullValue}</p>
          <Button onClick={() => setOverlay(null)}>返回列表</Button>
        </PreviewModal>
      )}
      {(overlay === "quick" || overlay === "advanced") && (
        <PreviewModal
          title={
            overlay === "advanced"
              ? "高级查询"
              : plan === "B"
                ? spec.search
                  ? "搜索与筛选"
                  : "筛选"
                : "常用筛选"
          }
          kind={overlay === "advanced" ? "advanced" : plan === "B" ? "drawer" : "popover"}
          anchor={anchor}
          onClose={() => setOverlay(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (overlay === "advanced") {
                const next =
                  plan === "C"
                    ? draft
                    : {
                        ...query,
                        advanced: draft.advanced,
                        sort: draft.sort,
                        secondary: draft.secondary,
                        group: draft.group,
                      };
                if (plan === "C") setDraft(next);
                else commit(next);
                setOverlay(null);
              } else applyEditor();
            }}
          >
            <div className={styles.editorContent}>
              {overlay === "advanced" ? (
                advancedFields
              ) : (
                <>
                  {plan === "B" && draftSearch}
                  <div className={styles.editorFields}>
                    {plan === "D" ? (
                      <>
                        {spec.fields
                          .filter((f) => f.key !== "status")
                          .map((f) => (
                            <label className="field" key={f.key}>
                              <span className="field__label">{f.label}</span>
                              <select
                                className="field__input"
                                value={draft.fixed[f.key] ?? ""}
                                onChange={(e) => updateDraft(f.key, e.target.value)}
                              >
                                <option value="">全部</option>
                                {f.values.map((v) => (
                                  <option key={v}>{v}</option>
                                ))}
                              </select>
                            </label>
                          ))}
                      </>
                    ) : (
                      quickFields
                    )}
                  </div>
                  {plan === "B" && (
                    <>
                      <details open={draft.advanced !== ""}>
                        <summary>高级条件</summary>
                        <label className="field">
                          <span className="field__label">日期不早于</span>
                          <input
                            className="field__input"
                            type="date"
                            value={draft.advanced}
                            onChange={(e) => setDraft({ ...draft, advanced: e.target.value })}
                          />
                        </label>
                      </details>
                      <details>
                        <summary>排序与分组</summary>
                        {advancedFields.props.children.slice(1)}
                      </details>
                    </>
                  )}
                </>
              )}
              {dirty && <span className={styles.muted}>未应用 · 列表与摘要仍使用已应用条件</span>}
              {plan === "B" && query.group && (
                <div className={styles.groups}>
                  已应用分组：
                  {busy
                    ? "更新中"
                    : groupCounts.map(([key, n]) => `${key} ${n}`).join(" · ") || "无结果"}
                </div>
              )}
            </div>
            <footer className={styles.editorActions}>
              <Button
                variant="ghost"
                onClick={() => {
                  setDraft(query);
                  setOverlay(null);
                }}
              >
                取消
              </Button>
              <Button type="submit" variant="solid">
                应用
              </Button>
            </footer>
          </form>
        </PreviewModal>
      )}
    </div>
  );
}
