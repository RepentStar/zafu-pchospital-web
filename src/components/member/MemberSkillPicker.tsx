"use client";

import { memberCopy } from "@/config/member";
import type { SkillView } from "@/types/contracts";

/**
 * MemberSkillPicker —— 技能标签选择器
 *
 * 用原生 `<input type="checkbox">` + `<label>`：键盘可聚焦、空格可切换、
 * 焦点可见由 CSS 的 `:has(input:focus-visible)` 提供（不靠 JS 模拟）。
 *
 * 取消选择只是把技能从集合里移除 —— 服务端对 `UserSkill` 做软删除，
 * 历史关联不会被物理删除，重新选择即可恢复，因此这里不做「已移除不可再选」的限制。
 *
 * 达到上限后未选中的项会被禁用（而不是静默忽略点击），并给出文案说明。
 */

export type MemberSkillPickerProps = {
  /** 关联的标题 id，用于 fieldset 的 aria-labelledby */
  labelledBy: string;
  availableSkills: readonly SkillView[];
  selectedIds: readonly string[];
  limit: number;
  disabled?: boolean;
  onChange: (nextIds: string[]) => void;
};

/**
 * 选择器必须同时呈现可选的启用技能和成员已经持有的历史技能。
 * `/api/v1/skills` 按契约只返回启用项，因此已停用项要从受保护的个人资料中补回；
 * 否则它们会继续占用上限，却没有取消入口。
 */
export function mergeSkillOptions(
  availableSkills: readonly SkillView[],
  selectedSkills: readonly SkillView[],
): SkillView[] {
  const byId = new Map(selectedSkills.map((skill) => [skill.id, skill]));
  for (const skill of availableSkills) byId.set(skill.id, skill);
  return [...byId.values()].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "zh-Hans-CN"),
  );
}

export function MemberSkillPicker({
  labelledBy,
  availableSkills,
  selectedIds,
  limit,
  disabled = false,
  onChange,
}: MemberSkillPickerProps) {
  const atLimit = selectedIds.length >= limit;

  function toggle(skillId: string, checked: boolean) {
    if (checked) {
      if (atLimit) return;
      onChange([...selectedIds, skillId]);
      return;
    }
    onChange(selectedIds.filter((id) => id !== skillId));
  }

  if (!availableSkills.length) {
    return <p className="member-section__note">{memberCopy.profile.skillsUnavailable}</p>;
  }

  return (
    <>
      <fieldset className="member-skill-picker" aria-labelledby={labelledBy} disabled={disabled}>
        <legend className="sr-only">{memberCopy.profile.skillsTitle}</legend>
        {availableSkills.map((skill) => {
          const checked = selectedIds.includes(skill.id);
          const optionDisabled = atLimit && !checked;
          return (
            <label className="member-skill-option" key={skill.id}>
              <input
                type="checkbox"
                value={skill.id}
                checked={checked}
                disabled={optionDisabled}
                onChange={(event) => toggle(skill.id, event.target.checked)}
              />
              <span>{skill.name}</span>
              {!skill.isActive ? (
                <small className="member-skill-option__status">
                  {memberCopy.profile.skillInactiveSelected}
                </small>
              ) : null}
            </label>
          );
        })}
      </fieldset>
      {atLimit ? (
        <p className="member-section__note" role="status" aria-live="polite">
          {memberCopy.profile.skillsLimitReached.replace("{limit}", String(limit))}
        </p>
      ) : null}
    </>
  );
}
