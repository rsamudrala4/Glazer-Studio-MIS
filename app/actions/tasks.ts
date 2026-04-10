"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect";
import { z } from "zod";
import { requireWorkingOrganizationProfile } from "@/lib/auth";
import { getEmployeeTaskAssignerRecords, ensureRecurringTasksForOrganization } from "@/lib/data";
import {
  canAssignToEmployee,
  canManageRecurringRule,
  canManageTask,
  canToggleTask
} from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfileRecord } from "@/lib/types";
import { parseWeekdays } from "@/lib/utils";

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

async function getWorkingMembersForOrganization(organizationId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, organization_id, full_name, email, access_level, reporting_manager_id, created_at")
    .eq("organization_id", organizationId);

  if (error) {
    throw error;
  }

  return (data ?? []) as ProfileRecord[];
}

async function assertCanAssign(
  actor: ProfileRecord,
  organizationId: string,
  assignedTo: string,
  path: string
) {
  const [members, assignerLinks] = await Promise.all([
    getWorkingMembersForOrganization(organizationId),
    getEmployeeTaskAssignerRecords(organizationId)
  ]);
  const targetMember = members.find((member) => member.id === assignedTo);

  if (!targetMember || !canAssignToEmployee(actor, targetMember, assignerLinks)) {
    bounce(path, "You do not have permission to assign tasks to that employee.");
  }

  return { members, assignerLinks, targetMember };
}

async function getTaskForPermissionCheck(taskId: string, organizationId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, organization_id, title, description, assigned_to, created_by, due_date, due_time, status, completed_at, created_at, recurrence_rule_id, recurrence_instance_date, assigned_profile:profiles!tasks_assigned_to_fkey(full_name, email, reporting_manager_id, access_level)"
    )
    .eq("id", taskId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function getRecurringRuleForPermissionCheck(ruleId: string, organizationId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("recurrence_rules")
    .select(
      "id, organization_id, title, description, assigned_to, created_by, start_date, end_date, due_time, frequency, interval_value, weekdays, is_active, assigned_profile:profiles!recurrence_rules_assigned_to_fkey(full_name, email, reporting_manager_id, access_level)"
    )
    .eq("id", ruleId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createTaskAction(formData: FormData) {
  const profile = await requireWorkingOrganizationProfile();
  const supabase = createSupabaseServerClient();

  try {
    const values = toTaskValues(formData);
    await assertCanAssign(profile, profile.organization_id!, values.assignedTo, "/tasks");

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
  const profile = await requireWorkingOrganizationProfile();
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
  const profile = await requireWorkingOrganizationProfile();
  const supabase = createSupabaseServerClient();
  const taskId = String(formData.get("taskId") ?? "");

  try {
    const values = toTaskValues(formData);
    const task = await getTaskForPermissionCheck(taskId, profile.organization_id!);

    if (!task || !canManageTask(profile, task, task.assigned_profile?.[0] ?? task.assigned_profile ?? null)) {
      bounce("/tasks", "You do not have permission to edit that task.");
    }

    await assertCanAssign(profile, profile.organization_id!, values.assignedTo, "/tasks");

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
  const profile = await requireWorkingOrganizationProfile();
  const taskId = String(formData.get("taskId") ?? "");
  const supabase = createSupabaseServerClient();

  const task = await getTaskForPermissionCheck(taskId, profile.organization_id!);

  if (!task || !canManageTask(profile, task, task.assigned_profile?.[0] ?? task.assigned_profile ?? null)) {
    bounce("/tasks", "You do not have permission to delete that task.");
  }

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
  const profile = await requireWorkingOrganizationProfile();
  const taskId = String(formData.get("taskId") ?? "");
  const checked = String(formData.get("checked") ?? "") === "true";
  const supabase = createSupabaseServerClient();

  const task = await getTaskForPermissionCheck(taskId, profile.organization_id!);

  if (!task || !canToggleTask(profile, task, task.assigned_profile?.[0] ?? task.assigned_profile ?? null)) {
    bounce("/dashboard", "You do not have permission to update that task.");
  }

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
  const profile = await requireWorkingOrganizationProfile();
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

    await assertCanAssign(profile, profile.organization_id!, values.assignedTo, "/tasks");

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
  const profile = await requireWorkingOrganizationProfile();
  const recurrenceRuleId = String(formData.get("recurrenceRuleId") ?? "");
  const deleteMode = String(formData.get("deleteMode") ?? "future");
  const supabase = createSupabaseServerClient();

  if (!recurrenceRuleId) {
    bounce("/tasks", "Recurring rule id is required");
  }

  const rule = await getRecurringRuleForPermissionCheck(recurrenceRuleId, profile.organization_id!);

  if (!rule || !canManageRecurringRule(profile, rule, rule.assigned_profile?.[0] ?? rule.assigned_profile ?? null)) {
    bounce("/tasks", "You do not have permission to delete that recurring rule.");
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
