import Link from "next/link";

import { memberCopy } from "@/config/member";
import type { MemberWorkQueue as MemberWorkQueueData } from "@/types/contracts";

/**
 * MemberWorkQueueView —— 待处理维修（草稿 / 待审核 / 已退回）
 *
 * 三项计数直接来自 `MemberWorkQueue`，每项链接到 `/member/repairs` 并带上对应的
 * `status` 查询参数 —— 复用 M2 已有的筛选能力，不新增列表接口、不复制列表逻辑。
 *
 * 计数为 0 时仍是有效数字（不是"待配置"）：这三项的查询口径恒定，与学期配置无关。
 * 仅当存在积压时给左边框加强调色；数字本身已表达信息，颜色不是唯一线索。
 */

export type MemberWorkQueueProps = { queue: MemberWorkQueueData };

export function MemberWorkQueueView({ queue }: MemberWorkQueueProps) {
  const copy = memberCopy.dashboard;
  const items = [
    { key: "DRAFT" as const, label: copy.queueDraft, count: queue.draftCount },
    { key: "PENDING" as const, label: copy.queuePending, count: queue.pendingCount },
    { key: "REJECTED" as const, label: copy.queueRejected, count: queue.rejectedCount },
  ];
  const allEmpty = items.every((item) => item.count === 0);

  return (
    <div className="member-section">
      {allEmpty ? <p className="member-section__note">{copy.queueEmpty}</p> : null}
      <ul className="member-queue">
        {items.map((item) => (
          <li
            className={`member-queue__item${item.count > 0 ? " member-queue__item--active" : ""}`}
            key={item.key}
          >
            <span className="member-queue__label">{item.label}</span>
            <span className="member-queue__count">
              <Link href={`/member/repairs?status=${item.key}`}>
                {item.count}
                <span className="member-metric__unit">{copy.unitCount}</span>
              </Link>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
