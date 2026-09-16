"use client";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { RepairDetailView } from "@/types/contracts";
type Props = {
  recordId: string;
  statusLabels: Record<string, string>;
  resultLabels: Record<string, string>;
  timelineLabels: Record<string, string>;
  commentsPlaceholder: string;
};
export function RepairDetail({
  recordId,
  statusLabels,
  resultLabels,
  timelineLabels,
  commentsPlaceholder,
}: Props) {
  const [record, setRecord] = useState<RepairDetailView>();
  const [state, setState] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const load = useCallback(async () => {
    setState("loading");
    try {
      const r = await fetch(`/api/v1/repairs/${recordId}`, { cache: "no-store" });
      const j = await r.json();
      if (!j.success) {
        setState(
          j.error.code === "REPAIR_NOT_FOUND" || j.error.code === "REPAIR_FORBIDDEN"
            ? "forbidden"
            : "error",
        );
        return;
      }
      setRecord(j.data);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [recordId]);
  useEffect(() => {
    void load();
  }, [load]);
  if (state === "loading") return <p role="status">正在加载维修详情…</p>;
  if (state === "error")
    return (
      <Card variant="notice">
        <p>详情加载失败。</p>
        <Button onClick={() => void load()}>重试</Button>
      </Card>
    );
  if (state === "forbidden")
    return (
      <Card variant="notice">
        <p>记录不存在或你无权查看。</p>
        <Button href="/member/repairs">返回列表</Button>
      </Card>
    );
  if (!record) return null;
  return (
    <div className="gap-s-6 grid">
      <Card className="gap-s-4 grid">
        <div className="gap-s-3 flex flex-wrap justify-between">
          <h2 className="text-display-3 font-bold">基础信息</h2>
          <span>{statusLabels[record.status]}</span>
        </div>
        <dl className="gap-s-3 grid md:grid-cols-2">
          <div>
            <dt className="text-ink-3 text-sm">维修成员</dt>
            <dd>{record.member.name}</dd>
          </div>
          <div>
            <dt className="text-ink-3 text-sm">维修日期</dt>
            <dd>{record.repairDate ?? "待补充"}</dd>
          </div>
          <div>
            <dt className="text-ink-3 text-sm">维修时长</dt>
            <dd>{record.durationMinutes ? `${record.durationMinutes} 分钟` : "待补充"}</dd>
          </div>
          <div>
            <dt className="text-ink-3 text-sm">故障分类</dt>
            <dd>{record.category?.name ?? "待补充"}</dd>
          </div>
        </dl>
        {record.canEdit ? (
          <Button href={`/member/repairs/${record.id}/edit`}>继续编辑</Button>
        ) : null}
      </Card>
      <Card className="gap-s-3 grid">
        <h2 className="text-display-3 font-bold">维修内容</h2>
        <p className="text-ink-2 whitespace-pre-wrap">{record.content ?? "待补充"}</p>
      </Card>
      <Card className="gap-s-3 grid">
        <h2 className="text-display-3 font-bold">维修结果</h2>
        <p>{record.result ? resultLabels[record.result] : "待补充"}</p>
        {record.remark ? <p className="text-ink-2 whitespace-pre-wrap">{record.remark}</p> : null}
      </Card>
      <Card className="gap-s-4 grid">
        <h2 className="text-display-3 font-bold">维修照片</h2>
        {record.photos.length ? (
          <div className="gap-s-4 grid md:grid-cols-2">
            {record.photos.map((p, i) => (
              <Image
                key={p.id}
                className="rounded-mid border-line h-64 w-full border object-cover"
                src={p.contentUrl}
                alt={`维修照片 ${i + 1}`}
                width={720}
                height={480}
                unoptimized
              />
            ))}
          </div>
        ) : (
          <p>暂无照片。</p>
        )}
      </Card>
      <Card className="gap-s-3 grid">
        <h2 className="text-display-3 font-bold">审核信息</h2>
        {record.reviews.length ? (
          record.reviews.map((r) => (
            <div className="border-line-soft pb-s-3 border-b" key={r.id}>
              <strong>{r.decision === "APPROVED" ? "审核通过" : "审核退回"}</strong>
              <p>{r.note || "无补充意见"}</p>
              <small>{new Date(r.createdAt).toLocaleString("zh-CN")}</small>
            </div>
          ))
        ) : (
          <p>尚无审核记录。</p>
        )}
      </Card>
      <Card className="gap-s-3 grid">
        <h2 className="text-display-3 font-bold">记录时间线</h2>
        <ol className="gap-s-3 grid">
          {record.timeline.map((e) => (
            <li className="border-accent-line pl-s-4 border-l-2" key={e.id}>
              <strong>{timelineLabels[e.eventType] ?? e.eventType}</strong>
              <p className="text-ink-3 text-sm">
                {new Date(e.createdAt).toLocaleString("zh-CN")} · {e.actorName ?? "系统"}
              </p>
            </li>
          ))}
        </ol>
      </Card>
      <Card variant="notice">
        <h2 className="font-bold">交流讨论</h2>
        <p>{commentsPlaceholder}</p>
      </Card>
    </div>
  );
}
