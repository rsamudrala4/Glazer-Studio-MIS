import {
  checkInAction,
  checkOutAction,
  updateAttendanceTimesAction
} from "@/app/actions/attendance";
import { SubmitButton } from "@/components/submit-button";
import { TimeSelectField } from "@/components/time-select-field";
import type { AttendanceEntryRecord } from "@/lib/types";
import {
  formatDateTimeTimeOnly,
  formatWorkedDuration,
  getTimeInputValueInAppZone,
  getTodayDateString
} from "@/lib/utils";

type AttendanceCardProps = {
  attendance: AttendanceEntryRecord | null;
  workedMinutesToday: number;
};

export function AttendanceCard({ attendance, workedMinutesToday }: AttendanceCardProps) {
  const hasCheckedIn = Boolean(attendance?.check_in_at);
  const hasCheckedOut = Boolean(attendance?.check_out_at);

  return (
    <section className="card px-5 py-5">
      <h2 className="section-title">Attendance for today</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-sand bg-[#131a22] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-white/42">Check in</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {formatDateTimeTimeOnly(attendance?.check_in_at ?? null)}
          </p>
        </div>
        <div className="rounded-2xl border border-sand bg-[#131a22] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-white/42">Check out</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {formatDateTimeTimeOnly(attendance?.check_out_at ?? null)}
          </p>
        </div>
        <div className="rounded-2xl border border-pine/20 bg-pine/10 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-white/42">Worked today</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {formatWorkedDuration(workedMinutesToday)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <form action={checkInAction}>
          <SubmitButton className="min-w-36" pendingLabel="Checking in...">
            {hasCheckedIn ? "Checked in" : "Check in"}
          </SubmitButton>
        </form>
        <form action={checkOutAction}>
          <SubmitButton className="min-w-36" pendingLabel="Checking out...">
            {hasCheckedOut ? "Checked out" : "Check out"}
          </SubmitButton>
        </form>
      </div>

      {hasCheckedIn && hasCheckedOut ? (
        <details className="mt-5 rounded-2xl border border-sand bg-[#131a22] px-4 py-4">
          <summary className="cursor-pointer list-none text-sm font-medium text-white">
            Edit attendance times
          </summary>
          <p className="mt-2 text-sm text-white/55">
            Use this only if today&apos;s recorded times need correction.
          </p>
          <form action={updateAttendanceTimesAction} className="mt-4">
            <input type="hidden" name="workDate" value={attendance?.work_date ?? getTodayDateString()} />
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Edit check-in time</label>
                <TimeSelectField
                  name="checkInTime"
                  defaultValue={getTimeInputValueInAppZone(attendance?.check_in_at ?? null)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Edit check-out time</label>
                <TimeSelectField
                  name="checkOutTime"
                  defaultValue={getTimeInputValueInAppZone(attendance?.check_out_at ?? null)}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <SubmitButton pendingLabel="Saving attendance...">Save attendance times</SubmitButton>
            </div>
          </form>
        </details>
      ) : null}
    </section>
  );
}
