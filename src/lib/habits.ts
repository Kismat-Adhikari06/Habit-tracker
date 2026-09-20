export type Habit = {
  id: string;
  name: string;
  icon: string;
  color: string;
  unit: string;
  entries: HabitEntry[];
};

export type HabitEntry = {
  date: string; // ISO date (UTC midnight)
  value: number;
};

export type HabitWithStats = Habit & {
  heatmapWeeks: HeatmapDay[][];
  currentStreak: number;
  longestStreak: number;
  total: number;
  last30: number;
};

export type AggregatedHeatmap = {
  /** column-major columns × rows (rows=7 for yearly, 1 for daily/weekly) */
  columns: HeatmapDay[][];
  /** optional label per column (rendered across the top) */
  labels: string[];
  /** grid shape hint for rendering */
  mode: ViewMode;
};

export type HeatmapDay = {
  date: string;
  value: number;
  /** 0 = no activity, 1..4 = intensity level */
  level: 0 | 1 | 2 | 3 | 4;
};

const DAYS = 366; // ~12 months of heatmap history

export type ViewMode = "daily" | "weekly" | "yearly";

export function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Build a column-major grid of weeks (like GitHub): each column is a week,
 * each row is a weekday (Mon..Sun), ending on today.
 */
export function buildHeatmap(entries: HabitEntry[]): { weeks: HeatmapDay[][]; days: HeatmapDay[] } {
  const byDate = new Map(entries.map((e) => [e.date, e.value]));
  const today = utcMidnight(new Date());

  // Align the end to a Saturday so the last week column is full
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (DAYS - 1));

  const weeks: HeatmapDay[][] = [];
  const days: HeatmapDay[] = [];

  for (let w = 0; w < DAYS / 7; w++) {
    const week: HeatmapDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + w * 7 + d);
      const iso = toISODate(date);
      const value = byDate.get(iso) ?? 0;
      const day: HeatmapDay = { date: iso, value, level: 0 };
      week.push(day);
      days.push(day);
    }
    weeks.push(week);
  }

  return { weeks, days };
}

/** Last ~30 days: one column per day, single row. */
export function buildDailyHeatmap(entries: HabitEntry[], target?: number, type?: string): { columns: HeatmapDay[][]; labels: string[] } {
  const byDate = new Map(entries.map((e) => [e.date, e.value]));
  const today = utcMidnight(new Date());
  const days = 30;

  const columns: HeatmapDay[][] = [];
  const labels: string[] = [];
  const flat: HeatmapDay[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - i);
    const iso = toISODate(date);
    const day: HeatmapDay = { date: iso, value: byDate.get(iso) ?? 0, level: 0 };
    columns.push([day]);
    flat.push(day);
    // Clean date label every 5 columns
    labels.push(i % 5 === 0 ? `${date.getUTCDate()}` : "");
  }

  computeLevels(flat, target, type);
  return { columns, labels };
}

/** Last ~16 weeks: one column per week, all values aggregated. */
export function buildWeeklyHeatmap(entries: HabitEntry[], target?: number, type?: string): { columns: HeatmapDay[][]; labels: string[] } {
  const weeks = 16;
  const today = utcMidnight(new Date());

  // Align the end to a full week (Sat) like the yearly view
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (weeks * 7 - 1));

  const byDate = new Map(entries.map((e) => [e.date, e.value]));
  const columns: HeatmapDay[][] = [];
  const labels: string[] = [];
  const flat: HeatmapDay[] = [];

  for (let w = 0; w < weeks; w++) {
    let total = 0;
    let activeDays = 0;
    let weekStart: Date | null = null;
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + w * 7 + d);
      if (!weekStart) weekStart = date;
      const v = byDate.get(toISODate(date)) ?? 0;
      total += v;
      if (v > 0) activeDays++;
    }
    const day: HeatmapDay = { date: toISODate(weekStart!), value: Math.round(total * 10) / 10, level: 0 };
    columns.push([day]);
    flat.push(day);
    const prev = w > 0 ? new Date(columns[w - 1][0].date + "T00:00:00Z") : null;
    const monthChanged = !prev || prev.getUTCMonth() !== weekStart!.getUTCMonth();
    labels.push(monthChanged ? MONTH_NAMES[weekStart!.getUTCMonth()] : "");
    day.level = 0;
    // track active days for tooltip via value only; keep simple
    void activeDays;
  }

  computeLevels(flat, target, type);
  return { columns, labels };
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Build the aggregated heatmap for a given view mode from the same entry data.
 */
export function buildHeatmapForMode(entries: HabitEntry[], mode: ViewMode, target?: number, type?: string): AggregatedHeatmap {
  if (mode === "daily") {
    const { columns, labels } = buildDailyHeatmap(entries, target, type);
    return { columns, labels, mode };
  }
  if (mode === "weekly") {
    const { columns, labels } = buildWeeklyHeatmap(entries, target, type);
    return { columns, labels, mode };
  }
  const { weeks } = buildHeatmap(entries);
  const days = weeks.flat();
  computeLevels(days, target, type);
  return { columns: weeks, labels: [], mode };
}

/**
 * Intensity level from progress toward the habit's daily target:
 * 0% empty · 1–25% light · 26–50% medium-light · 51–75% medium ·
 * 76%+ strongest. Boolean habits: incomplete = empty, complete = full.
 */
export function levelForValue(value: number, target?: number, type?: string): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0) return 0;
  if (type === "boolean") return 4;
  if (!target || target <= 0) return 4;
  const ratio = value / target;
  if (ratio >= 0.76) return 4;
  if (ratio >= 0.51) return 3;
  if (ratio >= 0.26) return 2;
  return 1;
}

/** Assign 0-4 intensity levels based on the habit's own activity distribution. */
export function computeLevels(days: HeatmapDay[], target?: number, type?: string): void {
  if (type === "boolean") {
    // Boolean habits: any activity = full intensity
    for (const day of days) day.level = day.value > 0 ? 4 : 0;
    return;
  }
  if (target && target > 0) {
    // Progress toward daily target: 1–25 / 26–50 / 51–75 / 76–99 / 100+
    for (const day of days) {
      const ratio = day.value / target;
      day.level = day.value <= 0 ? 0 : ratio >= 0.76 ? 4 : ratio >= 0.51 ? 3 : ratio >= 0.26 ? 2 : 1;
      // (levels mirror levelForValue)
    }
    return;
  }
  const active = days.filter((d) => d.value > 0).map((d) => d.value);
  if (active.length === 0) return;
  active.sort((a, b) => a - b);
  const q = (p: number) => active[Math.min(active.length - 1, Math.floor(p * active.length))];

  for (const day of days) {
    if (day.value <= 0) day.level = 0;
    else if (day.value <= q(0.25)) day.level = 1;
    else if (day.value <= q(0.5)) day.level = 2;
    else if (day.value <= q(0.75)) day.level = 3;
    else day.level = 4;
  }
}

/** Number of consecutive active days ending today (or yesterday, for grace). */
export function computeCurrentStreak(entries: HabitEntry[]): number {
  const active = new Set(entries.filter((e) => e.value > 0).map((e) => e.date));
  const today = utcMidnight(new Date());
  let streak = 0;
  const cursor = new Date(today);
  if (!active.has(toISODate(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!active.has(toISODate(cursor))) return 0;
  }
  while (active.has(toISODate(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export function computeLongestStreak(entries: HabitEntry[]): number {
  const dates = entries
    .filter((e) => e.value > 0)
    .map((e) => new Date(e.date).getTime())
    .sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const t of dates) {
    const expected = prev === null ? t : prev + 86_400_000;
    run = t === expected ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = t;
  }
  return longest;
}

/** Enrich a raw habit with heatmap grid + derived stats. */
export function withStats(habit: Habit & { target?: number; type?: string }): HabitWithStats {
  const entries = habit.entries;
  const { weeks, days } = buildHeatmap(entries);
  computeLevels(days, habit.target, habit.type);

  const total = entries.reduce((sum, e) => sum + e.value, 0);
  const cutoff = toISODate(new Date(Date.now() - 30 * 86_400_000));
  const last30 = entries.filter((e) => e.date >= cutoff).reduce((sum, e) => sum + e.value, 0);

  return {
    ...habit,
    heatmap: days,
    heatmapWeeks: weeks,
    currentStreak: computeCurrentStreak(entries),
    longestStreak: computeLongestStreak(entries),
    total: Math.round(total * 10) / 10,
    last30: Math.round(last30 * 10) / 10,
  } as HabitWithStats;
}
