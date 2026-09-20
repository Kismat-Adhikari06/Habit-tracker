import "server-only";
import { networkInterfaces } from "node:os";

/**
 * Best-effort LAN URL for the "Open on Phone" QR code.
 * Detects the machine's private IPv4 dynamically (never hard-coded) and
 * prefers https when the secure PWA dev environment is enabled.
 * Returns null when no LAN address can be determined.
 */
export function getLanAppUrl(): string | null {
  const scheme = process.env.PWA_DEV_HTTPS === "1" ? "https" : "http";
  const port = process.env.PORT ?? "3000";

  const candidates: { name: string; address: string; score: number }[] = [];
  for (const [name, addrs] of Object.entries(networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family !== "IPv4" || addr.internal) continue;
      if (!/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(addr.address)) continue;
      const score = /wi-?fi|wlan|wlp|en0/i.test(name) ? 2 : 1;
      candidates.push({ name, address: addr.address, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  if (candidates.length === 0) return null;

  return `${scheme}://${candidates[0].address}${port === "80" ? "" : `:${port}`}`;
}
