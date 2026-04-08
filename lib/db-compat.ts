type MaybeDbError = {
  code?: string;
  message?: string | null;
} | null | undefined;

export function isMissingColumnError(error: MaybeDbError, columnName: string) {
  const shortColumnName = columnName.split(".").pop() ?? columnName;
  const message = error?.message ?? "";

  return (
    error?.code === "42703" ||
    error?.code === "PGRST204" ||
    message.includes(columnName) ||
    message.includes(shortColumnName)
  );
}
