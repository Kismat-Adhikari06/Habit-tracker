"use client";

import { useEffect, useState } from "react";
import { Download, Share, Smartphone, CheckCircle2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [showIOSSteps, setShowIOSSteps] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    const alreadyDismissed = localStorage.getItem(DISMISS_KEY) === "1";
    setDismissed(alreadyDismissed);

    const onPrompt = (e: Event) => {
      e.preventDefault(); // suppress the browser's own mini-infobar
      setDeferred(e as BeforeInstallPromptEvent);
      // Auto-open the modal once per visit unless previously dismissed.
      if (!alreadyDismissed) setModalOpen(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setModalOpen(false);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
    setModalOpen(false);
  }

  async function handleInstall() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setModalOpen(false);
    }
    setDeferred(null); // the event is single-use
  }

  return (
    <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) dismiss(); }}>
      <DialogContent className="max-w-sm rounded-2xl border-neutral-800 bg-neutral-900 p-6">
        <DialogHeader>
          <span className="mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/25">
            <Download className="size-7" />
          </span>
          <DialogTitle className="text-center text-lg font-semibold text-neutral-50">
            Install Habit Activity
          </DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed text-neutral-400">
            Add the app to your home screen for a full-screen experience — no address bar, works like a
            native app.
          </DialogDescription>
        </DialogHeader>

        {/* Android / Chromium: real native install prompt. */}
        {deferred ? (
          <Button
            onClick={handleInstall}
            className="mt-2 h-11 w-full bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
          >
            <Download className="size-4" />
            Install App
          </Button>
        ) : isIOS() && !showIOSSteps ? (
          <Button
            onClick={() => setShowIOSSteps(true)}
            className="mt-2 h-11 w-full bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
          >
            <Smartphone className="size-4" />
            How to install on iPhone
          </Button>
        ) : isIOS() && showIOSSteps ? (
          <ol className="mt-2 space-y-2 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
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
        ) : (
          // Chromium without beforeinstallprompt yet (SW still registering) —
          // tell the user where to find the menu option instead of a dead button.
          <p className="mt-2 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-center text-sm text-neutral-400">
            Tap Chrome&apos;s menu <strong>⋮</strong> → <strong>Install app</strong>
          </p>
        )}

        <button
          onClick={dismiss}
          className="mt-1 text-xs text-neutral-500 underline-offset-2 hover:text-neutral-300 hover:underline"
        >
          Not now
        </button>
      </DialogContent>
    </Dialog>
  );
}
