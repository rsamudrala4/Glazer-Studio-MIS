import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import { AuthCard } from "@/components/auth-card";
import { SubmitButton } from "@/components/submit-button";
import { getCurrentProfile, getSessionUser } from "@/lib/auth";
import { getSupabaseConfigStatus } from "@/lib/env";

export default async function LoginPage({
  searchParams
}: {
  searchParams: { error?: string };
}) {
  const user = await getSessionUser();
  if (user) {
    const profile = await getCurrentProfile();
    if (!profile?.organization_id) redirect("/settings?setup=organization");
    if ((profile.access_level ?? "employee") === "summary_viewer") redirect("/team-summary");
    redirect("/dashboard");
  }
  const supabaseConfig = getSupabaseConfigStatus();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(98,226,155,0.10),_transparent_24%),linear-gradient(180deg,_#0a0f14_0%,_#0d131a_45%,_#090d12_100%)] px-4 py-10">
      <AuthCard
        title="Welcome back"
        description="Sign in to manage tasks, review the team’s daily work, and keep assignments moving."
        footer={
          <p>
            Need an account? <Link href="/signup">Create one here</Link>.
          </p>
        }
      >
        <form action={loginAction} className="space-y-4">
          {!supabaseConfig.isConfigured ? (
            <p className="rounded-xl bg-amber/15 px-3 py-2 text-sm text-amber">
              Supabase is not configured. Update `.env.local` with your real project URL and anon
              key, then restart the server.
            </p>
          ) : null}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Email</label>
            <input name="email" type="email" placeholder="name@company.com" required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Password</label>
            <input name="password" type="password" placeholder="Your password" required />
          </div>
          {searchParams.error ? (
            <p className="rounded-xl bg-rose/10 px-3 py-2 text-sm text-rose">
              {searchParams.error}
            </p>
          ) : null}
          <SubmitButton
            className="w-full"
            pendingLabel="Signing in..."
          >
            Sign in
          </SubmitButton>
        </form>
      </AuthCard>
    </main>
  );
}
