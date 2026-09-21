"use client";

import { useState } from "react";
import { Flame, Loader2, RefreshCw } from "lucide-react";
import { ActivityHeatmap } from "@/components/activity-heatmap";
import { HabitIcon } from "@/components/habit-icon";
import { HabitDetailDialog } from "@/components/habit-detail-dialog";
import { syncGitHubContributionsAction } from "@/app/github-actions";
import type { HabitWithStatsDTO } from "@/app/actions";

type Props = {
  habit: HabitWithStatsDTO;
  refetch: () => void;
};

const LEVEL_PERCENT = [0, 25, 44, 63, 100];

export function HabitCard({ habit, refetch }: Props) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const isGitHubHabit = habit.name === "GitHub Activity";

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    await syncGitHubContributionsAction();
    setSyncing(false);
    refetch();
  }
  const { name, icon, color, unit, currentStreak, longestStreak, total, heatmap, runningTimer } = habit;

  const timerActiveHere = runningTimer != null;
  const timerElapsedMin = timerActiveHere
    ? Math.max(0, Math.floor((Date.now() - (runningTimer?.startedAt ?? 0)) / 60000))
    : 0;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setDetailOpen(true)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setDetailOpen(true)}
        className="cursor-pointer overflow-hidden rounded-xl border border-neutral-800/70 bg-neutral-900/60 p-4 transition-colors hover:border-neutral-700/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600"
      >
        {/* Header row: identity left, stats right */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-2.5">
            <span
              className="flex size-8 items-center justify-center rounded-lg"
              style={{
                color,
                backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
              }}
            >
              <HabitIcon name={icon} className="size-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold leading-tight tracking-tight text-neutral-100">
                {name}
              </h3>
              <p className="text-[11px] leading-tight text-neutral-500">{unit}</p>
            </div>
            {timerActiveHere && (
              <span className="ml-1 flex items-center gap-1 rounded-full border border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-400">
                <span className="size-1.5 animate-pulse rounded-full" style={{ backgroundColor: color }} />
                {timerElapsedMin}m
              </span>
            )}
            {isGitHubHabit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSync();
                }}
                aria-label="Sync GitHub contributions"
                title="Sync GitHub contributions"
                className="ml-1 flex size-6 items-center justify-center rounded-full border border-neutral-800 text-neutral-500 transition-colors hover:border-neutral-600 hover:text-neutral-200"
              >
                {syncing ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
              </button>
            )}
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="flex items-center gap-1.5 text-neutral-400">
              <Flame className="size-3.5" style={{ color }} />
              <span className="font-semibold tabular-nums text-neutral-200">{currentStreak}</span>
              day streak
            </span>
            <span className="hidden text-neutral-600 sm:inline">·</span>
            <span className="hidden text-neutral-400 sm:inline">
              best <span className="font-semibold tabular-nums text-neutral-200">{longestStreak}</span>
            </span>
            <span className="hidden text-neutral-600 sm:inline">·</span>
            <span className="text-neutral-400">
              <span className="font-semibold tabular-nums text-neutral-200">
                {total.toLocaleString()}
              </span>{" "}
              {unit} total
            </span>
          </div>
        </div>

        {/* Heatmap fills the card width */}
        <ActivityHeatmap data={heatmap} color={color} unit={unit} />

        {/* Footer: legend bottom-right */}
        <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-neutral-500">
          <span className="mr-0.5">Less</span>
          {LEVEL_PERCENT.map((percent, level) => (
            <span
              key={level}
              className="size-[9px] rounded-[2px]"
              style={{
                backgroundColor:
                  level === 0
                    ? "rgba(255,255,255,0.055)"
                    : `color-mix(in srgb, ${color} ${percent}%, transparent)`,
              }}
            />
          ))}
          <span className="ml-0.5">More</span>
        </div>
      </div>

      <HabitDetailDialog
        habit={habit}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        timerActive={timerActiveHere}
        timerElapsedMin={timerElapsedMin}
        onChanged={refetch}
      />
    </>
  );
}
