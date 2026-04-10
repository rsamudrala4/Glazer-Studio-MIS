import {
  createInvitationAction,
  createOrganizationAction,
  updateEmployeeAccessAction
} from "@/app/actions/organizations";
import { PageHeader } from "@/components/page-header";
import { ProtectedPage } from "@/components/protected-page";
import { SubmitButton } from "@/components/submit-button";
import { requireAdminOrganizationProfile, requireProfile } from "@/lib/auth";
import {
  getActiveInvitations,
  getEmployeeTaskAssignerRecords,
  getOrganizationContext,
  getOrganizationMembers
} from "@/lib/data";

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

  await requireAdminOrganizationProfile();

  const [members, invitations, assignerLinks] = await Promise.all([
    getOrganizationMembers(context.organization.id, { includeViewers: true }),
    getActiveInvitations(context.organization.id),
    getEmployeeTaskAssignerRecords(context.organization.id)
  ]);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const workingMembers = members.filter((member) => member.access_level !== "summary_viewer");

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
        {searchParams.success === "employee-updated" ? (
          <p className="rounded-2xl border border-pine/20 bg-pine/10 px-4 py-3 text-sm text-pine">
            Employee access updated successfully.
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
                  <select name="inviteType" defaultValue="employee">
                    <option value="employee">Employee access</option>
                    <option value="admin">Admin access</option>
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
              <div className="mt-4 space-y-4">
                {members.map((member) => {
                  if (member.access_level === "summary_viewer") {
                    return (
                      <div key={member.id} className="rounded-2xl border border-sand bg-[#131a22] px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-white">{member.full_name || "Unnamed user"}</p>
                            <p className="mt-1 text-sm text-white/58">{member.email}</p>
                          </div>
                          <span className="rounded-full border border-sand bg-[#0d131a] px-3 py-1 text-xs font-medium text-white/70">
                            Summary viewer
                          </span>
                        </div>
                      </div>
                    );
                  }

                  const memberAssigners = assignerLinks
                    .filter((link) => link.employee_id === member.id)
                    .map((link) => link.assigner_id);

                  return (
                    <form
                      key={member.id}
                      action={updateEmployeeAccessAction}
                      className="rounded-2xl border border-sand bg-[#131a22] px-4 py-4"
                    >
                      <input type="hidden" name="memberId" value={member.id} />
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-medium text-white">{member.full_name || "Unnamed user"}</p>
                          <p className="mt-1 text-sm text-white/58">{member.email}</p>
                        </div>
                        <span className="rounded-full border border-pine/20 bg-pine/10 px-3 py-1 text-xs font-medium text-pine">
                          {member.access_level === "admin" ? "Admin" : "Employee"}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-ink">Role</label>
                          <select name="accessLevel" defaultValue={member.access_level ?? "employee"}>
                            <option value="employee">Employee</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-ink">Reporting manager</label>
                          <select
                            name="reportingManagerId"
                            defaultValue={member.reporting_manager_id ?? ""}
                          >
                            <option value="">No manager</option>
                            {workingMembers
                              .filter((candidate) => candidate.id !== member.id)
                              .map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                  {candidate.full_name || candidate.email}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="mb-2 block text-sm font-medium text-ink">
                          Who can assign tasks to this employee
                        </label>
                        <div className="grid gap-2 md:grid-cols-2">
                          {workingMembers.map((candidate) => (
                            <label
                              key={`${member.id}-${candidate.id}`}
                              className="inline-flex items-center gap-2 rounded-2xl border border-sand bg-[#0d131a] px-3 py-2 text-sm text-white/75"
                            >
                              <input
                                type="checkbox"
                                name="assignerIds"
                                value={candidate.id}
                                defaultChecked={memberAssigners.includes(candidate.id)}
                                className="h-4 w-4 rounded border-sand"
                              />
                              <span>{candidate.full_name || candidate.email}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <SubmitButton pendingLabel="Saving access...">Save employee access</SubmitButton>
                      </div>
                    </form>
                  );
                })}
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
                            : invite.invite_type === "admin"
                              ? "Admin access"
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
