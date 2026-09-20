"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Fixed banner shown when the browser reports offline connectivity.
 * Listens to online/offline events and re-checks periodically while
 * offline in case the event is missed (e.g. suspended PWA tab).
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();

    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    // Poll while offline so "back online" is picked up even if the
    // online event doesn't fire (backgrounded installed app).
    let timer: ReturnType<typeof setInterval> | null = null;
    if (!navigator.onLine) {
      timer = setInterval(update, 5000);
    }

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      if (timer) clearInterval(timer);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[60] safe-top"
    >
      <div className="flex items-center justify-center gap-2 bg-amber-500/90 px-4 py-1.5 text-xs font-medium text-neutral-950">
        <WifiOff className="size-3.5" />
        You're offline — changes will sync when you reconnect
      </div>
    </div>
  );
}
