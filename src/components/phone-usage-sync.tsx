"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Smartphone, Loader2, RefreshCw } from "lucide-react";
import {
  hasUsageAccess,
  isNativePlatform,
  openUsageAccessSettings,
  syncUsageToServer,
  todayWindowStartMs,
} from "@/lib/device-usage";

type Props = {
  /** Called after a successful server sync so the dashboard re-reads rows. */
  onSynced: () => void;
};

const SYNC_INTERVAL_MS = 60 * 1000;

/**
 * Renders nothing outside the Android app.
 *
 * Inside the app it drives the usage pipeline: on first load it checks the
 * "Usage access" permission — if missing, it shows a compact banner with a
 * shortcut to the system settings screen. Once granted, it syncs today's
 * full-day screen time to the server immediately, then every minute while
 * the app is visible, and again whenever you switch back to the app — so the
 * dashboard updates on its own without closing/reopening anything.
 *
 * The whole day counts: once a budget exists for the habit, today's value
 * includes usage from before the budget was set, so "X of Y min used" reflects
 * everything used so far today.
 */
export function PhoneUsageSync({ onSynced }: Props) {
  const [native, setNative] = useState(false);
  const [granted, setGranted] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const onSyncedRef = useRef(onSynced);
  useEffect(() => {
    onSyncedRef.current = onSynced;
  });

  // Detect the Capacitor runtime only after first render so server-rendered
  // HTML (no Capacitor) always matches the initial client paint — avoids the
  // React hydration-match warning.
  useEffect(() => {
    const detect = setTimeout(() => setNative(isNativePlatform()), 0);
    return () => clearTimeout(detect);
  }, []);

  const sync = useCallback(async () => {
    const ok = await syncUsageToServer(todayWindowStartMs());
    if (ok) onSyncedRef.current();
  }, []);

  const checkAccess = useCallback(async () => {
    const allowed = await hasUsageAccess();
    setGranted(allowed);
    if (allowed) void sync();
  }, [sync]);

  // Initial check + periodic re-check interval. The setState calls happen
  // inside the awaited async callback, never synchronously in the body.
  useEffect(() => {
    if (!native) return;
    const first = setTimeout(() => void checkAccess(), 0);
    const interval = setInterval(() => void checkAccess(), SYNC_INTERVAL_MS);

    // Sync again the moment the app/WebView becomes visible again (switching
    // back to the app, or returning from the background) so numbers refresh
    // without a manual reopen.
    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") void checkAccess();
    };
    const refreshOnFocus = () => void checkAccess();
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisible);

    return () => {
      clearTimeout(first);
      clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisible);
    };
  }, [native, checkAccess]);

  async function retry() {
    setChecking(true);
    try {
      await checkAccess();
    } finally {
      setChecking(false);
    }
  }

  if (!native) return null;

  if (granted === false) {
    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
        <div className="flex items-center gap-2.5 text-sm text-amber-200">
          <Smartphone className="size-4 shrink-0 text-amber-400" />
          <span>
            Screen-time tracking needs <span className="font-semibold">Usage access</span>.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void openUsageAccessSettings()}
            className="rounded-lg bg-amber-500/90 px-3 py-1.5 text-xs font-medium text-neutral-950 transition-colors hover:bg-amber-400"
          >
            Grant access
          </button>
          <button
            onClick={() => void retry()}
            disabled={checking}
            aria-label="Retry permission check"
            title="Retry permission check"
            className="flex size-8 items-center justify-center rounded-lg border border-amber-500/40 text-amber-300 transition-colors hover:border-amber-400"
          >
            {checking ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          </button>
        </div>
      </div>
    );
  }

  return null;
}