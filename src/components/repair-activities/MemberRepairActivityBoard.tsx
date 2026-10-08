"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { formatShanghaiDateTime } from "@/components/repair-activities/activity-format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { repairStatusLabels } from "@/config/repairs";
import { memberRepairActivitiesCopy } from "@/config/repair-activities";
import { canOperateActivityStaff } from "@/features/repair-activities/repair-activity-validation";
import type {
  StaffBoardView,
  StaffRegistrationView,
  StaffServeDraft,
} from "@/features/repair-activities/repair-activity-staff-service";

type Props = { activityId: string };

export function MemberRepairActivityBoard({ activityId }: Props) {
  const router = useRouter();
  const copy = memberRepairActivitiesCopy.board;
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [board, setBoard] = useState<StaffBoardView | null>(null);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<StaffRegistrationView | null>(null);
  const [checkInConfirmOpen, setCheckInConfirmOpen] = useState(false);
  /** 全局接单拦截弹层（issue #79 第 6 项）：点击「接待」命中未完成草稿时出现，不发请求。 */
  const [pendingNotice, setPendingNotice] = useState<StaffServeDraft | null>(null);

  const load = useCallback(async (): Promise<StaffBoardView | null> => {
    setMessage("");
    try {
      const response = await fetch(`/api/v1/member/repair-activities/${activityId}/board`, {
        cache: "no-store",
      });
      const json = (await response.json()) as {
        success: boolean;
        data?: StaffBoardView;
        error?: { message?: string };
      };
      if (!json.success || !json.data) {
        setState("error");
        setMessage(json.error?.message ?? copy.loadFailed);
        return null;
      }
      setBoard(json.data);
      setSelected(new Set());
      setState("ready");
      return json.data;
    } catch {
      setState("error");
      setMessage(copy.loadFailed);
      return null;
    }
  }, [activityId, copy.loadFailed]);

  useEffect(() => {
    void load();
  }, [load]);

  async function postJson<T>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<{ ok: true; data: T } | { ok: false; message: string; code?: string }> {
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await response.json()) as {
        success: boolean;
        data?: T;
        error?: { message?: string; code?: string };
      };
      if (!json.success || json.data === undefined) {
        return {
          ok: false,
          message: json.error?.message ?? copy.loadFailed,
          code: json.error?.code,
        };
      }
      return { ok: true, data: json.data };
    } catch {
      return { ok: false, message: copy.loadFailed };
    }
  }

  async function attend() {
    setBusy("attend");
    setToast(null);
    const result = await postJson<{ attended: boolean }>(
      `/api/v1/member/repair-activities/${activityId}/attendance`,
      {},
    );
    setBusy(null);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setToast(copy.attendSuccess);
    await load();
  }

  function openCheckInConfirm() {
    if (selected.size === 0) {
      setMessage(copy.selectNone);
      return;
    }
    setCheckInConfirmOpen(true);
  }

  async function confirmCheckIn() {
    setBusy("check-in");
    setToast(null);
    setMessage("");
    const result = await postJson<{ checkedIn: StaffRegistrationView[] }>(
      `/api/v1/member/repair-activities/${activityId}/check-in`,
      { registrationIds: [...selected] },
    );
    setBusy(null);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setCheckInConfirmOpen(false);
    setToast(copy.checkInSuccess);
    await load();
  }

  async function confirmWithdraw() {
    if (!withdrawTarget) return;
    const registrationId = withdrawTarget.id;
    setBusy(`withdraw:${registrationId}`);
    setToast(null);
    setMessage("");
    const result = await postJson<StaffRegistrationView>(
      `/api/v1/member/repair-activities/${activityId}/withdraw`,
      { registrationId },
    );
    setBusy(null);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setWithdrawTarget(null);
    setToast(copy.withdrawSuccess);
    await load();
  }

  async function serve(registrationId: string) {
    setBusy(`serve:${registrationId}`);
    setToast(null);
    setMessage("");
    const result = await postJson<{ repairRecordId: string }>(
      `/api/v1/member/repair-activities/${activityId}/serve`,
      { registrationId },
    );
    setBusy(null);
    if (!result.ok) {
      if (result.code === "ACTIVITY_SERVE_DRAFT_PENDING") {
        // 服务端兜底（多标签 / 并发）：先刷新看板，再按最新的 pendingServeDraft 弹层；
        // 刷新后若无草稿（例如另一标签已提交），退回内联提示。
        const fresh = await load();
        if (fresh?.pendingServeDraft) setPendingNotice(fresh.pendingServeDraft);
        else setMessage(result.message);
        return;
      }
      setMessage(result.message);
      return;
    }
    setToast(copy.serveSuccess);
    await load();
  }

  /** 点击「接待」：先看客户端已加载的 pendingServeDraft，非空则弹层且**不发请求**。 */
  function requestServe(registrationId: string) {
    if (board?.pendingServeDraft) {
      setPendingNotice(board.pendingServeDraft);
      return;
    }
    void serve(registrationId);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (state === "loading") {
    return (
      <div className="activity-board activity-board--loading" role="status">
        <p className="muted">{copy.loading}</p>
      </div>
    );
  }
  if (state === "error" || !board) {
    return (
      <div className="activity-board">
        <p className="admin-status admin-status--error" role="alert">
          {message || copy.loadFailed}
        </p>
        <Button href="/member/repair-activities" variant="ghost">
          {copy.back}
        </Button>
      </div>
    );
  }

  const staffOpen = canOperateActivityStaff(board.activity.signupClosesAt);
  const opsDisabled = !staffOpen || !board.attended || busy !== null;
  const withdrawBusy = withdrawTarget ? busy === `withdraw:${withdrawTarget.id}` : false;
  const checkInBusy = busy === "check-in";
  const selectedRows = board.eligible.filter((row) => selected.has(row.id));

  return (
    <div className="activity-board">
      <div className="activity-board__toolbar">
        <Button href="/member/repair-activities" variant="ghost">
          {copy.back}
        </Button>
        {board.attended ? (
          <span className="admin-tag admin-tag--accent">{copy.attendedBadge}</span>
        ) : (
          <Button
            className="activity-board__attend-cta"
            variant="solid"
            onClick={() => void attend()}
            disabled={!staffOpen || busy !== null}
          >
            {busy === "attend" ? copy.attending : copy.attendCta}
          </Button>
        )}
      </div>

      {!staffOpen || !board.attended ? (
        <Card className="activity-board__attend-banner" variant="notice">
          <p role="status">{staffOpen ? copy.attendPrompt : copy.signupNotClosed}</p>
        </Card>
      ) : null}
      {message ? (
        <p className="admin-status admin-status--error" role="alert">
          {message}
        </p>
      ) : null}
      {toast ? (
        <p className="admin-status admin-status--success" role="status">
          {toast}
        </p>
      ) : null}

      <div className="activity-board__panes">
        <Card className="activity-board__pane repair-panel">
          <header className="activity-board__pane-head">
            <h2>{copy.eligibleTitle}</h2>
            <span className="member-section__tag">{copy.eligibleTag}</span>
          </header>
          {board.eligible.length === 0 ? (
            <p className="muted activity-board__empty">{copy.eligibleEmpty}</p>
          ) : (
            <ul className="activity-board__list">
              {board.eligible.map((row) => (
                <li key={row.id} className="activity-board__row">
                  <label className="activity-board__check">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      disabled={opsDisabled}
                      onChange={() => toggle(row.id)}
                    />
                    <span>
                      <strong>{row.name}</strong>
                      <span className="muted">
                        {" "}
                        · {row.phoneMasked} · {row.issueTypeLabel}
                        {/* 机型选填：没填就不占位（issue #68）。 */}
                        {row.deviceModel ? ` · ${copy.deviceModel} ${row.deviceModel}` : null}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="activity-board__actions">
            <p className="muted">{copy.selectHint}</p>
            <Button
              variant="solid"
              onClick={openCheckInConfirm}
              disabled={opsDisabled || selected.size === 0}
            >
              {busy === "check-in" ? copy.checkingIn : copy.checkIn}
            </Button>
          </div>
        </Card>

        <Card className="activity-board__pane repair-panel">
          <header className="activity-board__pane-head">
            <h2>{copy.queueTitle}</h2>
            <span className="member-section__tag">{copy.queueTag}</span>
          </header>
          {board.queue.length === 0 ? (
            <p className="muted activity-board__empty">{copy.queueEmpty}</p>
          ) : (
            <ul className="activity-board__list">
              {board.queue.map((row, index) => (
                <li key={row.id} className="activity-board__row activity-board__row--queue">
                  <div className="activity-board__queue-main">
                    {/* 队列位次：按当前渲染顺序从 1 开始（服务端已按签到时间升序）。 */}
                    <span className="activity-board__queue-rank">
                      {copy.queueRank.replace("{index}", String(index + 1))}
                    </span>
                    <div>
                      <strong>{row.name}</strong>
                      <div className="muted">
                        {copy.phone} {row.phoneMasked} · {copy.issueType} {row.issueTypeLabel}
                      </div>
                      {row.deviceModel ? (
                        <div className="muted">
                          {copy.deviceModel} {row.deviceModel}
                        </div>
                      ) : null}
                      {row.checkedInAt ? (
                        <div className="muted">
                          {copy.checkedInAt} {formatShanghaiDateTime(row.checkedInAt)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="activity-board__row-actions">
                    <Button
                      variant="solid"
                      onClick={() => requestServe(row.id)}
                      disabled={opsDisabled}
                    >
                      {busy === `serve:${row.id}` ? copy.serving : copy.serve}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setWithdrawTarget(row)}
                      disabled={!board.attended || busy !== null}
                    >
                      {busy === `withdraw:${row.id}` ? copy.withdrawing : copy.withdraw}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* 「已接待」= 常驻区块（issue #79 第 6 项）：数据为空只换内容，区块本身不出现 / 消失。 */}
      <Card className="activity-board__pane repair-panel">
        <header className="activity-board__pane-head">
          <h2>{copy.servedTitle}</h2>
          <span className="member-section__tag">{copy.servedTag}</span>
        </header>
        {board.served.length === 0 ? (
          <p className="muted activity-board__empty">{copy.servedEmpty}</p>
        ) : (
          <ul className="activity-board__list">
            {board.served.map((row) => {
              const recordId = row.repairRecordId;
              return (
                <li key={row.id} className="activity-board__row">
                  <div className="activity-board__queue-main">
                    <div>
                      <strong>{row.name}</strong>{" "}
                      {row.recordStatus ? (
                        <span className="admin-tag">{repairStatusLabels[row.recordStatus]}</span>
                      ) : null}
                      <div className="muted">
                        {copy.phone} {row.phoneMasked}
                      </div>
                    </div>
                  </div>
                  <div className="activity-board__row-actions">
                    {/* 记录缺失或已软删除：占位文案，不出链接。 */}
                    {!recordId || !row.recordStatus ? (
                      <span className="muted">{copy.recordMissing}</span>
                    ) : row.recordStatus === "DRAFT" || row.recordStatus === "REJECTED" ? (
                      <Button href={`/member/repairs/${recordId}/edit`}>{copy.fillRepair}</Button>
                    ) : (
                      <Button variant="ghost" href={`/member/repairs/${recordId}`}>
                        {copy.viewRepair}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {checkInConfirmOpen ? (
        <ConfirmDialog
          title={copy.checkInConfirmTitle}
          cancelLabel={copy.checkInCancel}
          confirmLabel={checkInBusy ? copy.checkingIn : copy.checkInConfirm}
          busy={checkInBusy}
          onClose={() => {
            if (!checkInBusy) setCheckInConfirmOpen(false);
          }}
          onConfirm={() => void confirmCheckIn()}
        >
          <p>{copy.checkInConfirmHint}</p>
          <ul className="admin-plain-list">
            {selectedRows.map((row) => (
              <li key={row.id}>
                <strong>
                  {row.name} · {row.phoneMasked}
                </strong>
              </li>
            ))}
          </ul>
        </ConfirmDialog>
      ) : null}

      {withdrawTarget ? (
        <ConfirmDialog
          title={copy.withdrawConfirmTitle}
          cancelLabel={copy.withdrawCancel}
          confirmLabel={withdrawBusy ? copy.withdrawing : copy.withdrawConfirm}
          busy={withdrawBusy}
          onClose={() => {
            if (!withdrawBusy) setWithdrawTarget(null);
          }}
          onConfirm={() => void confirmWithdraw()}
        >
          <p>{copy.withdrawConfirmHint}</p>
          <p>
            <strong>
              {withdrawTarget.name} · {withdrawTarget.phoneMasked}
            </strong>
          </p>
        </ConfirmDialog>
      ) : null}

      {pendingNotice ? (
        <ConfirmDialog
          title={copy.pendingServeTitle}
          cancelLabel={copy.pendingServeDismiss}
          confirmLabel={copy.pendingServeFill}
          onClose={() => setPendingNotice(null)}
          onConfirm={() => {
            router.push(`/member/repairs/${pendingNotice.repairRecordId}/edit`);
          }}
        >
          <p>
            {copy.pendingServeBody
              .replace("{owner}", pendingNotice.ownerName)
              .replace("{activity}", pendingNotice.activityTitle)}
          </p>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
