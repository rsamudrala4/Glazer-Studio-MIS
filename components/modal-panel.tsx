"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type ModalPanelProps = {
  triggerLabel?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  triggerClassName?: string;
  triggerContent?: React.ReactNode;
};

export function ModalPanel({
  triggerLabel,
  title,
  description,
  children,
  triggerClassName,
  triggerContent
}: ModalPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  function handleFormSubmit() {
    window.setTimeout(() => setIsOpen(false), 0);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          "inline-flex min-h-11 items-center justify-center rounded-2xl bg-pine px-4 py-2.5 text-sm font-semibold text-[#07100c] shadow-glow hover:bg-pine/90",
          triggerClassName
        )}
      >
        {triggerContent ?? triggerLabel}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#02060b]/70 px-4 py-8 backdrop-blur-sm">
          <div
            className="my-auto w-full max-w-2xl rounded-[28px] border border-sand/90 bg-[#0f151c] shadow-soft"
            onSubmitCapture={handleFormSubmit}
          >
            <div className="flex items-start justify-between gap-4 border-b border-sand/80 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-white">{title}</h2>
                {description ? <p className="mt-1 text-sm text-white/58">{description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-sand bg-[#131a22] px-3 py-1.5 text-xs font-medium text-ink hover:border-pine/30 hover:bg-[#18212b] hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="overflow-visible px-6 py-5 md:max-h-[80vh] md:overflow-y-auto">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
