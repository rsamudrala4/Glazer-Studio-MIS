"use client";

import { useMemo, useRef, useState } from "react";
import { formatTimeLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

type TimeSelectFieldProps = {
  name: string;
  defaultValue?: string | null;
};

type PickerStep = "hour" | "minute";

const hourValues = Array.from({ length: 12 }, (_, index) => index + 1);
const minuteValues = Array.from({ length: 12 }, (_, index) => index * 5);

function parseInitialValue(value?: string | null) {
  if (!value || value === "null" || value === "undefined") {
    return {
      hour: 9,
      minute: 0,
      period: "AM" as const,
      hasValue: false
    };
  }

  const [rawHour = "00", rawMinute = "00"] = value.slice(0, 5).split(":");
  const hour24 = Number(rawHour);
  const minute = Number(rawMinute);

  if (!Number.isInteger(hour24) || !Number.isInteger(minute)) {
    return {
      hour: 9,
      minute: 0,
      period: "AM" as const,
      hasValue: false
    };
  }

  return {
    hour: hour24 % 12 === 0 ? 12 : hour24 % 12,
    minute: minuteValues.includes(minute) ? minute : 0,
    period: hour24 >= 12 ? ("PM" as const) : ("AM" as const),
    hasValue: true
  };
}

function toStoredValue(hour: number, minute: number, period: "AM" | "PM", hasValue: boolean) {
  if (!hasValue) return "";

  let hour24 = hour % 12;
  if (period === "PM") hour24 += 12;

  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function getClockPosition(index: number, total: number, radius: number) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const x = 50 + Math.cos(angle) * radius;
  const y = 50 + Math.sin(angle) * radius;

  return {
    left: `${x}%`,
    top: `${y}%`
  };
}

export function TimeSelectField({ name, defaultValue }: TimeSelectFieldProps) {
  const initial = useMemo(() => parseInitialValue(defaultValue), [defaultValue]);
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<PickerStep>("hour");
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [period, setPeriod] = useState<"AM" | "PM">(initial.period);
  const [hasValue, setHasValue] = useState(initial.hasValue);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const storedValue = toStoredValue(hour, minute, period, hasValue);
  const label = hasValue ? formatTimeLabel(storedValue) : "Any time";

  return (
    <div className="relative" ref={wrapperRef}>
      <input type="hidden" name={name} value={storedValue === "null" ? "" : storedValue} />

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-sand bg-[#101821] px-4 py-3 text-left text-sm text-ink transition hover:border-pine/30 hover:bg-[#131d27]"
      >
        <span>{label}</span>
        <span className="text-xs text-white/45">{hasValue ? "Tap to change" : "Select time"}</span>
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-[calc(100%+0.6rem)] z-30 w-[320px] max-w-[calc(100vw-2rem)] rounded-[24px] border border-sand/90 bg-[#0f151c] p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{label}</p>
              <p className="mt-1 text-xs text-white/45">Choose hour, then minutes</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full border border-sand bg-[#131a22] px-3 py-1.5 text-xs font-medium text-ink hover:border-pine/30 hover:bg-[#18212b] hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep("hour")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                step === "hour"
                  ? "bg-pine text-[#07100c]"
                  : "border border-sand bg-[#131a22] text-white/65"
              )}
            >
              Hour
            </button>
            <button
              type="button"
              onClick={() => setStep("minute")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                step === "minute"
                  ? "bg-pine text-[#07100c]"
                  : "border border-sand bg-[#131a22] text-white/65"
              )}
            >
              Minutes
            </button>
            <div className="ml-auto flex items-center gap-2">
              {(["AM", "PM"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setPeriod(value);
                    setHasValue(true);
                  }}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold",
                    period === value
                      ? "bg-pine text-[#07100c]"
                      : "border border-sand bg-[#131a22] text-white/65"
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="relative mx-auto mt-5 h-64 w-64 rounded-full border border-sand/90 bg-[radial-gradient(circle_at_center,_rgba(98,226,155,0.12),_rgba(15,21,28,0.92)_58%)]">
            <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pine" />

            {(step === "hour" ? hourValues : minuteValues).map((value, index, values) => {
              const position = getClockPosition(index, values.length, 38);
              const isSelected = step === "hour" ? hour === value : minute === value;
              const displayValue =
                step === "hour" ? String(value) : String(value).padStart(2, "0");

              return (
                <button
                  key={`${step}-${value}`}
                  type="button"
                  onClick={() => {
                    setHasValue(true);
                    if (step === "hour") {
                      setHour(value);
                      setStep("minute");
                    } else {
                      setMinute(value);
                    }
                  }}
                  className={cn(
                    "absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-sm font-semibold transition",
                    isSelected
                      ? "bg-pine text-[#07100c] shadow-glow"
                      : "border border-sand bg-[#131a22] text-white hover:border-pine/30 hover:bg-[#18212b]"
                  )}
                  style={position}
                >
                  {displayValue}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setHasValue(false);
                setIsOpen(false);
              }}
              className="rounded-2xl border border-sand bg-[#131a22] px-4 py-2 text-sm font-medium text-ink hover:border-pine/30 hover:bg-[#18212b] hover:text-white"
            >
              Clear time
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-2xl bg-pine px-4 py-2 text-sm font-semibold text-[#07100c] shadow-glow hover:bg-pine/90"
            >
              Use time
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
