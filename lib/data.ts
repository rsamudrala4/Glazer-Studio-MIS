import { addDays, subDays } from "date-fns";
import { isMissingColumnError } from "@/lib/db-compat";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getGenerationWindow, generateOccurrenceDates } from "@/lib/recurrence";
import type {
  AttendanceEntryRecord,
  InvitationRecord,
  OrganizationRecord,
  ProfileRecord,
  RecurrenceRuleRecord,
  TaskRecord,
  TaskRow
} from "@/lib/types";
import { getDateStringInTimeZone } from "@/lib/utils";
import { getMonthBounds, getWorkedMinutes } from "@/lib/utils";

function normalizeTask(task: TaskRow): TaskRecord {
  return {
    ...task,
    assigned_profile: task.assigned_profile?.[0] ?? null,
    created_profile: task.created_profile?.[0] ?? null
  };
}

export async function getOrganizationContext(userId: string) {
  const supabase = createSupabaseServerClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, organization_id, full_name, email, access_level, created_at")
    .eq("id", userId)
    .single();

  let resolvedProfile = profile as ProfileRecord | null;

  if (profileError && isMissingColumnError(profileError, "profiles.access_level")) {
    const { data: fallbackProfile, error: fallbackProfileError } = await supabase
      .from("profiles")
      .select("id, organization_id, full_name, email, created_at")
      .eq("id", userId)
      .single();

    if (fallbackProfileError) throw fallbackProfileError;
    resolvedProfile = {
      ...(fallbackProfile as ProfileRecord),
      access_level: "member"
    };
  } else if (profileError) {
    throw profileError;
  }

  if (!resolvedProfile?.organization_id) {
    return { profile: resolvedProfile as ProfileRecord, organization: null };
  }

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name, created_by, created_at")
    .eq("id", resolvedProfile.organization_id)
    .single();

  if (organizationError) throw organizationError;

  return {
    profile: resolvedProfile as ProfileRecord,
    organization: organization as OrganizationRecord
  };
}

export async function getOrganizationMembers(
  organizationId: string,
  options?: { includeViewers?: boolean }
) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, organization_id, full_name, email, access_level, created_at")
    .eq("organization_id", organizationId)
    .order("full_name", { ascending: true });

  if (error && isMissingColumnError(error, "profiles.access_level")) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("profiles")
      .select("id, organization_id, full_name, email, created_at")
      .eq("organization_id", organizationId)
      .order("full_name", { ascending: true });

    if (fallbackError) throw fallbackError;
    return ((fallbackData ?? []) as ProfileRecord[]).map((member) => ({
      ...member,
      access_level: "member"
    }));
  }

  if (error) throw error;

  const members = (data ?? []) as ProfileRecord[];
  if (options?.includeViewers) {
    return members;
  }

  return members.filter((member) => (member.access_level ?? "member") === "member");
}

export async function getActiveInvitations(organizationId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("organization_invitations")
    .select("id, organization_id, email, token, invite_type, accepted_at, expires_at, created_at")
    .eq("organization_id", organizationId)
    .is("accepted_at", null)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error && isMissingColumnError(error, "organization_invitations.invite_type")) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("organization_invitations")
      .select("id, organization_id, email, token, accepted_at, expires_at, created_at")
      .eq("organization_id", organizationId)
      .is("accepted_at", null)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (fallbackError) throw fallbackError;
    return ((fallbackData ?? []) as InvitationRecord[]).map((invite) => ({
      ...invite,
      invite_type: "member"
    }));
  }

  if (error) throw error;
  return (data ?? []) as InvitationRecord[];
}

export async function getInvitationByToken(token: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_invitation_by_token", {
    invite_token: token
  });

  if (error && isMissingColumnError(error, "organization_invitations.invite_type")) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("organization_invitations")
      .select("id, organization_id, email, token, accepted_at, expires_at, created_at")
      .eq("token", token)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (fallbackError) throw fallbackError;
    if (!fallbackData) return null;

    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", fallbackData.organization_id)
      .maybeSingle();

    if (organizationError) throw organizationError;

    return {
      ...fallbackData,
      invite_type: "member" as const,
      organization_name: organization?.name ?? null
    };
  }

  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function ensureRecurringTasksForOrganization(organizationId: string) {
  const supabase = createSupabaseServerClient();
  const window = getGenerationWindow();

  const { data: rules, error: rulesError } = await supabase
    .from("recurrence_rules")
    .select(
      "id, organization_id, title, description, assigned_to, created_by, start_date, end_date, due_time, frequency, interval_value, weekdays, is_active"
    )
    .eq("organization_id", organizationId)
    .eq("is_active", true);

  if (rulesError) throw rulesError;

  const activeRules = (rules ?? []) as RecurrenceRuleRecord[];
  if (activeRules.length === 0) return;

  const ruleIds = activeRules.map((rule) => rule.id);
  const { data: existingTasks, error: tasksError } = await supabase
    .from("tasks")
    .select("recurrence_rule_id, recurrence_instance_date")
    .in("recurrence_rule_id", ruleIds)
    .gte("due_date", window.start)
    .lte("due_date", window.end);

  if (tasksError) throw tasksError;

  const existingKeys = new Set(
    (existingTasks ?? []).map(
      (task) => `${task.recurrence_rule_id}:${task.recurrence_instance_date}`
    )
  );

  const rowsToInsert = activeRules.flatMap((rule) => {
    const dates = generateOccurrenceDates(rule, window.start, window.end);
    return dates
      .filter((date) => !existingKeys.has(`${rule.id}:${date}`))
      .map((date) => ({
        organization_id: organizationId,
        recurrence_rule_id: rule.id,
        recurrence_instance_date: date,
        title: rule.title,
        description: rule.description,
        assigned_to: rule.assigned_to,
        created_by: rule.created_by,
        due_date: date,
        due_time: rule.due_time
      }));
  });

  if (rowsToInsert.length > 0) {
    const { error } = await supabase.from("tasks").insert(rowsToInsert);
    if (error) throw error;
  }
}

export async function getDashboardData(userId: string, organizationId: string) {
  await ensureRecurringTasksForOrganization(organizationId);

  const supabase = createSupabaseServerClient();
  const now = new Date();
  const today = getDateStringInTimeZone(now);
  const upcomingEnd = getDateStringInTimeZone(addDays(now, 7));

  const [
    { data: todayTasks, error: todayError },
    { data: overdueTasks, error: overdueError },
    { data: upcomingTasks, error: upcomingError },
    { data: attendanceEntry, error: attendanceError }
  ] =
    await Promise.all([
      supabase
        .from("tasks")
        .select(
          "id, organization_id, title, description, assigned_to, created_by, due_date, due_time, status, completed_at, created_at, recurrence_rule_id, recurrence_instance_date, assigned_profile:profiles!tasks_assigned_to_fkey(full_name, email)"
        )
        .eq("assigned_to", userId)
        .eq("due_date", today)
        .order("due_time", { ascending: true, nullsFirst: false }),
      supabase
        .from("tasks")
        .select(
          "id, organization_id, title, description, assigned_to, created_by, due_date, due_time, status, completed_at, created_at, recurrence_rule_id, recurrence_instance_date, assigned_profile:profiles!tasks_assigned_to_fkey(full_name, email)"
        )
        .eq("assigned_to", userId)
        .eq("status", "pending")
        .lt("due_date", today)
        .order("due_date", { ascending: true }),
      supabase
        .from("tasks")
        .select(
          "id, organization_id, title, description, assigned_to, created_by, due_date, due_time, status, completed_at, created_at, recurrence_rule_id, recurrence_instance_date, assigned_profile:profiles!tasks_assigned_to_fkey(full_name, email)"
        )
        .eq("assigned_to", userId)
        .gte("due_date", getDateStringInTimeZone(addDays(now, 1)))
        .lte("due_date", upcomingEnd)
        .order("due_date", { ascending: true }),
      supabase
        .from("attendance_entries")
        .select("id, organization_id, user_id, work_date, check_in_at, check_out_at, created_at")
        .eq("user_id", userId)
        .eq("work_date", today)
        .maybeSingle()
    ]);

  if (todayError) throw todayError;
  if (overdueError) throw overdueError;
  if (upcomingError) throw upcomingError;
  if (attendanceError) throw attendanceError;

  const todayList = ((todayTasks ?? []) as TaskRow[]).map(normalizeTask);
  const completedTodayCount = todayList.filter((task) => task.status === "completed").length;
  const pendingTodayCount = todayList.filter((task) => task.status === "pending").length;
  const attendance = (attendanceEntry ?? null) as AttendanceEntryRecord | null;
  const workedMinutesToday = getWorkedMinutes(attendance?.check_in_at ?? null, attendance?.check_out_at ?? null);

  return {
    todayTasks: todayList,
    overdueTasks: ((overdueTasks ?? []) as TaskRow[]).map(normalizeTask),
    upcomingTasks: ((upcomingTasks ?? []) as TaskRow[]).map(normalizeTask),
    completedTodayCount,
    pendingTodayCount,
    attendance,
    workedMinutesToday
  };
}

export async function getTasksPageData(organizationId: string, filters: {
  assignedTo?: string;
  status?: string;
  search?: string;
  dueDate?: string;
  listRange?: string;
  rangeStart?: string;
  rangeEnd?: string;
}) {
  await ensureRecurringTasksForOrganization(organizationId);

  const supabase = createSupabaseServerClient();
  const today = getDateStringInTimeZone(new Date());
  let query = supabase
    .from("tasks")
    .select(
      "id, organization_id, title, description, assigned_to, created_by, due_date, due_time, status, completed_at, created_at, recurrence_rule_id, recurrence_instance_date, assigned_profile:profiles!tasks_assigned_to_fkey(full_name, email), created_profile:profiles!tasks_created_by_fkey(full_name, email)"
    )
    .eq("organization_id", organizationId)
    .order("due_date", { ascending: true })
    .order("due_time", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (filters.assignedTo) query = query.eq("assigned_to", filters.assignedTo);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.dueDate) query = query.eq("due_date", filters.dueDate);
  if (filters.search) query = query.ilike("title", `%${filters.search}%`);

  if (filters.listRange === "today") {
    query = query.eq("due_date", today);
  }

  if (filters.listRange === "last3") {
    query = query.gte("due_date", getDateStringInTimeZone(subDays(new Date(), 2))).lte("due_date", today);
  }

  if (filters.listRange === "last7") {
    query = query.gte("due_date", getDateStringInTimeZone(subDays(new Date(), 6))).lte("due_date", today);
  }

  if (filters.listRange === "last30") {
    query = query.gte("due_date", getDateStringInTimeZone(subDays(new Date(), 29))).lte("due_date", today);
  }

  if (filters.listRange === "next3") {
    query = query.gte("due_date", today).lte("due_date", getDateStringInTimeZone(addDays(new Date(), 2)));
  }

  if (filters.listRange === "next7") {
    query = query.gte("due_date", today).lte("due_date", getDateStringInTimeZone(addDays(new Date(), 6)));
  }

  if (filters.listRange === "next30") {
    query = query.gte("due_date", today).lte("due_date", getDateStringInTimeZone(addDays(new Date(), 29)));
  }

  if (filters.listRange === "custom") {
    if (filters.rangeStart) query = query.gte("due_date", filters.rangeStart);
    if (filters.rangeEnd) query = query.lte("due_date", filters.rangeEnd);
  }

  const [{ data: tasks, error: tasksError }, { data: rules, error: rulesError }] =
    await Promise.all([
      query,
      supabase
        .from("recurrence_rules")
        .select(
          "id, organization_id, title, description, assigned_to, created_by, start_date, end_date, due_time, frequency, interval_value, weekdays, is_active"
        )
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
    ]);

  if (tasksError) throw tasksError;
  if (rulesError) throw rulesError;

  return {
    tasks: ((tasks ?? []) as TaskRow[]).map(normalizeTask),
    recurrenceRules: (rules ?? []) as RecurrenceRuleRecord[]
  };
}

export async function getTeamSummaryData(organizationId: string, date: string) {
  await ensureRecurringTasksForOrganization(organizationId);

  const supabase = createSupabaseServerClient();
  const monthBounds = getMonthBounds(date);

  const [
    { data: members, error: membersError },
    { data: tasks, error: tasksError },
    { data: attendanceEntries, error: attendanceError },
    { data: monthlyAttendanceEntries, error: monthlyAttendanceError }
  ] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, organization_id, full_name, email, access_level, created_at")
        .eq("organization_id", organizationId)
        .order("full_name", { ascending: true }),
      supabase
        .from("tasks")
        .select(
          "id, organization_id, title, description, assigned_to, created_by, due_date, due_time, status, completed_at, created_at, recurrence_rule_id, recurrence_instance_date, assigned_profile:profiles!tasks_assigned_to_fkey(full_name, email)"
        )
        .eq("organization_id", organizationId)
        .eq("due_date", date)
        .order("status", { ascending: true })
        .order("due_time", { ascending: true, nullsFirst: false }),
      supabase
        .from("attendance_entries")
        .select("id, organization_id, user_id, work_date, check_in_at, check_out_at, created_at")
        .eq("organization_id", organizationId)
        .eq("work_date", date),
      supabase
        .from("attendance_entries")
        .select("id, organization_id, user_id, work_date, check_in_at, check_out_at, created_at")
        .eq("organization_id", organizationId)
        .gte("work_date", monthBounds.start)
        .lte("work_date", monthBounds.end)
    ]);

  let resolvedMembers = (members ?? []) as ProfileRecord[];

  if (membersError && isMissingColumnError(membersError, "profiles.access_level")) {
    const { data: fallbackMembers, error: fallbackMembersError } = await supabase
      .from("profiles")
      .select("id, organization_id, full_name, email, created_at")
      .eq("organization_id", organizationId)
      .order("full_name", { ascending: true });

    if (fallbackMembersError) throw fallbackMembersError;
    resolvedMembers = ((fallbackMembers ?? []) as ProfileRecord[]).map((member) => ({
      ...member,
      access_level: "member"
    }));
  } else if (membersError) {
    throw membersError;
  }

  if (tasksError) throw tasksError;
  if (attendanceError) throw attendanceError;
  if (monthlyAttendanceError) throw monthlyAttendanceError;

  const taskList = ((tasks ?? []) as TaskRow[]).map(normalizeTask);
  const attendanceList = (attendanceEntries ?? []) as AttendanceEntryRecord[];
  const monthlyAttendanceList = (monthlyAttendanceEntries ?? []) as AttendanceEntryRecord[];

  const workingMembers = resolvedMembers.filter(
    (member) => (member.access_level ?? "member") === "member"
  );

  const summaries = workingMembers.map((member) => {
    const memberTasks = taskList.filter((task) => task.assigned_to === member.id);
    const completed = memberTasks.filter((task) => task.status === "completed");
    const pending = memberTasks.filter((task) => task.status === "pending");
    const attendance = attendanceList.find((entry) => entry.user_id === member.id) ?? null;
    const monthlyMinutes = monthlyAttendanceList
      .filter((entry) => entry.user_id === member.id)
      .reduce(
        (total, entry) => total + getWorkedMinutes(entry.check_in_at, entry.check_out_at),
        0
      );

    return {
      member,
      tasks: memberTasks,
      completed,
      pending,
      totalAssigned: memberTasks.length,
      totalCompleted: completed.length,
      attendance,
      workedMinutes: getWorkedMinutes(attendance?.check_in_at ?? null, attendance?.check_out_at ?? null),
      monthlyWorkedMinutes: monthlyMinutes
    };
  });

  const textSummary = summaries
    .map((summary) => {
      const taskLabel =
        summary.tasks.length > 0
          ? summary.tasks
              .map((task) => `${task.title} (${task.status === "completed" ? "done" : "pending"})`)
              .join(", ")
          : "No tasks assigned";
      const attendanceLabel = summary.attendance
        ? `check-in ${summary.attendance.check_in_at}, check-out ${summary.attendance.check_out_at ?? "not checked out"}, worked ${summary.workedMinutes} minutes, month total ${summary.monthlyWorkedMinutes} minutes`
        : `no attendance logged, month total ${summary.monthlyWorkedMinutes} minutes`;
      return `${summary.member.full_name || summary.member.email}: completed ${summary.totalCompleted}, pending ${summary.pending.length}, attendance: ${attendanceLabel}, tasks: ${taskLabel}`;
    })
    .join("\n");

  return { summaries, textSummary };
}

export async function getOverdueCount(userId: string) {
  const supabase = createSupabaseServerClient();
  const today = getDateStringInTimeZone(new Date());
  const { count, error } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("assigned_to", userId)
    .eq("status", "pending")
    .lt("due_date", today);

  if (error) throw error;
  return count ?? 0;
}
