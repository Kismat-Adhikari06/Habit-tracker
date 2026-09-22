/**
 * Client helpers for the native Capacitor UsageStats plugin.
 *
 * Every function is a safe no-op when running in a plain browser tab — the
 * plugin only exists inside the installed Android app. The plugin also
 * requires the user to grant "Usage access" on the phone (Settings → Usage
 * access), which is why callers check hasUsageAccess() first.
 */

export type UsageToday = {
  date: string;
  totalMinutes: number;
  apps: Record<string, number>;
};

type UsageStatsPluginApi = {
  checkPermission: () => Promise<{ granted: boolean }>;
  openSettings: () => Promise<void>;
  /** Per-app foreground time in ms between sinceMs and now. */
  querySince: (sinceMs: number) => Promise<UsageToday>;
};

function usageStats(): UsageStatsPluginApi | null {
  const capacitor = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean; Plugins?: Record<string, unknown> } }).Capacitor;
  if (!capacitor?.isNativePlatform?.()) return null;
  return (capacitor.Plugins?.UsageStats as UsageStatsPluginApi | undefined) ?? null;
}

export function isNativePlatform(): boolean {
  const capacitor = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(capacitor?.isNativePlatform?.());
}

export async function hasUsageAccess(): Promise<boolean> {
  const plugin = usageStats();
  if (!plugin) return false;
  try {
    const result = await plugin.checkPermission();
    return Boolean(result.granted);
  } catch {
    return false;
  }
}

export function openUsageAccessSettings(): void {
  const plugin = usageStats();
  void plugin?.openSettings();
}

export async function querySinceUsage(sinceMs: number): Promise<UsageToday | null> {
  const plugin = usageStats();
  if (!plugin) return null;
  try {
    return await plugin.querySince(sinceMs);
  } catch {
    return null;
  }
}

/** The earliest moment that counts toward today's budget watch: midnight of
 *  the current day. The whole day counts once a budget is set — usage from
 *  earlier that day (before you set the cap) still shows up. */
export function todayWindowStartMs(): number {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  return midnight.getTime();
}

/** Pull usage since `sinceMs` from the native plugin and POST it to the server. */
export async function syncUsageToServer(sinceMs: number): Promise<boolean> {
  const data = await querySinceUsage(sinceMs);
  if (!data) return false;
  try {
    const response = await fetch("/api/usage/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch {
    return false;
  }
}