import { redirect } from "next/navigation";
import { getCurrentProfile, getSessionUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile();

  if (!profile?.organization_id) {
    redirect("/settings?setup=organization");
  }

  if ((profile.access_level ?? "member") === "summary_viewer") {
    redirect("/team-summary");
  }

  redirect("/dashboard");
}
