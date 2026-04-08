import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  format,
  getDay,
  isAfter,
  isBefore,
  parseISO
} from "date-fns";
import type { RecurrenceRuleRecord } from "@/lib/types";

function normalizeWeekdays(weekdays: number[] | null) {
  return (weekdays ?? []).filter((value) => value >= 0 && value <= 6);
}

export function generateOccurrenceDates(
  rule: RecurrenceRuleRecord,
  rangeStart: string,
  rangeEnd: string
) {
  const ruleStart = parseISO(rule.start_date);
  const queryStart = parseISO(rangeStart);
  const queryEnd = parseISO(rangeEnd);
  const effectiveStart = isAfter(queryStart, ruleStart) ? queryStart : ruleStart;
  const effectiveEnd = rule.end_date
    ? isBefore(parseISO(rule.end_date), queryEnd)
      ? parseISO(rule.end_date)
      : queryEnd
    : queryEnd;

  if (isAfter(effectiveStart, effectiveEnd)) {
    return [];
  }

  const interval = Math.max(rule.interval_value ?? 1, 1);
  const results: string[] = [];

  if (rule.frequency === "daily") {
    for (
      let cursor = effectiveStart;
      !isAfter(cursor, effectiveEnd);
      cursor = addDays(cursor, 1)
    ) {
      const offset = differenceInCalendarDays(cursor, ruleStart);
      if (offset >= 0 && offset % interval === 0) {
        results.push(format(cursor, "yyyy-MM-dd"));
      }
    }
  }

  if (rule.frequency === "weekly") {
    const weekdays = normalizeWeekdays(rule.weekdays);
    for (
      let cursor = effectiveStart;
      !isAfter(cursor, effectiveEnd);
      cursor = addDays(cursor, 1)
    ) {
      const weeksBetween = Math.floor(
        differenceInCalendarDays(cursor, ruleStart) / 7
      );
      if (
        weeksBetween >= 0 &&
        weeksBetween % interval === 0 &&
        weekdays.includes(getDay(cursor))
      ) {
        results.push(format(cursor, "yyyy-MM-dd"));
      }
    }
  }

  if (rule.frequency === "monthly") {
    let cursor = ruleStart;
    while (!isAfter(cursor, effectiveEnd)) {
      if (!isBefore(cursor, effectiveStart)) {
        results.push(format(cursor, "yyyy-MM-dd"));
      }
      cursor = addMonths(cursor, interval);
    }
  }

  return results;
}

export function getGenerationWindow() {
  const start = new Date();
  const end = addWeeks(start, 8);

  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd")
  };
}

export function getRecurrencePreview(rule: Pick<
  RecurrenceRuleRecord,
  "frequency" | "interval_value" | "weekdays" | "start_date" | "end_date"
>) {
  const interval = Math.max(rule.interval_value ?? 1, 1);

  if (rule.frequency === "daily") {
    return interval === 1 ? "Every day" : `Every ${interval} days`;
  }

  if (rule.frequency === "weekly") {
    const weekdayLabels = normalizeWeekdays(rule.weekdays)
      .sort()
      .map((value) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][value]);
    const label = weekdayLabels.length > 0 ? weekdayLabels.join(", ") : "selected days";
    return interval === 1 ? `Every week on ${label}` : `Every ${interval} weeks on ${label}`;
  }

  const monthsBetween = differenceInCalendarMonths(
    parseISO(rule.end_date ?? rule.start_date),
    parseISO(rule.start_date)
  );
  const durationLabel =
    monthsBetween > 0 && rule.end_date ? ` until ${format(parseISO(rule.end_date), "dd MMM yyyy")}` : "";

  return interval === 1
    ? `Every month${durationLabel}`
    : `Every ${interval} months${durationLabel}`;
}
