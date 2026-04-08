import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateLabel(value: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

export function formatTimeLabel(value: string | null) {
  if (!value) return "Any time";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(`1970-01-01T${value}`));
}

export function formatDateTimeLabel(value: string | null) {
  if (!value) return "Not completed";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatDateTimeTimeOnly(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function getTimeInputValueInAppZone(value: string | null) {
  if (!value) return null;

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: getAppTimeZone(),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date(value));

  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;

  if (!hour || !minute) return null;
  return `${hour}:${minute}`;
}

export function getMonthBounds(dateString: string) {
  const [year, month] = dateString.split("-").map(Number);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0);
  const end = `${year}-${String(month).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;

  return { start, end };
}

export function getWorkedMinutes(checkInAt: string | null, checkOutAt: string | null) {
  if (!checkInAt || !checkOutAt) return 0;
  const start = new Date(checkInAt).getTime();
  const end = new Date(checkOutAt).getTime();
  const diff = end - start;
  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.floor(diff / 60000);
}

export function formatWorkedDuration(totalMinutes: number) {
  if (!totalMinutes || totalMinutes <= 0) return "0h 0m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function getAppTimeZone() {
  return process.env.APP_TIME_ZONE || "Asia/Kolkata";
}

export function getDateStringInTimeZone(date = new Date(), timeZone = getAppTimeZone()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

export function getTodayDateString() {
  return getDateStringInTimeZone();
}

function getTimeZoneOffsetString(date: Date, timeZone = getAppTimeZone()) {
  const offsetText = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset"
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")
    ?.value;

  if (!offsetText) return "Z";

  const normalized = offsetText.replace("GMT", "");
  return normalized === "" ? "Z" : normalized;
}

export function getIsoForDateAndTimeInAppZone(dateString: string, timeString: string) {
  const baseDate = new Date(`${dateString}T12:00:00Z`);
  const offset = getTimeZoneOffsetString(baseDate);
  return new Date(`${dateString}T${timeString}:00${offset}`).toISOString();
}

export function parseWeekdays(values: FormDataEntryValue | FormDataEntryValue[] | null) {
  if (!values) return [];
  const source = Array.isArray(values) ? values : [values];
  return source
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
}
