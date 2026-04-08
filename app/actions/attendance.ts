"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMemberOrganizationProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDateStringInTimeZone, getIsoForDateAndTimeInAppZone } from "@/lib/utils";

function bounce(path: string, message: string) {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function normalizeOptionalTime(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized === "null" || normalized === "undefined") {
    return "";
  }
  return normalized;
}

export async function checkInAction() {
  const profile = await requireMemberOrganizationProfile();
  const supabase = createSupabaseServerClient();
  const now = new Date();
  const workDate = getDateStringInTimeZone(now);

  const { data: existingEntry, error: existingError } = await supabase
    .from("attendance_entries")
    .select("id, check_in_at, check_out_at")
    .eq("user_id", profile.id)
    .eq("work_date", workDate)
    .maybeSingle();

  if (existingError) {
    bounce("/dashboard", existingError.message);
  }

  if (existingEntry) {
    bounce("/dashboard", "You have already checked in for today.");
  }

  const { error } = await supabase.from("attendance_entries").insert({
    organization_id: profile.organization_id,
    user_id: profile.id,
    work_date: workDate,
    check_in_at: now.toISOString()
  });

  if (error) {
    bounce("/dashboard", error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/team-summary");
  redirect("/dashboard?success=checked-in");
}

export async function checkOutAction() {
  const profile = await requireMemberOrganizationProfile();
  const supabase = createSupabaseServerClient();
  const now = new Date();
  const workDate = getDateStringInTimeZone(now);

  const { data: existingEntry, error: existingError } = await supabase
    .from("attendance_entries")
    .select("id, check_in_at, check_out_at")
    .eq("user_id", profile.id)
    .eq("work_date", workDate)
    .maybeSingle();

  if (existingError) {
    bounce("/dashboard", existingError.message);
  }

  if (!existingEntry) {
    bounce("/dashboard", "Please check in before checking out.");
  }

  const attendanceEntry = existingEntry!;

  if (attendanceEntry.check_out_at) {
    bounce("/dashboard", "You have already checked out for today.");
  }

  const { error } = await supabase
    .from("attendance_entries")
    .update({
      check_out_at: now.toISOString()
    })
    .eq("id", attendanceEntry.id)
    .eq("user_id", profile.id);

  if (error) {
    bounce("/dashboard", error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/team-summary");
  redirect("/dashboard?success=checked-out");
}

export async function updateAttendanceTimesAction(formData: FormData) {
  const profile = await requireMemberOrganizationProfile();
  const supabase = createSupabaseServerClient();
  const workDate = String(formData.get("workDate") ?? "").trim() || getDateStringInTimeZone();
  const checkInTime = normalizeOptionalTime(formData.get("checkInTime"));
  const checkOutTime = normalizeOptionalTime(formData.get("checkOutTime"));

  if (!checkInTime) {
    bounce("/dashboard", "Check-in time is required.");
  }

  const { data: existingEntry, error: existingError } = await supabase
    .from("attendance_entries")
    .select("id")
    .eq("user_id", profile.id)
    .eq("work_date", workDate)
    .maybeSingle();

  if (existingError) {
    bounce("/dashboard", existingError.message);
  }

  const checkInAt = getIsoForDateAndTimeInAppZone(workDate, checkInTime);
  const checkOutAt = checkOutTime ? getIsoForDateAndTimeInAppZone(workDate, checkOutTime) : null;

  if (checkOutAt && new Date(checkOutAt).getTime() < new Date(checkInAt).getTime()) {
    bounce("/dashboard", "Check-out time cannot be earlier than check-in time.");
  }

  if (!existingEntry) {
    const { error: insertError } = await supabase.from("attendance_entries").insert({
      organization_id: profile.organization_id,
      user_id: profile.id,
      work_date: workDate,
      check_in_at: checkInAt,
      check_out_at: checkOutAt
    });

    if (insertError) {
      bounce("/dashboard", insertError.message);
    }
  } else {
    const { error: updateError } = await supabase
      .from("attendance_entries")
      .update({
        check_in_at: checkInAt,
        check_out_at: checkOutAt
      })
      .eq("id", existingEntry.id)
      .eq("user_id", profile.id);

    if (updateError) {
      bounce("/dashboard", updateError.message);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/team-summary");
  redirect("/dashboard?success=attendance-updated");
}
