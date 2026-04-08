"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect";
import { z } from "zod";
import { requireMemberOrganizationProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseWeekdays } from "@/lib/utils";
import { ensureRecurringTasksForOrganization } from "@/lib/data";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  assignedTo: z.string().uuid("Assigned user is required"),
  dueDate: z.string().min(1, "Due date is required"),
  dueTime: z.string().optional()
});

const recurringTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  assignedTo: z.string().uuid("Assigned user is required"),
  dueTime: z.string().optional(),
  startDate: z.string().min(1, "Start date is required")
});

function normalizeOptionalTime(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized === "null" || normalized === "undefined") {
    return undefined;
  }
  return normalized;
}

function toTaskValues(formData: FormData) {
  return taskSchema.parse({
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || undefined,
    assignedTo: String(formData.get("assignedTo") ?? ""),
    dueDate: String(formData.get("dueDate") ?? ""),
    dueTime: normalizeOptionalTime(formData.get("dueTime"))
  });
}

function bounce(path: string, message: string) {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function rethrowIfRedirect(error: unknown) {
  if (isRedirectError(error)) {
    throw error;
  }
}

export async function createTaskAction(formData: FormData) {
  const profile = await requireMemberOrganizationProfile();
  const supabase = createSupabaseServerClient();

  try {
    const values = toTaskValues(formData);

    const duplicateWindowStart = new Date(Date.now() - 30_000).toISOString();
    let duplicateQuery = supabase
      .from("tasks")
      .select("id")
      .eq("organization_id", profile.organization_id)
      .eq("created_by", profile.id)
      .eq("assigned_to", values.assignedTo)
      .eq("title", values.title)
      .eq("due_date", values.dueDate)
      .gte("created_at", duplicateWindowStart)
      .limit(1);

    duplicateQuery = values.dueTime
      ? duplicateQuery.eq("due_time", values.dueTime)
      : duplicateQuery.is("due_time", null);

    const { data: recentDuplicate, error: duplicateError } = await duplicateQuery.maybeSingle();

    if (duplicateError) {
      bounce("/tasks", duplicateError.message);
    }

    if (recentDuplicate) {
      redirect("/tasks?success=task-created");
    }

    const { error } = await supabase.from("tasks").insert({
      organization_id: profile.organization_id,
      title: values.title,
      description: values.description,
      assigned_to: values.assignedTo,
      created_by: profile.id,
      due_date: values.dueDate,
      due_time: values.dueTime || null
    });

    if (error) bounce("/tasks", error.message);
  } catch (error) {
    rethrowIfRedirect(error);
    bounce("/tasks", error instanceof Error ? error.message : "Could not create task");
  }

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/team-summary");
  redirect("/tasks?success=task-created");
}

export async function quickAddTaskAction(formData: FormData) {
  const profile = await requireMemberOrganizationProfile();
  const supabase = createSupabaseServerClient();
  const title = String(formData.get("title") ?? "").trim();
  const dueTime = normalizeOptionalTime(formData.get("dueTime")) ?? null;
  const dueDate = String(formData.get("dueDate") ?? "");

  if (!title || !dueDate) {
    bounce("/dashboard", "Task title and date are required");
  }

  const { error } = await supabase.from("tasks").insert({
    organization_id: profile.organization_id,
    title,
    assigned_to: profile.id,
    created_by: profile.id,
    due_date: dueDate,
    due_time: dueTime
  });

  if (error) bounce("/dashboard", error.message);

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  redirect("/dashboard?success=task-created");
}

export async function updateTaskAction(formData: FormData) {
  const profile = await requireMemberOrganizationProfile();
  const supabase = createSupabaseServerClient();
  const taskId = String(formData.get("taskId") ?? "");

  try {
    const values = toTaskValues(formData);
    const { error } = await supabase
      .from("tasks")
      .update({
        title: values.title,
        description: values.description,
        assigned_to: values.assignedTo,
        due_date: values.dueDate,
        due_time: values.dueTime || null
      })
      .eq("id", taskId)
      .eq("organization_id", profile.organization_id);

    if (error) bounce("/tasks", error.message);
  } catch (error) {
    rethrowIfRedirect(error);
    bounce("/tasks", error instanceof Error ? error.message : "Could not update task");
  }

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/team-summary");
  redirect("/tasks?success=task-updated");
}

export async function deleteTaskAction(formData: FormData) {
  const profile = await requireMemberOrganizationProfile();
  const taskId = String(formData.get("taskId") ?? "");
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("organization_id", profile.organization_id);

  if (error) bounce("/tasks", error.message);

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/team-summary");
  redirect("/tasks?success=task-deleted");
}

export async function toggleTaskCompletionAction(formData: FormData) {
  const profile = await requireMemberOrganizationProfile();
  const taskId = String(formData.get("taskId") ?? "");
  const checked = String(formData.get("checked") ?? "") === "true";
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("tasks")
    .update({
      status: checked ? "pending" : "completed",
      completed_at: checked ? null : new Date().toISOString()
    })
    .eq("id", taskId)
    .eq("organization_id", profile.organization_id);

  if (error) bounce("/dashboard", error.message);

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/team-summary");
  redirect(`/dashboard?success=${checked ? "task-marked-pending" : "task-completed"}`);
}

export async function createRecurringTaskAction(formData: FormData) {
  const profile = await requireMemberOrganizationProfile();
  const supabase = createSupabaseServerClient();

  try {
    const values = recurringTaskSchema.parse({
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || undefined,
      assignedTo: String(formData.get("assignedTo") ?? ""),
      dueTime: normalizeOptionalTime(formData.get("dueTime")),
      startDate: String(formData.get("startDate") ?? "")
    });
    const frequency = String(formData.get("frequency") ?? "daily") as
      | "daily"
      | "weekly"
      | "monthly";
    const intervalValue = Math.max(Number(formData.get("intervalValue") ?? 1), 1);
    const endDate = String(formData.get("endDate") ?? "").trim() || null;
    const weekdays = formData.getAll("weekdays");

    if (frequency === "weekly" && weekdays.length === 0) {
      bounce("/tasks", "Select at least one weekday for weekly recurrence");
    }

    const { error } = await supabase.from("recurrence_rules").insert({
      organization_id: profile.organization_id,
      title: values.title,
      description: values.description,
      assigned_to: values.assignedTo,
      created_by: profile.id,
      due_time: values.dueTime || null,
      start_date: values.startDate,
      end_date: endDate,
      frequency,
      interval_value: intervalValue,
      weekdays: frequency === "weekly" ? parseWeekdays(weekdays) : []
    });

    if (error) bounce("/tasks", error.message);

    await ensureRecurringTasksForOrganization(profile.organization_id);
  } catch (error) {
    rethrowIfRedirect(error);
    bounce("/tasks", error instanceof Error ? error.message : "Could not create recurring task");
  }

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/team-summary");
  redirect("/tasks?success=recurring-created");
}

export async function deleteRecurringTaskAction(formData: FormData) {
  const profile = await requireMemberOrganizationProfile();
  const recurrenceRuleId = String(formData.get("recurrenceRuleId") ?? "");
  const deleteMode = String(formData.get("deleteMode") ?? "future");
  const supabase = createSupabaseServerClient();

  if (!recurrenceRuleId) {
    bounce("/tasks", "Recurring rule id is required");
  }

  if (deleteMode === "all") {
    const { error: allTasksError } = await supabase
      .from("tasks")
      .delete()
      .eq("organization_id", profile.organization_id)
      .eq("recurrence_rule_id", recurrenceRuleId);

    if (allTasksError) {
      bounce("/tasks", allTasksError.message);
    }
  } else {
    const today = new Date().toISOString().slice(0, 10);

    const { error: futureTasksError } = await supabase
      .from("tasks")
      .delete()
      .eq("organization_id", profile.organization_id)
      .eq("recurrence_rule_id", recurrenceRuleId)
      .gte("due_date", today)
      .eq("status", "pending");

    if (futureTasksError) {
      bounce("/tasks", futureTasksError.message);
    }
  }

  const { error: ruleError } = await supabase
    .from("recurrence_rules")
    .delete()
    .eq("id", recurrenceRuleId)
    .eq("organization_id", profile.organization_id);

  if (ruleError) {
    bounce("/tasks", ruleError.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/team-summary");
  redirect(`/tasks?success=${deleteMode === "all" ? "recurring-deleted-all" : "recurring-deleted"}`);
}
