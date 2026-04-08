type StatCardProps = {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning";
};

export function StatCard({ label, value, tone = "default" }: StatCardProps) {
  const toneStyles = {
    default: "bg-[#111821]",
    success: "bg-[#102019]",
    warning: "bg-[#20180f]"
  };

  return (
    <div className={`card px-5 py-4 ${toneStyles[tone]}`}>
      <p className="text-sm text-white/60">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}
