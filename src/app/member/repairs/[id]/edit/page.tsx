import type { Metadata } from "next";
import { PageHead } from "@/components/layout/PageHead";
import { RepairEditor } from "@/components/repairs/RepairEditor";
import { Section } from "@/components/ui/Section";
import { repairCopy, repairResultLabels } from "@/config/repairs";
import { requireActiveMemberPage } from "@/lib/auth/member-page";
export const metadata: Metadata = { title: "编辑维修记录" };
export default async function EditRepairPage({ params }: { params: Promise<{ id: string }> }) {
  await requireActiveMemberPage();
  const { id } = await params;
  return (
    <>
      <PageHead
        id="edit-repair-title"
        index="06"
        label={repairCopy.edit.label}
        title={repairCopy.edit.title}
        lead={repairCopy.edit.lead}
      />
      <Section labelledBy="edit-repair-form">
        <h2 className="sr-only" id="edit-repair-form">
          维修记录表单
        </h2>
        <RepairEditor recordId={id} resultLabels={repairResultLabels} />
      </Section>
    </>
  );
}
