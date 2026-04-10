import Link from "next/link";
import { redirect } from "next/navigation";
import { signupAction } from "@/app/actions/auth";
import { AuthCard } from "@/components/auth-card";
import { SubmitButton } from "@/components/submit-button";
import { getCurrentProfile, getSessionUser } from "@/lib/auth";
import { getInvitationByToken } from "@/lib/data";
import { getSupabaseConfigStatus } from "@/lib/env";

export default async function SignupPage({
  searchParams
}: {
  searchParams: { error?: string; invite?: string };
}) {
  const user = await getSessionUser();
  if (user) {
    const profile = await getCurrentProfile();
    if (!profile?.organization_id) redirect("/settings?setup=organization");
    if ((profile.access_level ?? "employee") === "summary_viewer") redirect("/team-summary");
    redirect("/dashboard");
  }

  const inviteToken = searchParams.invite ?? "";
  const invitation = inviteToken ? await getInvitationByToken(inviteToken) : null;
  const organizationName = invitation?.organization_name ?? null;
  const supabaseConfig = getSupabaseConfigStatus();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(98,226,155,0.10),_transparent_24%),linear-gradient(180deg,_#0a0f14_0%,_#0d131a_45%,_#090d12_100%)] px-4 py-10">
      <AuthCard
        title="Create your account"
        description={
          organizationName
            ? invitation?.invite_type === "summary_viewer"
              ? `Join ${organizationName} with summary-only access.`
              : invitation?.invite_type === "admin"
                ? `Join ${organizationName} with admin access.`
              : `Join ${organizationName} and start collaborating on tasks.`
            : "Create the first account and set up your organization."
        }
        footer={
          <p>
            Already have an account? <Link href="/login">Sign in</Link>.
          </p>
        }
      >
        <form action={signupAction} className="space-y-4">
          {!supabaseConfig.isConfigured ? (
            <p className="rounded-xl bg-amber/15 px-3 py-2 text-sm text-amber">
              Supabase is not configured. Replace the sample values in `.env.local` with your real
              Supabase project URL and anon key, then restart the server.
            </p>
          ) : null}
          <input type="hidden" name="inviteToken" value={inviteToken} />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Full name</label>
            <input name="fullName" type="text" placeholder="Priya Sharma" required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Email</label>
            <input name="email" type="email" placeholder="name@company.com" required />
          </div>
          {!organizationName ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                Organization name
              </label>
              <input
                name="organizationName"
                type="text"
                placeholder="Acme Operations"
                required
              />
            </div>
          ) : (
            <div className="rounded-xl border border-sand bg-mist/70 px-3 py-2.5 text-sm text-ink/75">
              Joining organization: <span className="font-semibold text-ink">{organizationName}</span>
            </div>
          )}
          {invitation?.invite_type === "summary_viewer" ? (
            <div className="rounded-xl border border-pine/20 bg-pine/10 px-3 py-2.5 text-sm text-pine">
              This invite gives summary-only access. Tasks, dashboard, and settings will stay hidden.
            </div>
          ) : null}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Password</label>
            <input
              name="password"
              type="password"
              placeholder="Create a secure password"
              required
            />
          </div>
          {searchParams.error ? (
            <p className="rounded-xl bg-rose/10 px-3 py-2 text-sm text-rose">
              {searchParams.error}
            </p>
          ) : null}
          <SubmitButton className="w-full" pendingLabel="Creating account...">
            Create account
          </SubmitButton>
        </form>
      </AuthCard>
    </main>
  );
}
