import { AppShell } from "@/components/app-shell";
import { getOrganizationContext, getOverdueCount } from "@/lib/data";
import { requireOrganizationProfile } from "@/lib/auth";

type ProtectedPageProps = {
  currentPath: string;
  children: React.ReactNode;
};

export async function ProtectedPage({ currentPath, children }: ProtectedPageProps) {
  const profile = await requireOrganizationProfile();
  const [{ organization }, overdueCount] = await Promise.all([
    getOrganizationContext(profile.id),
    getOverdueCount(profile.id)
  ]);

  return (
    <AppShell
      currentPath={currentPath}
      organizationName={organization?.name ?? "Organization"}
      overdueCount={overdueCount}
      userName={profile.full_name || profile.email}
      accessLevel={(profile.access_level ?? "member") as "member" | "summary_viewer"}
    >
      {children}
    </AppShell>
  );
}
