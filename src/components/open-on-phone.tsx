"use client";

import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";

type Props = {
  /** precomputed data URL of the QR PNG (server side) */
  qrDataUrl: string;
  appUrl: string;
};

/**
 * "Open on Phone" — QR code containing only the LAN app URL.
 * No credentials, tokens, or user data are ever encoded.
 */
export function OpenOnPhone({ qrDataUrl, appUrl }: Props) {
  const [origin, setOrigin] = useState<string | null>(null);

  // Show a "you're already here" hint when this IS the phone.
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const alreadyHere = origin !== null && origin === appUrl;

  return (
    <div className="flex flex-col items-center gap-3">
      <img
        src={qrDataUrl}
        alt={`QR code for ${appUrl}`}
        width={132}
        height={132}
        className="rounded-lg border border-neutral-800 bg-white p-1.5"
      />
      {alreadyHere ? (
        <p className="text-[11px] text-neutral-500">You&apos;re viewing it on this device.</p>
      ) : (
        <p className="text-[11px] text-neutral-500">Scan to open on phone</p>
      )}
      <code className="rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-[11px] text-neutral-400">
        {appUrl}
      </code>
    </div>
  );
}

export function OpenOnPhoneHeader() {
  return (
    <div className="mb-1 flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
        <Smartphone className="size-4" />
      </span>
      <h2 className="text-sm font-semibold text-neutral-100">Open on Phone</h2>
    </div>
  );
}
