import { AppShell } from "@/components/shell";
import { requireAdminPage } from "@/lib/auth";

export default async function DashboardLayout({ children }) {
  const { profile } = await requireAdminPage();
  return <AppShell profile={profile}>{children}</AppShell>;
}
