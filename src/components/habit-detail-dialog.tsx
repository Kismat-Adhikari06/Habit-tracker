"use client";

import { useEffect, useState } from "react";
import { Play, Square, Plus, Check, Undo2, Timer } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HabitIcon } from "@/components/habit-icon";
import {
  addActivityAction,
  startTimerAction,
  stopTimerAction,
  discardTimerAction,
  toggleTodayAction,
  type HabitWithStatsDTO,
} from "@/app/actions";
import { levelForValue } from "@/lib/habits";
import { cn } from "@/lib/utils";

const QUICK_AMOUNTS: Record<string, { label: string; amount: number }[]> = {
  ml: [
    { label: "+250", amount: 250 },
    { label: "+500", amount: 500 },
    { label: "+750", amount: 750 },
    { label: "+1000", amount: 1000 },
  ],
  L: [
    { label: "+250 ml", amount: 0.25 },
    { label: "+500 ml", amount: 0.5 },
    { label: "+750 ml", amount: 0.75 },
    { label: "+1 L", amount: 1 },
  ],
  km: [
    { label: "+1 km", amount: 1 },
    { label: "+2 km", amount: 2 },
    { label: "+5 km", amount: 5 },
  ],
  mi: [
    { label: "+1 mi", amount: 1 },
    { label: "+3 mi", amount: 3 },
    { label: "+5 mi", amount: 5 },
  ],
  pages: [
    { label: "+10", amount: 10 },
    { label: "+25", amount: 25 },
    { label: "+50", amount: 50 },
  ],
};

type Props = {
  habit: HabitWithStatsDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timerActive: boolean;
  timerElapsedMin: number;
  onChanged: () => void;
};

export function HabitDetailDialog({ habit, open, onOpenChange, timerActive, timerElapsedMin, onChanged }: Props) {
  const [manual, setManual] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset manual input when opening for a different habit
  useEffect(() => {
    setManual("");
  }, [habit?.id, open]);

  if (!habit) return null;
  const { name, icon, color, unit, trackingType: type, target } = habit;
  const today = habit.entries.find((e) => e.date === new Date().toISOString().slice(0, 10))?.value ?? 0;
  const todayLevel = levelForValue(today, target, type);

  function submitManual() {
    const amount = Number(manual);
    if (!manual || Number.isNaN(amount) || amount <= 0 || saving) return;
    setSaving(true);
    addActivityAction(habit!.id, amount).then(() => {
      setSaving(false);
      setManual("");
      onChanged();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-neutral-800 bg-neutral-900 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <span
              className="flex size-8 items-center justify-center rounded-lg"
              style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
            >
              <HabitIcon name={icon} className="size-4" />
            </span>
            {name}
          </DialogTitle>
          <DialogDescription>
            {type === "boolean" ? "Mark today complete" : `Today: ${today} ${unit}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Today's total */}
          <div
            className="flex items-center justify-between rounded-lg border px-4 py-3"
            style={{
              borderColor: `color-mix(in srgb, ${color} 25%, transparent)`,
              backgroundColor: `color-mix(in srgb, ${color} 6%, transparent)`,
            }}
          >
            <span className="text-xs uppercase tracking-wide text-neutral-500">Today&apos;s total</span>
            <span className="flex items-center gap-2">
              <span className="text-xl font-semibold tabular-nums text-neutral-100">
                {type === "boolean" ? (today > 0 ? "Done" : "Not done") : today}
              </span>
              {type !== "boolean" && <span className="text-xs text-neutral-500">{unit}</span>}
              {type !== "boolean" && target ? (
                <span
                  className="ml-1 size-3 rounded-[3px]"
                  style={{
                    backgroundColor: todayLevel === 0 ? "rgba(255,255,255,0.08)" : `color-mix(in srgb, ${color} ${todayLevel * 22 + 8}%, transparent)`,
                  }}
                  title={`Level ${todayLevel} of 4${today >= target ? " — target reached" : ""}`}
                />
              ) : null}
            </span>
          </div>

          {/* Duration: timer */}
          {type === "duration" && (
            <div className="flex flex-col gap-3">
              {timerActive ? (
                <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm text-neutral-300">
                    <Timer className="size-4 animate-pulse" style={{ color }} />
                    Recording… {timerElapsedMin} min
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await discardTimerAction();
                        onChanged();
                      }}
                      className="h-8 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
                    >
                      Discard
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        await stopTimerAction();
                        onChanged();
                      }}
                      className="h-8 bg-neutral-100 text-neutral-900 hover:bg-neutral-300"
                    >
                      <Square className="size-3.5" /> Stop
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={async () => {
                    await startTimerAction(habit.id);
                    onChanged();
                  }}
                  className="w-full"
                  style={{ backgroundColor: color }}
                >
                  <Play className="size-4" /> Start Timer
                </Button>
              )}
            </div>
          )}

          {/* Quantity: quick-add buttons (target-aware step fallback) */}
          {type === "quantity" && (
            <div className="grid grid-cols-4 gap-2">
              {(QUICK_AMOUNTS[unit] ?? defaultQuickAmounts(target)).map((q) => (
                <button
                  key={q.label}
                  onClick={async () => {
                    await addActivityAction(habit.id, q.amount);
                    onChanged();
                  }}
                  className="rounded-lg border border-neutral-800 bg-neutral-950 py-2 text-xs font-medium text-neutral-200 transition-colors hover:border-neutral-600"
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}

          {/* Manual entry (duration / distance / quantity) */}
          {type !== "boolean" && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  value={manual}
                  onChange={(e) => setManual(e.target.value.replace(/[^0-9.]/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && submitManual()}
                  placeholder={`Add ${unit} manually`}
                  inputMode="decimal"
                  className="h-10 w-full rounded-lg border border-neutral-800 bg-neutral-950 pl-3 pr-12 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-600">{unit}</span>
              </div>
              <Button onClick={submitManual} disabled={!manual} className="h-10 bg-neutral-100 text-neutral-900 hover:bg-neutral-300">
                <Plus className="size-4" /> Add
              </Button>
            </div>
          )}

          {/* Boolean: complete toggle */}
          {type === "boolean" && (
            <Button
              onClick={async () => {
                await toggleTodayAction(habit.id);
                onChanged();
              }}
              className={cn("w-full", today > 0 ? "border border-neutral-700 bg-transparent text-neutral-300 hover:bg-neutral-800" : "")}
              style={today > 0 ? undefined : { backgroundColor: color }}
            >
              {today > 0 ? <Undo2 className="size-4" /> : <Check className="size-4" />}
              {today > 0 ? "Undo today" : "Mark today complete"}
            </Button>
          )}

          {target && type !== "boolean" && (
            <p className="text-center text-[11px] text-neutral-600">
              Daily target: {target} {unit} — heatmap intensity scales toward it
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function defaultQuickAmounts(target?: number) {
  // Derive 4 quick-add steps from the target (e.g. target 2000 → +500 each)
  const step = target && target > 0 ? target / 4 : 1;
  return [1, 2, 3, 4].map((n) => ({ label: `+${Math.round(step * n)}`, amount: step * n }));
}
