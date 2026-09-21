"use client";

import { useState } from "react";
import { Check, Download, Share, Smartphone } from "lucide-react";
import { useInstallState } from "@/lib/use-install";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (/Macintosh/i.test(navigator.userAgent) && "maxTouchPoints" in navigator && navigator.maxTouchPoints > 1)
  );
}

/**
 * Settings-page install section. Gives a big "Install app" affordance that
 * works across every path to installing a PWA:
 * - Chrome/Android: fires the native beforeinstallprompt dialog.
 * - iOS Safari: shows Share -> Add to Home Screen steps (no native prompt exists).
 * - Installed/standalone: shows a green "installed" confirmation.
 * - Non-secure context: explains the https requirement instead of silently hiding.
 */
export function InstallAppCard() {
  const { canInstall, installed, promptInstall } = useInstallState();
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  if (installed) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
          <Check className="size-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-emerald-200">App installed</p>
          <p className="text-[11px] text-emerald-400/70">
            Habit Activity is running on your home screen.
          </p>
        </div>
      </div>
    );
  }

  if (canInstall) {
    return (
      <div className="flex flex-col gap-3">
        <Button
          onClick={() => void promptInstall()}
          className="h-11 w-full bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
        >
          <Download className="size-4" />
          Download app to home screen
        </Button>
        <p className="text-[11px] leading-relaxed text-neutral-500">
          Installs as a standalone app — no address bar, works like a native app on your home screen.
        </p>
      </div>
    );
  }

  if (isIOS()) {
    return (
      <div className="flex flex-col gap-3">
        <Button
          onClick={() => setShowIOSSteps((v) => !v)}
          className={cn(buttonVariants({ variant: "secondary" }), "h-11 w-full")}
        >
          <Smartphone className="size-4" />
          Install on your iPhone
        </Button>
        {showIOSSteps && (
          <ol className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
            <li className="flex gap-2">
              <span className="flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-neutral-800 text-[11px] font-semibold text-neutral-300">1</span>
              Tap the <Share className="inline size-4 -translate-y-px" /> <strong>Share</strong> button in Safari
            </li>
            <li className="flex gap-2">
              <span className="flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-neutral-800 text-[11px] font-semibold text-neutral-300">2</span>
              Scroll and choose <strong>Add to Home Screen</strong>
            </li>
            <li className="flex gap-2">
              <span className="flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-neutral-800 text-[11px] font-semibold text-neutral-300">3</span>
              Tap <strong>Add</strong> — the app icon appears on your home screen
            </li>
          </ol>
        )}
      </div>
    );
  }

  return (
    <p className="text-[11px] leading-relaxed text-neutral-500">
      To install this app you need to open it over HTTPS or localhost first. This page is currently
      being served over plain HTTP, which browsers don&apos;t treat as installable.
    </p>
  );
}