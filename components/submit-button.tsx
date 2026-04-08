"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

type SubmitButtonProps = {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
};

export function SubmitButton({
  children,
  className,
  pendingLabel = "Saving..."
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-2xl bg-pine px-4 py-2.5 text-sm font-semibold text-[#07100c] shadow-glow hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-65",
        className
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
