import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { assertSupabaseConfigured } from "@/lib/env";

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  const { url, anonKey } = assertSupabaseConfigured();

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server components may read auth state in a non-mutable cookies context.
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          } catch {
            // Server components may read auth state in a non-mutable cookies context.
          }
        }
      }
    }
  );
}
