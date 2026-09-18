import { memberCopy } from "@/config/member";
import type { DeferredModule } from "@/types/contracts";

/**
 * MemberUpcoming —— 后续模块接入位（M4 通知/收藏、M5 排行）
 *
 * 契约中 `DeferredModule` 恒为 `{ available: false, module }`。
 * 因此这里**只渲染中性说明**：
 * - 不显示任何数字（哪怕是 0）、不显示红点、不显示「查看」按钮；
 * - 明确写出「尚未接入」，避免用户误以为功能已存在只是没数据；
 * - **不把 `module`（M4/M5）渲染给终端用户** —— 那是内部里程碑编号，对用户无意义。
 *
 * 若某模块的 `available` 未来变为 true，本组件会忽略它 —— 接口形状不同，
 * 那时的渲染需求（真实列表/角标）应由对应模块自行实现，不应在这里猜。
 */

export type MemberUpcomingProps = {
  notifications: DeferredModule;
  favorites: DeferredModule;
  ranking: DeferredModule;
};

export type UpcomingEntry = {
  /**
   * React key。**必须是「能力」标识，不能取 `module`** ——
   * M4 同时提供「通知」与「收藏」两项，两者的 `module` 都是 `"M4"`，
   * 用它当 key 会产生重复 key，React 会报错并可能重复/漏渲染子节点。
   */
  key: "notifications" | "favorites" | "ranking";
  /** 对应的契约字段值，保留以便未来按模块区分渲染。 */
  module: DeferredModule;
  name: string;
};

/**
 * 构造三个接入位条目。
 *
 * 抽成纯函数是为了让「key 必须唯一」这一不变量**可以被直接断言**：
 * 组件本身的渲染很难在 `node:test` 里覆盖（本仓库的测试不渲染 JSX），
 * 而这个不变量恰恰是唯一出过错的地方。
 */
export function buildUpcomingEntries(props: MemberUpcomingProps): UpcomingEntry[] {
  const copy = memberCopy.dashboard;
  return [
    { key: "notifications", module: props.notifications, name: copy.upcomingNotifications },
    { key: "favorites", module: props.favorites, name: copy.upcomingFavorites },
    { key: "ranking", module: props.ranking, name: copy.upcomingRanking },
  ];
}

export function MemberUpcoming(props: MemberUpcomingProps) {
  const copy = memberCopy.dashboard;
  const entries = buildUpcomingEntries(props);

  return (
    <div className="member-upcoming">
      <ul className="member-upcoming__list">
        {entries.map((item) => (
          <li className="member-upcoming__item" key={item.key}>
            <span className="member-upcoming__name">{item.name}</span>
            <span className="member-upcoming__state">{memberCopy.common.unsupported}</span>
          </li>
        ))}
      </ul>
      <p className="member-section__foot">{copy.upcomingNote}</p>
    </div>
  );
}
