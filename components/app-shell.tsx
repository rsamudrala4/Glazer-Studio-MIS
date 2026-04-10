import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  currentPath: string;
  organizationName: string;
  overdueCount: number;
  userName: string;
  accessLevel: "admin" | "employee" | "summary_viewer";
};

const workingNavItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks", label: "Tasks" },
  { href: "/team-summary", label: "Team Summary" }
];

const viewerNavItems = [{ href: "/team-summary", label: "Team Summary" }];

export function AppShell({
  children,
  currentPath,
  organizationName,
  overdueCount,
  userName,
  accessLevel
}: AppShellProps) {
  const navItems =
    accessLevel === "summary_viewer"
      ? viewerNavItems
      : accessLevel === "admin"
        ? [...workingNavItems, { href: "/settings", label: "Settings" }]
        : workingNavItems;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(98,226,155,0.10),_transparent_22%),linear-gradient(180deg,_#0a0f14_0%,_#0d131a_48%,_#090d12_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 md:px-6">
        <header className="mb-8 flex flex-col gap-5 rounded-[28px] border border-sand/90 bg-[#0f151c]/95 px-6 py-5 shadow-soft md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-pine/90">
              GLAZER STUDIO MIS
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white">{organizationName}</h1>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <div className="flex flex-wrap items-center gap-2 text-sm text-ink/80">
              <span>{userName}</span>
              <span className="rounded-full border border-sand bg-[#131a22] px-2.5 py-1 text-xs font-medium text-white/70">
                {accessLevel === "summary_viewer"
                  ? "Summary viewer"
                  : accessLevel === "admin"
                    ? "Admin"
                    : "Employee"}
              </span>
              {accessLevel !== "summary_viewer" ? (
                <span className="rounded-full border border-pine/20 bg-pine/10 px-2.5 py-1 text-xs font-medium text-pine">
                  {overdueCount} overdue
                </span>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <nav className="flex flex-wrap gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "min-h-11 rounded-full px-4 py-2.5 text-sm font-medium",
                      currentPath === item.href
                        ? "bg-pine text-[#08110d] shadow-glow"
                        : "border border-sand bg-[#131a22] text-ink/78 hover:border-pine/30 hover:bg-[#18212b] hover:text-white"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <form action={signOutAction}>
                <button className="min-h-11 rounded-full border border-sand bg-[#131a22] px-4 py-2.5 text-sm font-medium text-ink hover:border-pine/30 hover:bg-[#18212b] hover:text-white">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
