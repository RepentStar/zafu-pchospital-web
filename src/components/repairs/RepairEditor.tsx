"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { RepairCategoryView, RepairDetailView, RepairResult } from "@/types/contracts";

export function RepairEditor({
  recordId,
  resultLabels,
}: {
  recordId: string;
  resultLabels: Record<RepairResult, string>;
}) {
  const router = useRouter();
  const [record, setRecord] = useState<RepairDetailView>();
  const [categories, setCategories] = useState<RepairCategoryView[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setState("loading");
    try {
      const [a, b] = await Promise.all([
        fetch(`/api/v1/repairs/${recordId}`, { cache: "no-store" }),
        fetch("/api/v1/repair-categories", { cache: "no-store" }),
      ]);
      const detail = await a.json();
      const cats = await b.json();
      if (!detail.success) {
        setState(
          detail.error.code === "REPAIR_FORBIDDEN" || detail.error.code === "REPAIR_NOT_FOUND"
            ? "forbidden"
            : "error",
        );
        return;
      }
      if (!detail.data.canEdit) {
        setState("forbidden");
        return;
      }
      setRecord(detail.data);
      setCategories(cats.success ? cats.data : []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [recordId]);
  useEffect(() => {
    void load();
  }, [load]);
  function field<K extends keyof RepairDetailView>(key: K, value: RepairDetailView[K]) {
    setRecord((current) => (current ? { ...current, [key]: value } : current));
  }
  async function save() {
    if (!record) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/repairs/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: record.version,
          repairDate: record.repairDate,
          durationMinutes: record.durationMinutes,
          categoryId: record.category?.id ?? null,
          content: record.content,
          result: record.result,
          remark: record.remark,
        }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error.message);
      await load();
      setMessage("草稿已保存。");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (!record) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/repairs/${recordId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ version: record.version }),
      });
      const json = await response.json();
      if (!json.success) {
        const fields = json.error.fieldErrors
          ? Object.values(json.error.fieldErrors).flat().join("；")
          : "";
        throw new Error(fields || json.error.message);
      }
      router.replace(`/member/repairs/${recordId}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "提交失败");
      setBusy(false);
    }
  }
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      Array.from(files).forEach((file) => form.append("photos", file));
      const response = await fetch(`/api/v1/repairs/${recordId}/photos`, {
        method: "POST",
        body: form,
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error.message);
      await load();
      setMessage("照片已上传。");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "上传失败");
    } finally {
      setBusy(false);
    }
  }
  async function remove(photoId: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/repairs/${recordId}/photos/${photoId}`, {
        method: "DELETE",
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error.message);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "移除失败");
    } finally {
      setBusy(false);
    }
  }
  async function reorder(photoId: string, sortOrder: number) {
    await fetch(`/api/v1/repairs/${recordId}/photos/${photoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sortOrder }),
    });
    await load();
  }
  if (state === "loading") return <p role="status">正在加载草稿…</p>;
  if (state === "error")
    return (
      <Card variant="notice">
        <p>记录加载失败。</p>
        <Button onClick={() => void load()}>重试</Button>
      </Card>
    );
  if (state === "forbidden")
    return (
      <Card variant="notice">
        <p>这条记录不存在，或当前状态不允许编辑。</p>
        <Button href="/member/repairs">返回列表</Button>
      </Card>
    );
  if (!record) return null;
  const rejection = [...record.reviews].reverse().find((item) => item.decision === "REJECTED");
  return (
    <div className="gap-s-6 grid">
      {rejection ? (
        <Card variant="notice">
          <strong>最新退回原因</strong>
          <p>{rejection.note}</p>
        </Card>
      ) : null}
      <Card>
        <form
          className="gap-s-5 grid"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="gap-s-4 grid md:grid-cols-2">
            <label className="field">
              <span className="field__label">维修日期</span>
              <input
                className="field__input"
                type="date"
                value={record.repairDate ?? ""}
                onChange={(e) => field("repairDate", e.target.value || null)}
              />
            </label>
            <label className="field">
              <span className="field__label">维修时长（分钟）</span>
              <input
                className="field__input"
                type="number"
                min="1"
                max="10080"
                value={record.durationMinutes ?? ""}
                onChange={(e) =>
                  field("durationMinutes", e.target.value ? Number(e.target.value) : null)
                }
              />
            </label>
            <label className="field">
              <span className="field__label">故障分类</span>
              <select
                className="field__input"
                value={record.category?.id ?? ""}
                onChange={(e) =>
                  field("category", categories.find((c) => c.id === e.target.value) ?? null)
                }
              >
                <option value="">请选择</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">维修结果</span>
              <select
                className="field__input"
                value={record.result ?? ""}
                onChange={(e) => field("result", (e.target.value || null) as RepairResult | null)}
              >
                <option value="">请选择</option>
                {Object.entries(resultLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span className="field__label">维修内容</span>
            <textarea
              className="field__input min-h-40"
              minLength={10}
              maxLength={10000}
              value={record.content ?? ""}
              onChange={(e) => field("content", e.target.value)}
              aria-describedby="repair-content-hint"
            />
            <span className="field__hint" id="repair-content-hint">
              提交审核时须填写 10–10000 字。
            </span>
          </label>
          <label className="field">
            <span className="field__label">备注</span>
            <textarea
              className="field__input min-h-24"
              maxLength={2000}
              value={record.remark ?? ""}
              onChange={(e) => field("remark", e.target.value)}
            />
          </label>
          <p className="field__hint">当前版本：{record.version}</p>
          <div className="signup__actions">
            <Button type="submit" disabled={busy}>
              保存草稿
            </Button>
            <Button type="button" variant="solid" disabled={busy} onClick={() => void submit()}>
              提交审核
            </Button>
          </div>
          {message ? (
            <p className="signup__status" role="status">
              {message}
            </p>
          ) : null}
        </form>
      </Card>
      <Card className="gap-s-4 grid">
        <div>
          <h2 className="text-display-3 font-bold">维修照片</h2>
          <p className="text-ink-3">支持 JPEG、PNG、WebP，提交审核至少需要一张。</p>
        </div>
        <label className="field">
          <span className="field__label">选择照片</span>
          <input
            className="field__input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={busy}
            onChange={(e) => void upload(e.target.files)}
          />
        </label>
        <div className="gap-s-4 grid md:grid-cols-2">
          {record.photos.map((photo, index) => (
            <figure className="gap-s-2 grid" key={photo.id}>
              <Image
                className="rounded-mid border-line h-56 w-full border object-cover"
                src={photo.contentUrl}
                alt={`维修照片 ${index + 1}`}
                width={720}
                height={480}
                unoptimized
              />
              <figcaption className="gap-s-2 flex flex-wrap">
                <Button
                  disabled={index === 0 || busy}
                  onClick={() => void reorder(photo.id, index - 1)}
                >
                  前移
                </Button>
                <Button
                  disabled={index === record.photos.length - 1 || busy}
                  onClick={() => void reorder(photo.id, index + 1)}
                >
                  后移
                </Button>
                <Button disabled={busy} onClick={() => void remove(photo.id)}>
                  移除
                </Button>
              </figcaption>
            </figure>
          ))}
        </div>
      </Card>
    </div>
  );
}
