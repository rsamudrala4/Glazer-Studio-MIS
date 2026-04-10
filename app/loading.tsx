export default function GlobalLoading() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(98,226,155,0.10),_transparent_22%),linear-gradient(180deg,_#0a0f14_0%,_#0d131a_48%,_#090d12_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 md:px-6">
        <div className="mb-8 rounded-[28px] border border-sand/90 bg-[#0f151c]/95 px-6 py-5 shadow-soft">
          <div className="h-3 w-36 animate-pulse rounded-full bg-white/10" />
          <div className="mt-4 h-8 w-64 animate-pulse rounded-full bg-white/10" />
          <div className="mt-5 flex flex-wrap gap-2">
            <div className="h-11 w-24 animate-pulse rounded-full bg-white/10" />
            <div className="h-11 w-20 animate-pulse rounded-full bg-white/10" />
            <div className="h-11 w-32 animate-pulse rounded-full bg-white/10" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="card h-28 animate-pulse bg-[#10161d]" />
          <div className="card h-48 animate-pulse bg-[#10161d]" />
          <div className="card h-48 animate-pulse bg-[#10161d]" />
        </div>
      </div>
    </main>
  );
}
