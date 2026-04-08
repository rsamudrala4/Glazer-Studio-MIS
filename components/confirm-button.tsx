"use client";

import { cn } from "@/lib/utils";

type ConfirmButtonProps = {
  children: React.ReactNode;
  message: string;
  className?: string;
  name?: string;
  type?: "button" | "submit";
  value?: string;
};

export function ConfirmButton({
  children,
  message,
  className,
  name,
  type = "submit"
  ,
  value
}: ConfirmButtonProps) {
  return (
    <button
      name={name}
      type={type}
      value={value}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
      className={cn(className)}
    >
      {children}
    </button>
  );
}
