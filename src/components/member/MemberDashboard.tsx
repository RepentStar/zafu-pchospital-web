"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MemberAvatar } from "@/components/member/MemberAvatar";
import { MemberMetrics } from "@/components/member/MemberMetrics";
import { MemberRecentRepairs } from "@/components/member/MemberRecentRepairs";
import { MemberSection } from "@/components/member/MemberSection";
import { MemberShortcuts } from "@/components/member/MemberShortcuts";
import { MemberSkillList } from "@/components/member/MemberSkillList";
import { MemberUpcoming } from "@/components/member/MemberUpcoming";
import { MemberWorkQueueView } from "@/components/member/MemberWorkQueue";
import { MemberSkeleton } from "@/components/member/MemberSkeleton";
import { memberCopy, formatShanghaiDate } from "@/config/member";
import { roleLabels } from "@/components/member/MemberIdentityFields";
import type { MemberDashboard as MemberDashboardData } from "@/types/contracts";

/**
 * MemberDashboard —— 成员工作台主视图（客户端）
 *
 * 数据来自 `GET /api/v1/member/dashboard`（单一聚合请求，避免多接口串联导致的白屏）。
 *
 * 降级策略（任务书 §12.1）：**指标加载用稳定骨架，失败时局部错误**。
 * 因此这里把「加载中 / 失败」限制在内容区，欢迎区（来自服务端已知的会话信息）
 * 始终可用，不会因为一次请求失败就整页白屏。
 */

export type MemberDashboardProps = {
  /** 服务端已认证的展示名，用于首屏立即渲染欢迎区（避免首屏空壳） */
  initialDisplayName: string;
  roles: readonly string[];
};

export function MemberDashboard({ initialDisplayName, roles }: MemberDashboardProps) {
  const copy = memberCopy.dashboard;
  const [data, setData] = useState<MemberDashboardData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch("/api/v1/member/dashboard", { cache: "no-store" });
      const json = await response.json();
      if (!json.success) throw new Error(json?.error?.code ?? "DASHBOARD_FAILED");
      setData(json.data as MemberDashboardData);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const profile = data?.profile ?? null;
  const displayName = profile?.displayName ?? initialDisplayName;
  const joinedAt = profile ? formatShanghaiDate(profile.joinedAt) : null;
  const roleText = roleLabels(profile?.roles ?? roles);

  return (
    <>
      <header className="member-hero">        <div className="member-hero__identity">
          <MemberAvatar displayName={displayName} avatarUrl={profile?.avatarUrl} />
          <div className="member-hero__text">
            <h1 className="member-hero__name" id="member-title">
              {displayName}
            </h1>
            <p className="member-hero__meta">
              <span>
                {copy.welcome}
                {roleText ? ` · ${roleText}` : ""}
              </span>
              {joinedAt ? (
                <span>
                  {copy.joinedAtLabel} <span className="member-hero__meta-num">{joinedAt}</span>
                </span>
              ) : null}
            </p>
          </div>
        </div>
        <div className="member-hero__actions">
          <Button href="/member/profile">{copy.settingsAction}</Button>
        </div>
      </header>

      {state === "error" ? (
        <Card variant="notice">
          <p>{memberCopy.common.loadError}</p>
          <Button onClick={() => void load()}>{memberCopy.common.reload}</Button>
        </Card>
      ) : null}

      {state === "loading" ? <MemberSkeleton /> : null}

      {state === "ready" && data ? (
        <div className="member-workspace__content">
          <section aria-labelledby="member-metrics-title">
            <MemberSection
              id="member-metrics-title"
              title={copy.metricsTitle}
              tag={copy.metricsTag}
              foot={copy.metricsFootnote}
            >
              {/* 局部降级：只让失败区块显示错误态，其余区块照常展示真实数据。 */}
              {data.degraded.includes("repairSummary") ? (
                <SectionError onRetry={() => void load()} />
              ) : (
                <MemberMetrics summary={data.repairSummary} />
              )}
            </MemberSection>
          </section>

          <section aria-labelledby="member-skills-title">
            <MemberSection id="member-skills-title" title={copy.skillsLabel} tag={copy.quickTag}>
              <MemberSkillList skills={data.profile.skills} />
            </MemberSection>
          </section>

          <section aria-labelledby="member-queue-title">
            <MemberSection id="member-queue-title" title={copy.queueTitle} tag={copy.queueTag}>
              {data.degraded.includes("workQueue") ? (
                <SectionError onRetry={() => void load()} />
              ) : (
                <MemberWorkQueueView queue={data.workQueue} />
              )}
            </MemberSection>
          </section>

          <section aria-labelledby="member-shortcuts-title">
            <MemberSection id="member-shortcuts-title" title={copy.quickTitle} tag={copy.quickTag}>
              <MemberShortcuts />
            </MemberSection>
          </section>

          <section aria-labelledby="member-recent-title">
            <MemberSection id="member-recent-title" title={copy.recentTitle} tag={copy.recentTag}>
              {data.degraded.includes("recentRepairs") ? (
                <SectionError onRetry={() => void load()} />
              ) : (
                <MemberRecentRepairs
                  items={data.recentRepairs}
                  moreHref="/member/repairs"
                  moreLabel={copy.recentMore}
                />
              )}
            </MemberSection>
          </section>

          <section aria-labelledby="member-upcoming-title">
            <MemberSection id="member-upcoming-title" title={copy.upcomingTitle} tag={copy.upcomingTag}>
              <MemberUpcoming
                notifications={data.notifications}
                favorites={data.favorites}
                ranking={data.ranking}
              />
            </MemberSection>
          </section>
        </div>
      ) : null}
    </>
  );
}

/**
 * 局部错误占位：仅在**单个区块**加载失败时替换该区块内容。
 * 不整页跳错误页，也不把失败渲染成「暂时没有数据」（两者语义不同）。
 */
function SectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="member-section__error" role="status">
      <p>{memberCopy.common.sectionLoadError}</p>
      <Button onClick={onRetry}>{memberCopy.common.reload}</Button>
    </div>
  );
}
