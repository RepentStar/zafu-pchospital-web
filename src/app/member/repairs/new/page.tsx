import type { Metadata } from "next";
import { PageHead } from "@/components/layout/PageHead";
import { CreateRepairForm } from "@/components/repairs/CreateRepairForm";
import { Section } from "@/components/ui/Section";
import { repairCopy } from "@/config/repairs";
import { requireActiveMemberPage } from "@/lib/auth/member-page";
export const metadata: Metadata = { title: "新建维修记录" };
export default async function NewRepairPage() {
  await requireActiveMemberPage();
  return (
    <div className="repair-page">
      <PageHead
        id="new-repair-title"
        index="08"
        label={repairCopy.create.label}
        title={repairCopy.create.title}
        lead={repairCopy.create.lead}
      />
      <Section labelledBy="new-repair-panel">
        <h2 className="sr-only" id="new-repair-panel">
          维修记录表单
        </h2>
        <CreateRepairForm />
      </Section>
    </div>
  );
}
