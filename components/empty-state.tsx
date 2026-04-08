type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-sand bg-[#0f151c] p-6 text-sm text-white/60">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1">{description}</p>
    </div>
  );
}
