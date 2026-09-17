import { memberCopy } from "@/config/member";

/**
 * MemberSkeleton —— 工作台加载骨架
 *
 * 只负责「指标 + 列表」区域的占位：高度与真实内容量级接近，避免加载完成时布局跳动。
 * 欢迎区不套骨架（它的数据在服务端就已确定），所以失败时也不会整页空白。
 *
 * `role="status"` + `aria-live="polite"` 让辅助技术知道内容正在加载；
 * 骨架条本身 `aria-hidden`，避免读出一串无意义的空元素。
 */

export function MemberSkeleton() {
  return (
    <div className="member-skeleton" role="status" aria-live="polite">
      <span className="sr-only">{memberCopy.common.loading}</span>
      <div className="member-metrics" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <div className="member-metric" key={index}>
            <span className="member-skeleton__bar member-skeleton__bar--sm" />
            <span className="member-skeleton__bar member-skeleton__bar--lg" />
          </div>
        ))}
      </div>
      <div aria-hidden="true">
        <span className="member-skeleton__bar" />
      </div>
      <div aria-hidden="true">
        <span className="member-skeleton__bar" />
      </div>
    </div>
  );
}
