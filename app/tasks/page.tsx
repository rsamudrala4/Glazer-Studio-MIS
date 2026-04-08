import {
  createRecurringTaskAction,
  createTaskAction,
  deleteRecurringTaskAction,
  deleteTaskAction,
  updateTaskAction
} from "@/app/actions/tasks";
import { EmptyState } from "@/components/empty-state";
import { ConfirmButton } from "@/components/confirm-button";
import { ModalPanel } from "@/components/modal-panel";
import { PageHeader } from "@/components/page-header";
import { ProtectedPage } from "@/components/protected-page";
import { SubmitButton } from "@/components/submit-button";
import { TaskStatusForm } from "@/components/task-status-form";
import { TimeSelectField } from "@/components/time-select-field";
import { requireMemberOrganizationProfile } from "@/lib/auth";
import { getOrganizationMembers, getTasksPageData } from "@/lib/data";
import { getRecurrencePreview } from "@/lib/recurrence";
import { formatDateLabel, formatDateTimeLabel, formatTimeLabel, getTodayDateString } from "@/lib/utils";
import type { TaskRecord } from "@/lib/types";

const weekdays = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 }
];

function groupTasksByDate(tasks: TaskRecord[]) {
  const grouped = new Map<string, TaskRecord[]>();

  for (const task of tasks) {
    const existing = grouped.get(task.due_date) ?? [];
    existing.push(task);
    grouped.set(task.due_date, existing);
  }

  return Array.from(grouped.entries());
}

export default async function TasksPage({
  searchParams
}: {
  searchParams: {
    assignedTo?: string;
    status?: string;
    search?: string;
    dueDate?: string;
    listRange?: string;
    rangeStart?: string;
    rangeEnd?: string;
    success?: string;
    created?: string;
    updated?: string;
    deleted?: string;
    error?: string;
  };
}) {
  const profile = await requireMemberOrganizationProfile();
  const [members, taskData] = await Promise.all([
    getOrganizationMembers(profile.organization_id!),
    getTasksPageData(profile.organization_id!, {
      assignedTo: searchParams.assignedTo,
      status: searchParams.status,
      search: searchParams.search,
      dueDate: searchParams.dueDate,
      listRange: searchParams.listRange,
      rangeStart: searchParams.rangeStart,
      rangeEnd: searchParams.rangeEnd
    })
  ]);
  const groupedTasks = groupTasksByDate(taskData.tasks);
  const selectedListRange = searchParams.listRange ?? "today";
  const today = getTodayDateString();

  return (
    <ProtectedPage currentPath="/tasks">
      <div className="space-y-6">
        <PageHeader
          title="Tasks"
          description="Create one-off or recurring tasks, assign work to anyone in the organization, and keep the list updated."
          actions={
            <div className="flex flex-wrap gap-3">
              <ModalPanel
                triggerLabel="Create task"
                title="Create task"
                description="Add a one-off task and assign it to any employee in the organization."
              >
                <form action={createTaskAction} className="grid gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">Title</label>
                    <input name="title" placeholder="Prepare monthly operations summary" required />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">Description</label>
                    <textarea name="description" placeholder="Optional notes or instructions" />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink">Assign to</label>
                      <select name="assignedTo" required defaultValue={profile.id}>
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.full_name || member.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink">Due date</label>
                      <input name="dueDate" type="date" required defaultValue={today} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">Due time</label>
                    <TimeSelectField name="dueTime" />
                  </div>
                  <SubmitButton>Create task</SubmitButton>
                </form>
              </ModalPanel>

              <ModalPanel
                triggerLabel="Create recurring task"
                title="Create recurring task"
                description="Create repeating work and generate real task instances for each date."
                triggerClassName="border border-sand bg-[#131a22] text-ink hover:border-pine/30 hover:bg-[#18212b] hover:text-white"
              >
                <form action={createRecurringTaskAction} className="grid gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">Title</label>
                    <input name="title" placeholder="Daily standup update" required />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">Description</label>
                    <textarea name="description" placeholder="Optional notes or instructions" />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink">Assign to</label>
                      <select name="assignedTo" required defaultValue={profile.id}>
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.full_name || member.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink">Due time</label>
                      <TimeSelectField name="dueTime" />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink">Frequency</label>
                      <select name="frequency" defaultValue="daily">
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink">Interval</label>
                      <input name="intervalValue" type="number" min="1" defaultValue="1" />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink">Start date</label>
                      <input name="startDate" type="date" required defaultValue={today} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink">End date</label>
                      <input name="endDate" type="date" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">Selected weekdays</label>
                    <div className="flex flex-wrap gap-2">
                      {weekdays.map((day) => (
                        <label
                          key={day.value}
                          className="inline-flex items-center gap-2 rounded-full border border-sand bg-[#131a22] px-3 py-2 text-sm text-ink"
                        >
                          <input
                            type="checkbox"
                            name="weekdays"
                            value={day.value}
                            className="h-4 w-4 rounded border-sand"
                          />
                          {day.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <SubmitButton>Create recurring task</SubmitButton>
                </form>
              </ModalPanel>
            </div>
          }
        />

        {searchParams.error ? (
          <p className="rounded-2xl border border-rose/20 bg-rose/10 px-4 py-3 text-sm text-rose">
            {searchParams.error}
          </p>
        ) : null}
        {searchParams.success || searchParams.created ? (
          <p className="rounded-2xl border border-pine/20 bg-pine/10 px-4 py-3 text-sm text-pine">
            {(searchParams.success === "recurring-created" || searchParams.created === "recurring")
              ? "Recurring task created successfully."
              : searchParams.success === "task-updated" || searchParams.updated
                ? "Task updated successfully."
                : searchParams.success === "task-deleted" || searchParams.deleted === "task"
                  ? "Task deleted successfully."
                  : searchParams.success === "recurring-deleted"
                    ? "Recurring task deleted successfully."
                    : searchParams.success === "recurring-deleted-all"
                      ? "Recurring task rule and all generated tasks deleted successfully."
                      : "Task created successfully."}
          </p>
        ) : null}
        {!searchParams.success && searchParams.updated ? (
          <p className="rounded-2xl border border-pine/20 bg-pine/10 px-4 py-3 text-sm text-pine">
            Task updated successfully.
          </p>
        ) : null}
        {!searchParams.success && searchParams.deleted ? (
          <p className="rounded-2xl border border-pine/20 bg-pine/10 px-4 py-3 text-sm text-pine">
            {searchParams.deleted === "recurring"
              ? "Recurring task deleted successfully."
              : "Task deleted successfully."}
          </p>
        ) : null}

        <section className="space-y-6">
            <div className="card px-5 py-5">
              <h2 className="section-title">Recurring rules</h2>
              <div className="mt-4 space-y-3">
                {taskData.recurrenceRules.length === 0 ? (
                  <EmptyState
                    title="No recurring tasks yet"
                    description="Create a recurring rule for repeated work such as daily standups or weekly reports."
                  />
                ) : (
                  taskData.recurrenceRules.map((rule) => {
                    const assignedMember = members.find((member) => member.id === rule.assigned_to);
                    return (
                      <div key={rule.id} className="rounded-2xl border border-sand/90 bg-[#131a22] px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-white">{rule.title}</p>
                            <p className="mt-1 text-sm text-white/58">
                              {getRecurrencePreview(rule)} · Assigned to{" "}
                              {assignedMember?.full_name || assignedMember?.email || "Unknown"}
                            </p>
                          </div>
                          <span className="rounded-full border border-pine/20 bg-pine/10 px-2.5 py-1 text-xs font-medium text-pine">
                            {rule.frequency}
                          </span>
                        </div>
                        <form action={deleteRecurringTaskAction} className="mt-3">
                          <input type="hidden" name="recurrenceRuleId" value={rule.id} />
                          <div className="flex flex-wrap gap-2">
                            <ConfirmButton
                              message="Delete this recurring rule? Future generated tasks linked to it will also be removed."
                              className="rounded-2xl border border-rose/20 bg-rose/10 px-4 py-2 text-sm font-medium text-rose hover:bg-rose/15"
                            >
                              Delete rule
                            </ConfirmButton>
                            <ConfirmButton
                              name="deleteMode"
                              value="all"
                              message="Delete this recurring rule and all generated tasks, including past instances?"
                              className="rounded-2xl border border-rose/30 bg-rose/15 px-4 py-2 text-sm font-medium text-rose hover:bg-rose/20"
                            >
                              Delete rule and all generated tasks
                            </ConfirmButton>
                          </div>
                        </form>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h2 className="section-title">Task list</h2>
                <p className="mt-1 text-sm text-white/60">
                  Edit assignments, dates, and status directly from the list.
                </p>
              </div>

              <div className="card px-5 py-5">
                <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">Search title</label>
                    <input name="search" defaultValue={searchParams.search ?? ""} placeholder="Search tasks" />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">Employee</label>
                    <select name="assignedTo" defaultValue={searchParams.assignedTo ?? ""}>
                      <option value="">All employees</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.full_name || member.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">Status</label>
                    <select name="status" defaultValue={searchParams.status ?? ""}>
                      <option value="">All statuses</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">Due date</label>
                    <input name="dueDate" type="date" defaultValue={searchParams.dueDate ?? ""} />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">Task list range</label>
                    <select name="listRange" defaultValue={selectedListRange}>
                      <option value="today">Today</option>
                      <option value="last3">Last 3 days</option>
                      <option value="last7">Last 7 days</option>
                      <option value="last30">Last 30 days</option>
                      <option value="next3">Next 3 days</option>
                      <option value="next7">Next 7 days</option>
                      <option value="next30">Next 30 days</option>
                      <option value="custom">Custom range</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">Range start</label>
                    <input
                      name="rangeStart"
                      type="date"
                      defaultValue={searchParams.rangeStart ?? getTodayDateString()}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">Range end</label>
                    <input
                      name="rangeEnd"
                      type="date"
                      defaultValue={searchParams.rangeEnd ?? getTodayDateString()}
                    />
                  </div>

                  <div className="flex gap-3 md:col-span-2 xl:col-span-4">
                    <button
                      type="submit"
                      className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-pine px-4 py-2.5 text-sm font-semibold text-[#07100c] shadow-glow hover:bg-pine/90"
                    >
                      Apply filters
                    </button>
                    <a
                      href="/tasks"
                      className="inline-flex min-h-11 items-center rounded-2xl border border-sand bg-[#131a22] px-4 py-2.5 text-sm font-medium text-ink hover:border-pine/30 hover:bg-[#18212b] hover:text-white"
                    >
                      Clear
                    </a>
                  </div>
                </form>
              </div>

              {groupedTasks.length === 0 ? (
                <EmptyState
                  title="No tasks found"
                  description="Try adjusting the filters or create a new task."
                />
              ) : (
                groupedTasks.map(([dueDate, tasks]) => (
                  <div key={dueDate} className="space-y-3">
                    <div className="sticky top-3 z-10 flex items-center justify-between rounded-2xl border border-sand/90 bg-[#0f151c]/95 px-4 py-3 backdrop-blur">
                      <div>
                        <p className="text-sm font-semibold text-white">{formatDateLabel(dueDate)}</p>
                        <p className="text-xs text-white/48">{tasks.length} task{tasks.length > 1 ? "s" : ""}</p>
                      </div>
                    </div>

                    <div className="card overflow-hidden px-0 py-0">
                      <div className="overflow-x-auto">
                        <div className="min-w-[980px]">
                          <div className="grid grid-cols-[52px_2.2fr_1.2fr_140px_140px_120px_110px] gap-3 border-b border-sand/90 bg-[#0d131a] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
                            <span>Done</span>
                            <span>Task</span>
                            <span>Assigned</span>
                            <span>Time</span>
                            <span>Status</span>
                            <span>Save</span>
                            <span>Delete</span>
                          </div>

                          {tasks.map((task) => (
                            <div
                              key={task.id}
                              className="grid grid-cols-[52px_2.2fr_1.2fr_140px_140px_120px_110px] gap-3 border-b border-sand/70 px-4 py-3 last:border-b-0"
                            >
                              <div className="flex items-start pt-2">
                                <TaskStatusForm taskId={task.id} checked={task.status === "completed"} />
                              </div>

                              <form action={updateTaskAction} className="contents">
                                <input type="hidden" name="taskId" value={task.id} />

                                <div className="space-y-2">
                                  <input name="title" defaultValue={task.title} required />
                                  <input
                                    name="description"
                                    defaultValue={task.description ?? ""}
                                    placeholder="Optional description"
                                  />
                                  <p className="text-xs text-white/45">
                                    Created by {task.created_profile?.full_name || task.created_profile?.email}
                                    {" · "}
                                    Completed {formatDateTimeLabel(task.completed_at)}
                                  </p>
                                </div>

                                <div className="space-y-2">
                                  <select name="assignedTo" defaultValue={task.assigned_to} required>
                                    {members.map((member) => (
                                      <option key={member.id} value={member.id}>
                                        {member.full_name || member.email}
                                      </option>
                                    ))}
                                  </select>
                                  <input name="dueDate" type="date" defaultValue={task.due_date} required />
                                </div>

                                <div className="space-y-2">
                                  <TimeSelectField name="dueTime" defaultValue={task.due_time ?? ""} />
                                  <p className="text-xs text-white/45">{formatTimeLabel(task.due_time)}</p>
                                </div>

                                <div className="flex items-start pt-2">
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                      task.status === "completed"
                                        ? "border border-pine/20 bg-pine/10 text-pine"
                                        : "border border-amber/20 bg-amber/10 text-amber"
                                    }`}
                                  >
                                    {task.status}
                                  </span>
                                </div>

                                <div className="flex items-start pt-1">
                                  <SubmitButton className="w-full">Save</SubmitButton>
                                </div>
                              </form>

                              <form action={deleteTaskAction} className="flex items-start pt-1">
                                <input type="hidden" name="taskId" value={task.id} />
                                <ConfirmButton
                                  message="Delete this task?"
                                  className="w-full rounded-2xl border border-rose/20 bg-rose/10 px-4 py-2 text-sm font-medium text-rose hover:bg-rose/15"
                                >
                                  Delete
                                </ConfirmButton>
                              </form>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
        </section>
      </div>
    </ProtectedPage>
  );
}
