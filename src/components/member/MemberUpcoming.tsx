import { memberCopy } from "@/config/member";
import type { DeferredModule } from "@/types/contracts";

/**
 * MemberUpcoming —— 后续模块接入位（M4 通知/收藏、M5 排行）
 *
 * 契约中 `DeferredModule` 恒为 `{ available: false, module }`。
 * 因此这里**只渲染中性说明**：
 * - 不显示任何数字（哪怕是 0）、不显示红点、不显示「查看」按钮；
 * - 明确写出「尚未接入」，避免用户误以为功能已存在只是没数据。
 *
 * 若某模块的 `available` 未来变为 true，本组件会忽略它 —— 接口形状不同，
 * 那时的渲染需求（真实列表/角标）应由对应模块自行实现，不应在这里猜。
 */

export type MemberUpcomingProps = {
  notifications: DeferredModule;
  favorites: DeferredModule;
  ranking: DeferredModule;
};

export function MemberUpcoming({ notifications, favorites, ranking }: MemberUpcomingProps) {
  const copy = memberCopy.dashboard;
  const modules: { module: DeferredModule; name: string }[] = [
    { module: notifications, name: copy.upcomingNotifications },
    { module: favorites, name: copy.upcomingFavorites },
    { module: ranking, name: copy.upcomingRanking },
  ];

  return (
    <div className="member-upcoming">
      <ul className="member-upcoming__list">
        {modules.map((item) => (
          <li className="member-upcoming__item" key={item.module.module}>
            <span className="member-upcoming__name">{item.name}</span>
            <span className="member-upcoming__state">{memberCopy.common.unsupported}</span>
          </li>
        ))}
      </ul>
      <p className="member-section__foot">{copy.upcomingNote}</p>
    </div>
  );
}
