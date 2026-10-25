import { repairActivitiesPage } from "@/config/repair-activities";

/** 页面常驻提醒、报名前确认与报名成功提醒共用同一份须知。 */
export function RepairActivityPrecautions() {
  return (
    <ol className="admin-plain-list">
      {repairActivitiesPage.detail.consent.clauses.map((clause) => (
        <li key={clause}>{clause}</li>
      ))}
    </ol>
  );
}
