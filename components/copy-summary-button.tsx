"use client";

import { useState, useTransition } from "react";

type CopySummaryButtonProps = {
  text: string;
};

export function CopySummaryButton({ text }: CopySummaryButtonProps) {
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          try {
            if (typeof navigator === "undefined" || !navigator.clipboard) {
              throw new Error("Clipboard is not available");
            }

            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          } catch {
            setCopied(false);
          }
        })
      }
      className="min-h-11 rounded-2xl border border-sand bg-[#131a22] px-4 py-2 text-sm font-medium text-ink hover:border-pine/30 hover:bg-[#18212b] hover:text-white"
    >
      {pending ? "Copying..." : copied ? "Copied" : "Copy summary"}
    </button>
  );
}
