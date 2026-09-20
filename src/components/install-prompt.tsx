"use client";

import { useEffect, useState } from "react";
import { Share, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
  // iOS Safari
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS 13+ reports as Mac with touch support
    (/Macintosh/i.test(navigator.userAgent) && "maxTouchPoints" in navigator && navigator.maxTouchPoints > 1)
  );
}

const DISMISS_KEY = "pwa-install-dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(true);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setInstalled(isStandalone());
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");

    const onPrompt = (e: Event) => {
      e.preventDefault(); // suppress the browser's own mini-infobar spam
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Never render once installed/running standalone, or if the user
  // dismissed the hint on this device.
  if (installed || dismissed) return null;

  async function handleInstall() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferred(null); // the event is single-use
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  // Chromium/Android: native prompt is available.
  if (deferred) {
    return (
      <div className="mx-auto mb-6 flex max-w-md items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-3">
        <div className="flex items-center gap-3">
          <Download className="size-4 text-orange-400" />
          <p className="text-sm text-neutral-300">Install Habit Activity</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleInstall} className="h-8 bg-neutral-100 text-neutral-900 hover:bg-neutral-200">
            Install
          </Button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss install suggestion"
            className="px-1 text-xs text-neutral-500 hover:text-neutral-300"
          >
            Later
          </button>
        </div>
      </div>
    );
  }

  // iOS: no programmatic install API — show a one-time hint.
  if (isIOS() && showIOSHint) {
    return (
      <div className="mx-auto mb-6 max-w-md rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-3 text-sm text-neutral-300">
        <p className="flex items-center gap-2 font-medium">
          <Smartphone className="size-4 text-orange-400" /> Add to Home Screen
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">
          Tap the <Share className="inline size-3.5 -translate-y-px" /> <strong>Share</strong> button in
          Safari, then choose <strong>Add to Home Screen</strong> to install Habit Activity as an app.
        </p>
        <button onClick={handleDismiss} className="mt-2 text-xs text-neutral-500 hover:text-neutral-300">
          Got it
        </button>
      </div>
    );
  }

  // iOS before the user asks (kept behind a small, dismissible affordance via dashboard usage)
  if (isIOS()) {
    return (
      <button
        onClick={() => setShowIOSHint(true)}
        className="mx-auto mb-4 block text-xs text-neutral-500 underline-offset-2 hover:text-neutral-300 hover:underline"
      >
        Install app on this device
      </button>
    );
  }

  return null;
}
