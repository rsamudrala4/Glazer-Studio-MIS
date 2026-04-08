type AuthCardProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="card w-full max-w-md px-6 py-7 backdrop-blur">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-pine/90">
          GLAZER STUDIO MIS
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-2 text-sm text-white/65">{description}</p>
      </div>
      <div>{children}</div>
      {footer ? <div className="mt-5 text-sm text-white/65">{footer}</div> : null}
    </div>
  );
}
