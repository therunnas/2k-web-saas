import { ProfileSettings } from "@/components/account/ProfileSettings";
import { AdminShell } from "@/components/layout/AdminShell";
import { requireCompletedSetup } from "@/lib/guards";

export default async function AccountProfilePage() {
  await requireCompletedSetup();

  return (
    <AdminShell>
      <ProfileSettings />
    </AdminShell>
  );
}