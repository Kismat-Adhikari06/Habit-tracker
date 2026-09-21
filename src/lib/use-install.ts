"use client";

import { useEffect, useState } from "react";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

// Module-level singleton so every consumer (header button, modal, …) shares
// the same single-use beforeinstallprompt event.
let sharedEvent: BeforeInstallPromptEvent | null = null;
let standalone = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  standalone = isStandalone();
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    sharedEvent = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    sharedEvent = null;
    standalone = true;
    emit();
  });
}

export type InstallState = {
  /** Native install prompt is available right now. */
  canInstall: boolean;
  /** App is installed / running standalone. */
  installed: boolean;
  /** Fire the native install prompt. Returns the user's choice. */
  promptInstall: () => Promise<"accepted" | "dismissed" | null>;
};

export function useInstallState(): InstallState {
  const [, force] = useState(0);

  useEffect(() => {
    const listener = () => force((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    canInstall: sharedEvent !== null,
    installed: standalone,
    promptInstall: async () => {
      if (!sharedEvent) return null;
      const choice = await sharedEvent.userChoice;
      sharedEvent = null; // single-use
      emit();
      return choice.outcome;
    },
  };
}
