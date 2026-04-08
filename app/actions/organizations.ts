"use server";

import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMissingColumnError } from "@/lib/db-compat";
import { requireMemberOrganizationProfile, requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createOrganizationAction(formData: FormData) {
  await requireProfile();
  const organizationName = String(formData.get("organizationName") ?? "").trim();

  if (!organizationName) {
    redirect("/settings?error=Organization%20name%20is%20required");
  }

  const supabase = createSupabaseServerClient();

  const { data: organizationId, error } = await supabase.rpc(
    "create_organization_for_current_user",
    {
      org_name: organizationName
    }
  );

  if (error || !organizationId) {
    redirect(`/settings?error=${encodeURIComponent(error?.message ?? "Could not create organization")}`);
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  redirect("/dashboard?success=organization-created");
}

export async function createInvitationAction(formData: FormData) {
  const profile = await requireMemberOrganizationProfile();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const inviteType = (String(formData.get("inviteType") ?? "member") ||
    "member") as "member" | "summary_viewer";
  if (!email) redirect("/settings?error=Invite%20email%20is%20required");

  const supabase = createSupabaseServerClient();
  const token = randomUUID();

  const { error } = await supabase.from("organization_invitations").insert({
    organization_id: profile.organization_id,
    email,
    invite_type: inviteType,
    invited_by: profile.id,
    token,
    expires_at: addDays(new Date(), 14).toISOString()
  });

  if (isMissingColumnError(error, "invite_type")) {
    if (inviteType === "summary_viewer") {
      redirect(
        "/settings?error=Viewer%20invites%20need%20the%20latest%20Supabase%20schema.%20Please%20re-run%20schema.sql%20first."
      );
    }

    const { error: fallbackError } = await supabase.from("organization_invitations").insert({
      organization_id: profile.organization_id,
      email,
      invited_by: profile.id,
      token,
      expires_at: addDays(new Date(), 14).toISOString()
    });

    if (fallbackError) {
      redirect(`/settings?error=${encodeURIComponent(fallbackError.message)}`);
    }
  } else if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings");
  redirect("/settings?success=invite-created");
}
