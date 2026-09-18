import type { Metadata } from "next";

import { MemberProfileView } from "@/components/member/MemberProfileView";
import { Section } from "@/components/ui/Section";
import { memberCopy } from "@/config/member";
import { requireActiveMemberPage } from "@/lib/auth/member-page";

export const metadata: Metadata = { title: memberCopy.profile.title };

/** `/member/profile` —— 个人资料页（自己）。 */
export default async function MemberProfilePage() {
  const principal = await requireActiveMemberPage();

  return (
    <Section variant="page-head" className="member-workspace" labelledBy="member-profile-title">
      <MemberProfileView
        initialDisplayName={principal.displayName ?? memberCopy.common.fallbackName}
      />
    </Section>
  );
}
