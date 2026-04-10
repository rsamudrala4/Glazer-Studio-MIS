"use server";

import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMissingColumnError } from "@/lib/db-compat";
import { requireAdminOrganizationProfile, requireProfile } from "@/lib/auth";
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
  const profile = await requireAdminOrganizationProfile();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const inviteType = (String(formData.get("inviteType") ?? "employee") ||
    "employee") as "admin" | "employee" | "summary_viewer";
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
    if (inviteType !== "employee") {
      redirect(
        "/settings?error=Admin%20and%20viewer%20invites%20need%20the%20latest%20Supabase%20schema.%20Please%20re-run%20schema.sql%20first."
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

export async function updateEmployeeAccessAction(formData: FormData) {
  const profile = await requireAdminOrganizationProfile();
  const supabase = createSupabaseServerClient();
  const memberId = String(formData.get("memberId") ?? "").trim();
  const accessLevel = String(formData.get("accessLevel") ?? "employee").trim() as
    | "admin"
    | "employee";
  const reportingManagerId = String(formData.get("reportingManagerId") ?? "").trim() || null;
  const assignerIds = formData
    .getAll("assignerIds")
    .map((value) => String(value))
    .filter(Boolean);

  if (!memberId) {
    redirect("/settings?error=Employee%20is%20required");
  }

  const { data: members, error: membersError } = await supabase
    .from("profiles")
    .select("id, organization_id, access_level")
    .eq("organization_id", profile.organization_id);

  if (membersError) {
    redirect(`/settings?error=${encodeURIComponent(membersError.message)}`);
  }

  const orgMembers = members ?? [];
  const targetMember = orgMembers.find((member) => member.id === memberId);

  if (!targetMember) {
    redirect("/settings?error=Employee%20not%20found");
  }

  if (reportingManagerId && reportingManagerId === memberId) {
    redirect("/settings?error=An%20employee%20cannot%20report%20to%20themselves");
  }

  if (targetMember.id === profile.id && accessLevel !== "admin") {
    const adminCount = orgMembers.filter((member) => member.access_level === "admin").length;
    if (adminCount <= 1) {
      redirect("/settings?error=At%20least%20one%20admin%20must%20remain%20in%20the%20organization");
    }
  }

  if (accessLevel === "employee" && reportingManagerId) {
    const manager = orgMembers.find((member) => member.id === reportingManagerId);
    if (!manager || manager.access_level === "summary_viewer") {
      redirect("/settings?error=Reporting%20manager%20must%20be%20a%20working%20member");
    }
  }

  const invalidAssigner = assignerIds.find((assignerId) => {
    const assigner = orgMembers.find((member) => member.id === assignerId);
    return !assigner || assigner.access_level === "summary_viewer";
  });

  if (invalidAssigner) {
    redirect("/settings?error=Allowed%20assigners%20must%20be%20working%20members");
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      access_level: accessLevel,
      reporting_manager_id: accessLevel === "employee" ? reportingManagerId : null
    })
    .eq("id", memberId)
    .eq("organization_id", profile.organization_id);

  if (updateError) {
    redirect(`/settings?error=${encodeURIComponent(updateError.message)}`);
  }

  const { error: deleteAssignerError } = await supabase
    .from("employee_task_assigners")
    .delete()
    .eq("organization_id", profile.organization_id)
    .eq("employee_id", memberId);

  if (deleteAssignerError) {
    redirect(`/settings?error=${encodeURIComponent(deleteAssignerError.message)}`);
  }

  if (accessLevel === "employee" && assignerIds.length > 0) {
    const rows = assignerIds.map((assignerId) => ({
      organization_id: profile.organization_id,
      employee_id: memberId,
      assigner_id: assignerId
    }));

    const { error: insertAssignerError } = await supabase
      .from("employee_task_assigners")
      .insert(rows);

    if (insertAssignerError) {
      redirect(`/settings?error=${encodeURIComponent(insertAssignerError.message)}`);
    }
  }

  revalidatePath("/settings");
  revalidatePath("/tasks");
  redirect("/settings?success=employee-updated");
}
