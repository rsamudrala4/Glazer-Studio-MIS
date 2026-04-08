import { createInvitationAction, createOrganizationAction } from "@/app/actions/organizations";
import { PageHeader } from "@/components/page-header";
import { ProtectedPage } from "@/components/protected-page";
import { SubmitButton } from "@/components/submit-button";
import { requireMemberOrganizationProfile, requireProfile } from "@/lib/auth";
import { getActiveInvitations, getOrganizationContext, getOrganizationMembers } from "@/lib/data";

export default async function SettingsPage({
  searchParams
}: {
  searchParams: { error?: string; invite?: string; success?: string; setup?: string };
}) {
  const profile = await requireProfile();
  const context = await getOrganizationContext(profile.id);

  if (!context.organization) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
        <div className="card w-full px-6 py-7">
          <PageHeader
            title="Set up your organization"
            description="Create the workspace your team will use. After that, you can invite employees from the settings page."
          />

          {searchParams.error ? (
            <p className="mt-5 rounded-2xl border border-rose/20 bg-rose/10 px-4 py-3 text-sm text-rose">
              {searchParams.error}
            </p>
          ) : null}
          {searchParams.success === "organization-created" ? (
            <p className="mt-5 rounded-2xl border border-pine/20 bg-pine/10 px-4 py-3 text-sm text-pine">
              Organization created successfully.
            </p>
          ) : null}

          <form action={createOrganizationAction} className="mt-6 max-w-xl space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Organization name</label>
              <input
                name="organizationName"
                placeholder="Acme Operations"
                required
                defaultValue=""
              />
            </div>
            <SubmitButton>Create organization</SubmitButton>
          </form>
        </div>
      </main>
    );
  }

  await requireMemberOrganizationProfile();

  const [members, invitations] = await Promise.all([
    getOrganizationMembers(context.organization.id, { includeViewers: true }),
    getActiveInvitations(context.organization.id)
  ]);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return (
    <ProtectedPage currentPath="/settings">
      <div className="space-y-6">
        <PageHeader
          title="Organization Settings"
          description="Manage your team membership and create invite links for employees or summary-only viewers."
        />

        {searchParams.error ? (
          <p className="rounded-2xl border border-rose/20 bg-rose/10 px-4 py-3 text-sm text-rose">
            {searchParams.error}
          </p>
        ) : null}
        {searchParams.invite || searchParams.success === "invite-created" ? (
          <p className="rounded-2xl border border-pine/20 bg-pine/10 px-4 py-3 text-sm text-pine">
            Invite created successfully.
          </p>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <div className="card px-5 py-5">
              <h2 className="section-title">Workspace details</h2>
              <dl className="mt-4 space-y-3 text-sm text-white/65">
                <div>
                  <dt className="font-medium text-white">Organization</dt>
                  <dd>{context.organization.name}</dd>
                </div>
                <div>
                  <dt className="font-medium text-white">Current user</dt>
                  <dd>{profile.full_name || profile.email}</dd>
                </div>
                <div>
                  <dt className="font-medium text-white">Member count</dt>
                  <dd>{members.length}</dd>
                </div>
              </dl>
            </div>

            <div className="card px-5 py-5">
              <h2 className="section-title">Create invite link</h2>
              <p className="mt-1 text-sm text-white/60">
                Create a secure signup link for a teammate. Employee access joins the full workspace. Summary viewer only can open the team summary page and nothing else.
              </p>
              <form action={createInvitationAction} className="mt-4 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">Invite email</label>
                  <input name="email" type="email" placeholder="employee@company.com" required />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">Invite type</label>
                  <select name="inviteType" defaultValue="member">
                    <option value="member">Employee access</option>
                    <option value="summary_viewer">Summary viewer only</option>
                  </select>
                </div>
                <SubmitButton>Create invite link</SubmitButton>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card px-5 py-5">
              <h2 className="section-title">Employees</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-white/50">
                    <tr>
                      <th className="pb-3 pr-4 font-medium">Name</th>
                      <th className="pb-3 pr-4 font-medium">Email</th>
                      <th className="pb-3 pr-4 font-medium">Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id} className="border-t border-sand/70">
                        <td className="py-3 pr-4 font-medium text-white">
                          {member.full_name || "Unnamed user"}
                        </td>
                        <td className="py-3 pr-4 text-white/62">{member.email}</td>
                        <td className="py-3 pr-4 text-white/62">
                          {member.access_level === "summary_viewer"
                            ? "Summary viewer"
                            : "Employee"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card px-5 py-5">
              <h2 className="section-title">Active invite links</h2>
              <div className="mt-4 space-y-3">
                {invitations.length === 0 ? (
                  <p className="text-sm text-white/55">No active invites yet.</p>
                ) : (
                  invitations.map((invite) => {
                    const inviteUrl = `${baseUrl}/signup?invite=${invite.token}`;
                    return (
                      <div key={invite.id} className="rounded-2xl border border-sand bg-[#131a22] px-4 py-4">
                        <p className="font-medium text-white">{invite.email}</p>
                        <p className="mt-1 text-xs text-pine">
                          {invite.invite_type === "summary_viewer"
                            ? "Summary viewer"
                            : "Employee access"}
                        </p>
                        <p className="mt-2 break-all text-sm text-white/60">{inviteUrl}</p>
                        <p className="mt-2 text-xs text-white/45">
                          Expires: {new Date(invite.expires_at).toLocaleString("en-IN")}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </ProtectedPage>
  );
}
