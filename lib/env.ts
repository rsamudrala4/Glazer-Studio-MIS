const PLACEHOLDER_VALUES = new Set([
  "https://your-project.supabase.co",
  "your-anon-key",
  "your-service-role-key"
]);

function isMissingOrPlaceholder(value: string | undefined) {
  return !value || PLACEHOLDER_VALUES.has(value);
}

export function getSupabaseConfigStatus() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const issues: string[] = [];

  if (isMissingOrPlaceholder(url)) {
    issues.push("NEXT_PUBLIC_SUPABASE_URL is missing or still using the sample value.");
  }

  if (isMissingOrPlaceholder(anonKey)) {
    issues.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or still using the sample value.");
  }

  return {
    url,
    anonKey,
    isConfigured: issues.length === 0,
    issues
  };
}

export function assertSupabaseConfigured() {
  const status = getSupabaseConfigStatus();

  if (!status.isConfigured) {
    throw new Error(
      `Supabase is not configured. ${status.issues.join(" ")} Update .env.local with your real Supabase project values and restart the dev server.`
    );
  }

  return {
    url: status.url!,
    anonKey: status.anonKey!
  };
}

export function getFriendlyActionError(error: unknown) {
  if (error instanceof Error) {
    if (
      error.message.includes("Supabase is not configured") ||
      error.message.includes("Missing environment variable")
    ) {
      return "Supabase is not configured yet. Add your real project URL and anon key in .env.local, then restart the app.";
    }

    if (error.message.toLowerCase().includes("fetch failed")) {
      return "Could not reach Supabase. Check the project URL and anon key in .env.local, then confirm your Supabase project is available.";
    }

    return error.message;
  }

  return "Something went wrong. Please try again.";
}
