import type {
  EmployeeTaskAssignerRecord,
  ProfileRecord,
  RecurrenceRuleRecord,
  TaskRecord
} from "@/lib/types";

export function isSummaryViewer(profile: Pick<ProfileRecord, "access_level">) {
  return (profile.access_level ?? "employee") === "summary_viewer";
}

export function isAdmin(profile: Pick<ProfileRecord, "access_level">) {
  return (profile.access_level ?? "employee") === "admin";
}

export function isWorkingUser(profile: Pick<ProfileRecord, "access_level">) {
  return !isSummaryViewer(profile);
}

export function canAssignToEmployee(
  actor: Pick<ProfileRecord, "id" | "access_level" | "organization_id">,
  employee: Pick<ProfileRecord, "id" | "access_level" | "organization_id">,
  assignerLinks: EmployeeTaskAssignerRecord[]
) {
  if (!actor.organization_id || actor.organization_id !== employee.organization_id) {
    return false;
  }

  if (!isWorkingUser(employee)) {
    return false;
  }

  if (isAdmin(actor)) {
    return true;
  }

  if (actor.id === employee.id) {
    return true;
  }

  return assignerLinks.some(
    (link) => link.employee_id === employee.id && link.assigner_id === actor.id
  );
}

export function canManageTask(
  actor: Pick<ProfileRecord, "id" | "access_level">,
  task: Pick<TaskRecord, "created_by">,
  assignedProfile?: Pick<ProfileRecord, "reporting_manager_id"> | null
) {
  if (isAdmin(actor)) {
    return true;
  }

  if (task.created_by === actor.id) {
    return true;
  }

  return assignedProfile?.reporting_manager_id === actor.id;
}

export function canToggleTask(
  actor: Pick<ProfileRecord, "id" | "access_level">,
  task: Pick<TaskRecord, "created_by" | "assigned_to">,
  assignedProfile?: Pick<ProfileRecord, "reporting_manager_id"> | null
) {
  if (task.assigned_to === actor.id) {
    return true;
  }

  return canManageTask(actor, task, assignedProfile);
}

export function canManageRecurringRule(
  actor: Pick<ProfileRecord, "id" | "access_level">,
  rule: Pick<RecurrenceRuleRecord, "created_by">,
  assignedProfile?: Pick<ProfileRecord, "reporting_manager_id"> | null
) {
  if (isAdmin(actor)) {
    return true;
  }

  if (rule.created_by === actor.id) {
    return true;
  }

  return assignedProfile?.reporting_manager_id === actor.id;
}

export function getAssignableMembers(
  actor: Pick<ProfileRecord, "id" | "access_level" | "organization_id">,
  members: ProfileRecord[],
  assignerLinks: EmployeeTaskAssignerRecord[]
) {
  return members.filter((member) => canAssignToEmployee(actor, member, assignerLinks));
}
