import { AttendanceCard } from "@/components/attendance-card";
import { quickAddTaskAction } from "@/app/actions/tasks";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ProtectedPage } from "@/components/protected-page";
import { StatCard } from "@/components/stat-card";
import { SubmitButton } from "@/components/submit-button";
import { TaskStatusForm } from "@/components/task-status-form";
import { TimeSelectField } from "@/components/time-select-field";
import { requireMemberOrganizationProfile } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";
import { formatDateLabel, formatTimeLabel, getTodayDateString } from "@/lib/utils";

function TaskList({
  items,
  emptyTitle,
  emptyDescription
}: {
  items: Awaited<ReturnType<typeof getDashboardData>>["todayTasks"];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-3">
      {items.map((task) => (
        <div key={task.id} className="card flex items-start gap-3 px-4 py-4">
          <TaskStatusForm taskId={task.id} checked={task.status === "completed"} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
              <div>
                <p
                  className={`font-medium ${
                    task.status === "completed" ? "text-ink/55 line-through" : "text-ink"
                  }`}
                >
                  {task.title}
                </p>
                {task.description ? (
                  <p className="mt-1 text-sm text-white/58">{task.description}</p>
                ) : null}
              </div>
              <div className="text-sm text-white/52">
                <p>{formatDateLabel(task.due_date)}</p>
                <p>{formatTimeLabel(task.due_time)}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams: { error?: string; success?: string };
}) {
  const profile = await requireMemberOrganizationProfile();
  const data = await getDashboardData(profile.id, profile.organization_id!);

  return (
    <ProtectedPage currentPath="/dashboard">
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="A simple view of today’s workload, overdue items, and what’s coming next."
        />

        {searchParams.error ? (
          <p className="rounded-2xl border border-rose/20 bg-rose/10 px-4 py-3 text-sm text-rose">
            {searchParams.error}
          </p>
        ) : null}
        {searchParams.success ? (
          <p className="rounded-2xl border border-pine/20 bg-pine/10 px-4 py-3 text-sm text-pine">
            {searchParams.success === "task-created"
              ? "Task created successfully."
              : searchParams.success === "task-completed"
                ? "Task marked as completed successfully."
                : searchParams.success === "task-marked-pending"
                  ? "Task marked as pending successfully."
                  : searchParams.success === "checked-in"
                    ? "Checked in successfully."
                    : searchParams.success === "checked-out"
                      ? "Checked out successfully."
                      : searchParams.success === "attendance-updated"
                        ? "Attendance updated successfully."
                        : searchParams.success === "organization-created"
                          ? "Organization created successfully."
                          : "Action completed successfully."}
          </p>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="Completed today" value={data.completedTodayCount} tone="success" />
          <StatCard label="Pending today" value={data.pendingTodayCount} tone="warning" />
          <StatCard label="Overdue" value={data.overdueTasks.length} />
          <StatCard label="Upcoming (7 days)" value={data.upcomingTasks.length} />
        </section>

        <AttendanceCard
          attendance={data.attendance}
          workedMinutesToday={data.workedMinutesToday}
        />

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div>
              <h2 className="section-title">Today&apos;s tasks</h2>
              <p className="mt-1 text-sm text-white/60">
                Use the checkbox to update task completion quickly.
              </p>
              <div className="mt-4">
                <TaskList
                  items={data.todayTasks}
                  emptyTitle="No tasks for today"
                  emptyDescription="You’re clear for today, or tasks haven’t been assigned yet."
                />
              </div>
            </div>

            <div>
              <h2 className="section-title">Overdue tasks</h2>
              <div className="mt-4">
                <TaskList
                  items={data.overdueTasks}
                  emptyTitle="No overdue tasks"
                  emptyDescription="Nothing is carrying over from previous days."
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <section className="card px-5 py-5">
              <h2 className="section-title">Quick add for today</h2>
              <p className="mt-1 text-sm text-white/60">
                Add a task for yourself without leaving the dashboard.
              </p>
              <form action={quickAddTaskAction} className="mt-4 space-y-4">
                <input type="hidden" name="dueDate" value={getTodayDateString()} />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">Task title</label>
                  <input name="title" type="text" placeholder="Follow up on vendor quote" required />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">Due time</label>
                  <TimeSelectField name="dueTime" />
                </div>
                <SubmitButton className="w-full">Add today&apos;s task</SubmitButton>
              </form>
            </section>

            <section className="card px-5 py-5">
              <h2 className="section-title">Upcoming</h2>
              <div className="mt-4 space-y-3">
                {data.upcomingTasks.length === 0 ? (
                  <EmptyState
                    title="No upcoming tasks"
                    description="The next seven days are currently open."
                  />
                ) : (
                  data.upcomingTasks.map((task) => (
                    <div key={task.id} className="rounded-2xl border border-sand/90 bg-[#131a22] px-4 py-3">
                      <p className="font-medium text-white">{task.title}</p>
                      <p className="mt-1 text-sm text-white/58">
                        {formatDateLabel(task.due_date)} · {formatTimeLabel(task.due_time)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </ProtectedPage>
  );
}
