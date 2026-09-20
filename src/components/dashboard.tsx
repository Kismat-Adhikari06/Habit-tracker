"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Flame, Settings } from "lucide-react";
import { HabitCard } from "@/components/habit-card";
import { ViewToggle } from "@/components/view-toggle";
import { CreateHabitDialog } from "@/components/create-habit-dialog";
import { NewHabitButton } from "@/components/new-habit-button";
import { toISODate, type ViewMode } from "@/lib/habits";
import type { HabitWithStatsDTO } from "@/app/actions";

type Props = {
  initialHabits: HabitWithStatsDTO[];
  initialMode: ViewMode;
};

export function Dashboard({ initialHabits, initialMode }: Props) {
  const [habits, setHabits] = useState(initialHabits);
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Re-fetch when the view mode changes (heatmap aggregation happens server-side)
  useEffect(() => {
    if (mode === initialMode) return;
    let cancelled = false;
    import("@/app/actions").then(async ({ fetchHabitsClient }) => {
      const next = await fetchHabitsClient(mode);
      if (!cancelled) setHabits(next);
    });
    return () => {
      cancelled = true;
    };
  }, [mode, initialMode]);

  // Keep elapsed timer display ticking
  const running = habits.find((h) => h.runningTimer)?.runningTimer ?? null;
  const timerActive = running !== null;
  const [, tick] = useState(0);
  useEffect(() => {
    if (!timerActive) return;
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [timerActive, running?.startedAt]);

  const today = toISODate(new Date());
  const activeToday = habits.filter((h) => h.entries.some((e) => e.date === today && e.value > 0)).length;

  /** Apply a server refetch after a mutation (router.refresh alternative). */
  function refetch() {
    startTransition(() => {
      import("@/app/actions").then(async ({ fetchHabitsClient }) => {
        setHabits(await fetchHabitsClient(mode));
      });
    });
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20">
            <Flame className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
              Habit Activity
            </h1>
            <p className="text-xs text-neutral-500">
              {habits.length} habits · {activeToday} active today
              {isPending ? " · saving…" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ViewToggle value={mode} onChange={setMode} />
          <Link
            href="/settings"
            aria-label="Settings"
            className="flex size-9 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900/80 text-neutral-400 transition-colors hover:text-neutral-200"
          >
            <Settings className="size-4" />
          </Link>
        </div>
      </header>

      <main className="flex flex-col gap-4">
        {habits.map((habit) => (
          <HabitCard key={habit.id} habit={habit} refetch={refetch} />
        ))}
        {habits.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-800 p-16 text-center text-sm text-neutral-500">
            No habits yet. Click the + button to create your first one.
          </div>
        )}
      </main>

      <CreateHabitDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refetch} />
      <NewHabitButton onClick={() => setCreateOpen(true)} />
    </div>
  );
}
