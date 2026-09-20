"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { toISODate, utcMidnight, type Habit, type HabitEntry } from "@/lib/habits";
import type { ViewMode } from "@/lib/habits";
import { buildHeatmapForMode, computeCurrentStreak, computeLongestStreak, type AggregatedHeatmap } from "@/lib/habits";
import type { TrackingType } from "@/lib/types";
import { getSessionUser, requireUser } from "@/lib/auth";

// ---- DTOs shared with client components ----

export type HabitDTO = {
  id: string;
  name: string;
  icon: string;
  color: string;
  trackingType: TrackingType;
  unit: string;
  target?: number;
  createdAt: string;
  entries: { date: string; value: number }[];
  /** running timer session for this habit, if any */
  runningTimer?: { startedAt: number } | null;
};

export type HabitWithStatsDTO = HabitDTO & {
  heatmap: AggregatedHeatmap;
  currentStreak: number;
  longestStreak: number;
  total: number;
};

// ---- Queries (called from server components) ----

export async function getHabits(mode: ViewMode = "yearly"): Promise<HabitWithStatsDTO[]> {
  const user = await getSessionUser();
  const [habits, runningSessions] = await Promise.all([
    prisma.habit.findMany({
      where: user ? { userId: user.id } : { userId: null },
      include: { activityEntries: { orderBy: { date: "asc" } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.timerSession.findMany({
      where: {
        endedAt: null,
        habit: user ? { userId: user.id } : { userId: null },
      },
    }),
  ]);

  const runningByHabit = new Map(runningSessions.map((s) => [s.habitId, s]));

  return habits.map((h) => {
    const entries: HabitEntry[] = h.activityEntries.map((e) => ({
      date: toISODate(e.date),
      value: e.value,
    }));

    const target = h.target ?? undefined;
    const habit: Habit = { id: h.id, name: h.name, icon: h.icon, color: h.color, unit: h.unit, entries };

    return {
      id: h.id,
      name: h.name,
      icon: h.icon,
      color: h.color,
      trackingType: h.trackingType as TrackingType,
      unit: h.unit,
      target,
      createdAt: h.createdAt.toISOString(),
      entries,
      runningTimer: runningByHabit.has(h.id)
        ? { startedAt: runningByHabit.get(h.id)!.startedAt.getTime() }
        : null,
      heatmap: buildHeatmapForMode(entries, mode, target, h.trackingType),
      currentStreak: computeCurrentStreak(entries),
      longestStreak: computeLongestStreak(entries),
      total: Math.round(entries.reduce((sum, e) => sum + e.value, 0) * 100) / 100,
    };
  });
}

// ---- Mutations ----

export async function createHabitAction(input: {
  name: string;
  icon: string;
  color: string;
  trackingType: TrackingType;
  unit: string;
  target?: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (!input.name.trim()) return { ok: false, error: "Name is required" };
    const user = await requireUser();
    await prisma.habit.create({
      data: {
        name: input.name.trim(),
        icon: input.icon,
        color: input.color,
        trackingType: input.trackingType,
        unit: input.unit.trim() || "done",
        target: input.target && input.target > 0 ? input.target : null,
        userId: user.id,
      },
    });
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("createHabitAction failed", e);
    return { ok: false, error: "Could not create habit" };
  }
}

/** Add `amount` to the habit's entry for the given date (defaults to today). */
export async function addActivityAction(
  habitId: string,
  amount: number,
  date?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (!Number.isFinite(amount) || amount === 0) return { ok: false, error: "Invalid amount" };
    const user = await requireUser();
    // Ownership check: the habit must belong to the session user.
    const owned = await prisma.habit.findFirst({ where: { id: habitId, userId: user.id } });
    if (!owned) return { ok: false, error: "Habit not found" };
    const iso = date ?? toISODate(new Date());
    const day = utcMidnight(new Date(iso + "T00:00:00Z"));

    await prisma.activityEntry.upsert({
      where: { habitId_date: { habitId, date: day } },
      create: { habitId, date: day, value: amount },
      update: { value: { increment: amount } },
    });
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("addActivityAction failed", e);
    return { ok: false, error: "Could not save activity" };
  }
}

/** Set (replace) the habit's entry value for a date; removes it when amount <= 0. */
export async function setActivityAction(
  habitId: string,
  amount: number,
  date?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireUser();
    const owned = await prisma.habit.findFirst({ where: { id: habitId, userId: user.id } });
    if (!owned) return { ok: false, error: "Habit not found" };
    const iso = date ?? toISODate(new Date());
    const day = utcMidnight(new Date(iso + "T00:00:00Z"));

    if (amount <= 0) {
      await prisma.activityEntry.deleteMany({ where: { habitId, date: day } });
    } else {
      await prisma.activityEntry.upsert({
        where: { habitId_date: { habitId, date: day } },
        create: { habitId, date: day, value: amount },
        update: { value: amount },
      });
    }
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("setActivityAction failed", e);
    return { ok: false, error: "Could not save activity" };
  }
}

/** Boolean habits: toggle today's completion. */
export async function toggleTodayAction(habitId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireUser();
    const owned = await prisma.habit.findFirst({ where: { id: habitId, userId: user.id } });
    if (!owned) return { ok: false, error: "Habit not found" };
    const iso = toISODate(new Date());
    const day = utcMidnight(new Date(iso + "T00:00:00Z"));
    const existing = await prisma.activityEntry.findUnique({
      where: { habitId_date: { habitId, date: day } },
    });
    return setActivityAction(habitId, existing && existing.value > 0 ? 0 : 1);
  } catch (e) {
    console.error("toggleTodayAction failed", e);
    return { ok: false, error: "Could not toggle habit" };
  }
}

// ---- Client-facing fetch (dynamic import target; revalidatePath not allowed here) ----

export async function fetchHabitsClient(mode: ViewMode): Promise<HabitWithStatsDTO[]> {
  return getHabits(mode);
}

// ---- Timer sessions ----

export async function startTimerAction(habitId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireUser();
    // Single timer at a time (within the user's habits): close any of their
    // running sessions without logging.
    await prisma.timerSession.updateMany({
      where: { endedAt: null, habit: { userId: user.id } },
      data: { endedAt: new Date() },
    });
    // Ownership check before creating a session.
    const owned = await prisma.habit.findFirst({ where: { id: habitId, userId: user.id } });
    if (!owned) return { ok: false, error: "Habit not found" };
    await prisma.timerSession.create({ data: { habitId, startedAt: new Date() } });
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("startTimerAction failed", e);
    return { ok: false, error: "Could not start timer" };
  }
}

/** Stop the running session, persist it, and log its minutes as activity. */
export async function stopTimerAction(): Promise<{ ok: true; minutes?: number } | { ok: false; error: string }> {
  try {
    const user = await requireUser();
    const running = await prisma.timerSession.findFirst({
      where: { endedAt: null, habit: { userId: user.id } },
    });
    if (!running) return { ok: false, error: "No running timer" };

    const endedAt = new Date();
    const minutes = Math.max(1, Math.round((endedAt.getTime() - running.startedAt.getTime()) / 60000));

    await prisma.$transaction([
      prisma.timerSession.update({ where: { id: running.id }, data: { endedAt, duration: minutes } }),
      prisma.activityEntry.upsert({
        where: { habitId_date: { habitId: running.habitId, date: utcMidnight(new Date()) } },
        create: { habitId: running.habitId, date: utcMidnight(new Date()), value: minutes },
        update: { value: { increment: minutes } },
      }),
    ]);
    revalidatePath("/");
    return { ok: true, minutes };
  } catch (e) {
    console.error("stopTimerAction failed", e);
    return { ok: false, error: "Could not stop timer" };
  }
}

/** Discard the running session without logging activity. */
export async function discardTimerAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireUser();
    await prisma.timerSession.updateMany({
      where: { endedAt: null, habit: { userId: user.id } },
      data: { endedAt: new Date(), duration: 0 },
    });
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("discardTimerAction failed", e);
    return { ok: false, error: "Could not discard timer" };
  }
}
