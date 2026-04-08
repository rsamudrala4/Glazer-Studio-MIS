"use server";

import { redirect } from "next/navigation";
import { isMissingColumnError } from "@/lib/db-compat";
import { getCurrentProfile } from "@/lib/auth";
import { getFriendlyActionError } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getInvitationByToken } from "@/lib/data";

function errorRedirect(path: string, message: string) {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

async function redirectToHomeForCurrentUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

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

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      errorRedirect("/login", error.message);
    }
  } catch (error) {
    errorRedirect("/login", getFriendlyActionError(error));
  }

  await redirectToHomeForCurrentUser();
}

export async function signupAction(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const organizationName = String(formData.get("organizationName") ?? "").trim();
  const inviteToken = String(formData.get("inviteToken") ?? "").trim();

  if (!fullName || !email || !password) {
    errorRedirect("/signup", "Full name, email, and password are required.");
  }

  try {
    const supabase = createSupabaseServerClient();
    const invitation = inviteToken ? await getInvitationByToken(inviteToken) : null;

    if (
      inviteToken &&
      (!invitation || invitation.accepted_at || invitation.expires_at < new Date().toISOString())
    ) {
      errorRedirect("/signup", "That invitation is invalid or expired.");
    }

    if (!inviteToken && !organizationName) {
      errorRedirect("/signup", "Organization name is required when creating a new workspace.");
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (signUpError || !signUpData.user) {
      errorRedirect("/signup", signUpError?.message ?? "Could not create account.");
    }
    const userId = signUpData.user?.id;
    if (!userId) {
      errorRedirect("/signup", "Could not create account.");
    }

    // Ensure the new user has an authenticated session before we touch RLS-protected tables.
    const {
      data: signInData,
      error: signInError
    } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      errorRedirect(
        "/signup",
        "Account created, but automatic sign-in failed. Disable email confirmation in Supabase for this MVP or sign in manually after confirming your email."
      );
    }

    if (!signInData.session) {
      errorRedirect(
        "/signup",
        "Account created, but no active session was returned. Please sign in once and continue setup."
      );
    }

    let organizationId = invitation?.organization_id ?? null;
    let accessLevel: "member" | "summary_viewer" = "member";

    if (invitation) {
      const { data: acceptedInvitation, error: acceptInvitationError } = await supabase.rpc(
        "accept_invitation_for_current_user",
        {
          invite_token: inviteToken,
          invite_email: email
        }
      );

      const acceptedOrgId = Array.isArray(acceptedInvitation)
        ? acceptedInvitation[0]?.organization_id
        : acceptedInvitation?.organization_id;
      const acceptedAccessLevel = Array.isArray(acceptedInvitation)
        ? acceptedInvitation[0]?.access_level
        : acceptedInvitation?.access_level;

      if (acceptInvitationError || !acceptedOrgId) {
        errorRedirect(
          "/signup",
          acceptInvitationError?.message ??
            "Could not join the invited organization. Please verify that the invite email matches the account email."
        );
      }

      organizationId = acceptedOrgId;
      accessLevel = (acceptedAccessLevel ?? "member") as "member" | "summary_viewer";
    } else {
      const { data: createdOrganizationId, error: organizationError } = await supabase.rpc(
        "create_organization_for_current_user",
        {
          org_name: organizationName
        }
      );

      if (organizationError || !createdOrganizationId) {
        errorRedirect(
          "/signup",
          organizationError?.message ?? "Could not create organization."
        );
      }

      organizationId = createdOrganizationId;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        email,
        access_level: accessLevel,
        organization_id: organizationId
      })
      .eq("id", userId);

    if (isMissingColumnError(profileError, "profiles.access_level")) {
      const { error: fallbackProfileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          email,
          organization_id: organizationId
        })
        .eq("id", userId);

      if (fallbackProfileError) {
        errorRedirect("/signup", fallbackProfileError.message);
      }
    } else if (profileError) {
      errorRedirect("/signup", profileError.message);
    }

  } catch (error) {
    errorRedirect("/signup", getFriendlyActionError(error));
  }

  await redirectToHomeForCurrentUser();
}

export async function signOutAction() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
