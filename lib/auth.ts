import { redirect } from "next/navigation";
import { cache } from "react";
import { isMissingColumnError } from "@/lib/db-compat";
import { getFriendlyActionError } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function ensureProfileRecord() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select("id, organization_id, full_name, email, access_level, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfileError && !isMissingColumnError(existingProfileError, "profiles.access_level")) {
    throw existingProfileError;
  }

  if (isMissingColumnError(existingProfileError, "profiles.access_level")) {
    const { data: fallbackProfile, error: fallbackProfileError } = await supabase
      .from("profiles")
      .select("id, organization_id, full_name, email, created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (fallbackProfileError) {
      throw fallbackProfileError;
    }

    if (fallbackProfile) {
      return {
        ...fallbackProfile,
        access_level: "member" as const
      };
    }
  }

  if (existingProfile) {
    return existingProfile;
  }

  const fullName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const email = user.email ?? "";

  const { error: insertError } = await supabase.from("profiles").insert({
    id: user.id,
    email,
    full_name: fullName
  });

  if (insertError) {
    throw insertError;
  }

  const { data: createdProfile, error: createdProfileError } = await supabase
    .from("profiles")
    .select("id, organization_id, full_name, email, access_level, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (createdProfileError && !isMissingColumnError(createdProfileError, "profiles.access_level")) {
    throw createdProfileError;
  }

  if (isMissingColumnError(createdProfileError, "profiles.access_level")) {
    const { data: fallbackCreatedProfile, error: fallbackCreatedProfileError } = await supabase
      .from("profiles")
      .select("id, organization_id, full_name, email, created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (fallbackCreatedProfileError) {
      throw fallbackCreatedProfileError;
    }

    return fallbackCreatedProfile
      ? {
          ...fallbackCreatedProfile,
          access_level: "member" as const
        }
      : null;
  }

  return createdProfile;
}

export const getSessionUser = cache(async () => {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    return user;
  } catch (error) {
    const message = getFriendlyActionError(error);
    if (
      message.includes("Supabase is not configured") ||
      message.includes("Could not reach Supabase")
    ) {
      return null;
    }

    throw error;
  }
});

export const getCurrentProfile = cache(async () => {
  const user = await getSessionUser();
  if (!user) return null;

  try {
    return await ensureProfileRecord();
  } catch (error) {
    const message = getFriendlyActionError(error);
    if (
      message.includes("Supabase is not configured") ||
      message.includes("Could not reach Supabase")
    ) {
      return null;
    }

    throw error;
  }
});

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireProfile() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/signup");
  return profile;
}

export async function requireOrganizationProfile() {
  const profile = await requireProfile();
  if (!profile.organization_id) redirect("/settings?setup=organization");
  return profile;
}

export async function requireMemberOrganizationProfile() {
  const profile = await requireOrganizationProfile();
  if ((profile.access_level ?? "member") !== "member") {
    redirect("/team-summary");
  }
  return profile;
}

export async function requireSummaryAccessProfile() {
  const profile = await requireOrganizationProfile();
  return profile;
}
