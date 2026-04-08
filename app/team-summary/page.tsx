import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ProtectedPage } from "@/components/protected-page";
import { requireSummaryAccessProfile } from "@/lib/auth";
import { getTeamSummaryData } from "@/lib/data";
import {
  formatDateTimeTimeOnly,
  formatTimeLabel,
  formatWorkedDuration,
  getTodayDateString
} from "@/lib/utils";

export default async function TeamSummaryPage({
  searchParams
}: {
  searchParams: { date?: string };
}) {
  const profile = await requireSummaryAccessProfile();
  const selectedDate = searchParams.date ?? getTodayDateString();
  const summary = await getTeamSummaryData(profile.organization_id!, selectedDate);

  return (
    <ProtectedPage currentPath="/team-summary">
      <div className="space-y-6">
        <PageHeader
          title="Team Daily Summary"
          description="Review everyone’s assigned work and attendance for a specific date."
        />

        <section className="card px-5 py-5">
          <form className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="w-full max-w-xs">
              <label className="mb-1.5 block text-sm font-medium text-ink">Summary date</label>
              <input name="date" type="date" defaultValue={selectedDate} />
            </div>
            <button className="min-h-11 rounded-2xl bg-pine px-4 py-2.5 text-sm font-semibold text-[#07100c] shadow-glow hover:bg-pine/90">
              View summary
            </button>
          </form>
        </section>

        <section className="space-y-4">
          {summary.summaries.every((item) => item.totalAssigned === 0) ? (
            <EmptyState
              title="No tasks assigned for this date"
              description="Choose another date or add tasks from the Tasks page."
            />
          ) : null}

          {summary.summaries.map((entry) => (
            <div key={entry.member.id} className="card px-5 py-5 print:shadow-none">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-ink">
                    {entry.member.full_name || entry.member.email}
                  </h2>
                  <p className="text-sm text-white/58">{entry.member.email}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-white/60 md:min-w-60">
                  <div className="rounded-xl border border-sand bg-[#131a22] px-3 py-2">
                    <p>Total assigned</p>
                    <p className="mt-1 text-xl font-semibold text-white">{entry.totalAssigned}</p>
                  </div>
                  <div className="rounded-xl border border-pine/20 bg-pine/10 px-3 py-2">
                    <p>Total completed</p>
                    <p className="mt-1 text-xl font-semibold text-white">{entry.totalCompleted}</p>
                  </div>
                  <div className="rounded-xl border border-sand bg-[#131a22] px-3 py-2 md:col-span-2">
                    <p>Worked today</p>
                    <p className="mt-1 text-xl font-semibold text-white">
                      {formatWorkedDuration(entry.workedMinutes)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-sand bg-[#131a22] px-4 py-4">
                  <h3 className="text-sm font-semibold text-white/72">Check in</h3>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {formatDateTimeTimeOnly(entry.attendance?.check_in_at ?? null)}
                  </p>
                </div>
                <div className="rounded-2xl border border-sand bg-[#131a22] px-4 py-4">
                  <h3 className="text-sm font-semibold text-white/72">Check out</h3>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {formatDateTimeTimeOnly(entry.attendance?.check_out_at ?? null)}
                  </p>
                </div>
                <div className="rounded-2xl border border-pine/20 bg-pine/10 px-4 py-4">
                  <h3 className="text-sm font-semibold text-white/72">Total hours</h3>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {formatWorkedDuration(entry.workedMinutes)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-sand bg-[#131a22] px-4 py-4">
                  <h3 className="text-sm font-semibold text-pine">Completed</h3>
                  <div className="mt-3 space-y-2">
                    {entry.completed.length === 0 ? (
                      <p className="text-sm text-white/55">No completed tasks.</p>
                    ) : (
                      entry.completed.map((task) => (
                        <div key={task.id} className="rounded-xl border border-sand bg-[#0d131a] px-3 py-2">
                          <p className="font-medium text-white">{task.title}</p>
                          <p className="mt-1 text-sm text-white/52">
                            {formatTimeLabel(task.due_time)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-sand bg-[#131a22] px-4 py-4">
                  <h3 className="text-sm font-semibold text-amber">Pending</h3>
                  <div className="mt-3 space-y-2">
                    {entry.pending.length === 0 ? (
                      <p className="text-sm text-white/55">No pending tasks.</p>
                    ) : (
                      entry.pending.map((task) => (
                        <div key={task.id} className="rounded-xl border border-sand bg-[#0d131a] px-3 py-2">
                          <p className="font-medium text-white">{task.title}</p>
                          <p className="mt-1 text-sm text-white/52">
                            {formatTimeLabel(task.due_time)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </ProtectedPage>
  );
}
