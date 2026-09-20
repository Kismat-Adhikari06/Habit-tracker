"use client";

import { cn } from "@/lib/utils";
import type { ViewMode } from "@/lib/habits";

const MODES: { value: ViewMode; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "yearly", label: "Yearly" },
];

type Props = {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
};

export function ViewToggle({ value, onChange, className }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Heatmap view mode"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-neutral-800 bg-neutral-900/80 p-1",
        className
      )}
    >
      {MODES.map((mode) => {
        const active = mode.value === value;
        return (
          <button
            key={mode.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(mode.value)}
            className={cn(
              "min-h-[36px] rounded-full px-3.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600",
              active
                ? "bg-neutral-100 text-neutral-900 shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            )}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
