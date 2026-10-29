import { notFound } from "next/navigation";

import { AdminFilterPreview } from "@/components/admin-filter-preview/AdminFilterPreview";

export const metadata = {
  title: "后台筛选方案预览",
  robots: { index: false, follow: false },
};

export default function AdminFiltersPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <AdminFilterPreview />;
}
