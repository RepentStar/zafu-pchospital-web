import { skillRepository } from "@/features/skills/skill-repository";
import type { SkillView } from "@/types/contracts";

/**
 * 技能读取服务（M3 任务书 §9、§10.3）。
 *
 * M3 只开放只读能力：成员读取可关联的启用标签。
 * 技能库的增删改与 `/admin/skills` 属于 M6，不在 M3 实现。
 */
export const skillService = {
  /** `GET /api/v1/skills` —— 启用中、未软删除的技能，按 sortOrder 升序。 */
  async listActive(): Promise<SkillView[]> {
    const rows = await skillRepository.listActive();
    return rows.map(toSkillView);
  },
};

export function toSkillView(row: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}): SkillView {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  };
}
