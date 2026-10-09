"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createIdempotencyKey } from "@/lib/idempotency-key";
import { RepairEditor } from "./RepairEditor";

/**
 * 新建维修记录：点进来就是表单（issue #72），不再有「先建草稿再编辑」的中间步。
 * 照片上传接口挂在记录 ID 上，所以先在后台静默建档，再把表单交给成员；
 * 幂等键固定在这一次页面会话，重复挂载或点重试不会多建记录。
 */
export function CreateRepairForm() {
  const [idempotencyKey] = useState(createIdempotencyKey);
  const [recordId, setRecordId] = useState("");
  const [error, setError] = useState("");
  const open = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/v1/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: "{}",
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error.message);
      setRecordId(json.data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "打开表单失败，请重试。");
    }
  }, [idempotencyKey]);
  useEffect(() => {
    void open();
  }, [open]);
  if (error)
    return (
      <Card variant="notice">
        <p>{error}</p>
        <Button onClick={() => void open()}>重试</Button>
      </Card>
    );
  if (!recordId) return <p role="status">正在打开表单…</p>;
  return <RepairEditor recordId={recordId} allowSaveDraft={false} />;
}
