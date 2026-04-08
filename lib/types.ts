export type TaskStatus = "pending" | "completed";

export type TaskRecord = {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  created_by: string;
  due_date: string;
  due_time: string | null;
  status: TaskStatus;
  completed_at: string | null;
  created_at: string;
  recurrence_rule_id: string | null;
  recurrence_instance_date: string | null;
  assigned_profile?: {
    full_name: string | null;
    email: string;
  } | null;
  created_profile?: {
    full_name: string | null;
    email: string;
  } | null;
};

export type TaskRow = Omit<TaskRecord, "assigned_profile" | "created_profile"> & {
  assigned_profile?: { full_name: string | null; email: string }[] | null;
  created_profile?: { full_name: string | null; email: string }[] | null;
};

export type ProfileRecord = {
  id: string;
  organization_id: string | null;
  full_name: string | null;
  email: string;
  access_level?: "member" | "summary_viewer";
  created_at: string;
};

export type OrganizationRecord = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

export type InvitationRecord = {
  id: string;
  organization_id: string;
  email: string;
  token: string;
  invite_type?: "member" | "summary_viewer";
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
};

export type AttendanceEntryRecord = {
  id: string;
  organization_id: string;
  user_id: string;
  work_date: string;
  check_in_at: string;
  check_out_at: string | null;
  created_at: string;
};

export type RecurrenceRuleRecord = {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  created_by: string;
  start_date: string;
  end_date: string | null;
  due_time: string | null;
  frequency: "daily" | "weekly" | "monthly";
  interval_value: number;
  weekdays: number[] | null;
  is_active: boolean;
};
