import { Button } from "@/components/ui/Button";
import { memberCopy } from "@/config/member";

/**
 * MemberShortcuts —— 快捷操作
 *
 * 保留现有 `/member/repairs` 与 `/member/repairs/new` 入口与导航语义，
 * 不新造路由。个人资料页入口指向 `/member/profile`。
 */

export function MemberShortcuts() {
  const copy = memberCopy.dashboard;
  return (
    <div className="member-shortcuts">
      <Button href="/member/repairs/new" variant="solid">
        {copy.quickNew}
      </Button>
      <Button href="/member/repairs">{copy.quickAll}</Button>
      <Button href="/member/profile">{copy.quickProfile}</Button>
    </div>
  );
}
