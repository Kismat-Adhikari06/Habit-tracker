"use client";

import { Download } from "lucide-react";
import { useInstallState } from "@/lib/use-install";

/**
 * Compact install button for the dashboard header. Renders nothing unless
 * the native PWA install prompt is genuinely available, and disappears once
 * the app is installed / running standalone.
 */
export function InstallButton() {
  const { canInstall, installed, promptInstall } = useInstallState();

  if (!canInstall || installed) return null;

  return (
    <button
      onClick={() => void promptInstall()}
      aria-label="Install app"
      title="Install app"
      className="flex h-9 items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900/80 px-3 text-xs font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:text-neutral-100"
    >
      <Download className="size-4" />
      Install
    </button>
  );
}
