import type { CapacitorConfig } from "@capacitor/cli";
import { networkInterfaces } from "node:os";

/**
 * Resolve the machine's private LAN IPv4 so the Android app can reach the
 * dev server from the phone without hard-coding an address. Falls back to
 * localhost. Override at build time with CAPACITOR_SERVER_URL.
 */
function detectLanUrl(): string {
  const fromEnv = process.env.CAPACITOR_SERVER_URL;
  if (fromEnv) return fromEnv;

  // Match the dev-lan script: https when running with --https, else http.
  const scheme = process.env.PWA_DEV_HTTPS === "1" ? "https" : "http";
  const candidates: { address: string; score: number }[] = [];
  for (const addrs of Object.values(networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family !== "IPv4" || addr.internal) continue;
      if (!/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(addr.address)) continue;
      const isWifi = /wi-?fi|wlan|wlp|en0/i.test(addr.address);
      candidates.push({ address: addr.address, score: isWifi ? 2 : 1 });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const ip = candidates[0]?.address ?? "127.0.0.1";
  const port = process.env.PORT ?? "3000";
  return `${scheme}://${ip}:${port}`;
}

const config: CapacitorConfig = {
  appId: "com.habittracker.app",
  appName: "Habit Activity",
  webDir: "out",
  server: {
    /**
     * Dev mode: load the live Next.js app from the LAN server so UI updates
     * apply without reinstalling the APK. Remove this block for a fully
     * bundled (offline-capable) production build.
     */
    url: detectLanUrl(),
    cleartext: true,
    androidScheme: "http",
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;