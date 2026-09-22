import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { utcMidnight } from "@/lib/habits";

/**
 * Phone usage sync endpoint — called by the native Capacitor app.
 *
 * The Android plugin reads UsageStatsManager (per-app + total screen time)
 * and POSTs it here over the session cookie held by the app's WebView.
 *
 * All tracked social apps are COMBINED into a single inverted "budget"
 * habit: the entry value is total social-media minutes for the day, and the
 * habit's target is the daily budget the user set. Heatmap colour is the
 * inverse of GitHub: well under budget = super bright, at/over budget = pale.
 */

const TRACKED_APPS = ["instagram", "tiktok", "twitter", "youtube"] as const;

const COMBINED_DEF = {
  name: "No Scrolling",
  icon: "ban",
  color: "#f97316",
  unit: "min",
  defaultBudget: 60,
};

type SyncBody = {
  date?: string;
  apps?: Record<string, number>;
};

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SyncBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const dateIso =
    typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date
      : new Date().toISOString().slice(0, 10);

  const apps = body.apps ?? {};
  const combinedMinutes =
    Math.round(TRACKED_APPS.reduce((sum, key) => sum + (Number(apps[key]) || 0), 0) * 10) / 10;

  // Keep only the tracked apps, so the stored breakdown never bloats with
  // unrelated packages the phone reports.
  const trackedApps = TRACKED_APPS.reduce<Record<string, number>>((acc, key) => {
    const value = Number(apps[key]);
    if (value > 0) acc[key] = Math.round(value * 10) / 10;
    return acc;
  }, {});

  // Find (or auto-create) the single combined budget habit.
  let habit = await prisma.habit.findFirst({
    where: { name: COMBINED_DEF.name, userId: user.id },
  });
  if (!habit) {
    habit = await prisma.habit.create({
      data: {
        name: COMBINED_DEF.name,
        icon: COMBINED_DEF.icon,
        color: COMBINED_DEF.color,
        trackingType: "budget",
        unit: COMBINED_DEF.unit,
        target: COMBINED_DEF.defaultBudget,
        userId: user.id,
      },
    });
  }
  if (!habit.target && habit.trackingType !== "budget") {
    await prisma.habit.update({
      where: { id: habit.id },
      data: { trackingType: "budget", unit: COMBINED_DEF.unit, target: COMBINED_DEF.defaultBudget },
    });
  }

  const day = utcMidnight(new Date(dateIso + "T00:00:00Z"));
  await prisma.activityEntry.upsert({
    where: { habitId_date: { habitId: habit.id, date: day } },
    create: {
      habitId: habit.id,
      date: day,
      value: combinedMinutes,
      apps: Object.keys(trackedApps).length > 0 ? trackedApps : undefined,
    },
    update: {
      value: combinedMinutes,
      apps: Object.keys(trackedApps).length > 0 ? trackedApps : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}