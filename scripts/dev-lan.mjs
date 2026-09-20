#!/usr/bin/env node
/**
 * LAN/mobile dev launcher for Habit Activity.
 *
 * Detects the laptop's active Wi-Fi/LAN IPv4 address and starts
 * `next dev` listening on all interfaces, then prints the URL to open
 * on a phone on the same network. localhost keeps working as usual.
 *
 * The app is same-origin (Next.js App Router + server actions), so no
 * API URL/CORS configuration is needed — the phone talks to the laptop's
 * LAN address directly.
 *
 * Usage: npm run dev:mobile
 */
import { networkInterfaces } from "node:os";
import { spawn } from "node:child_process";

function detectLanIPv4() {
  const nets = networkInterfaces();
  const candidates = [];
  for (const [name, addrs] of Object.entries(nets)) {
    for (const addr of addrs ?? []) {
      if (addr.family !== "IPv4" || addr.internal) continue;
      // Prefer private ranges (LAN/Wi-Fi); score by interface name hints
      const isPrivate =
        /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(addr.address);
      if (!isPrivate) continue;
      const score = /wi-?fi|wlan|wlp|en0/i.test(name) ? 2 : 1;
      candidates.push({ name, address: addr.address, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] ?? null;
}

const lan = detectLanIPv4();
const PORT = process.env.PORT ?? "3000";

console.log("\n\x1b[1mHabit Activity — LAN development\x1b[0m");
if (lan) {
  console.log(`  Network interface : ${lan.name}`);
  console.log(`  \x1b[32mLocal : http://localhost:${PORT}\x1b[0m`);
  console.log(`  \x1b[32mPhone : http://${lan.address}:${PORT}\x1b[0m  (same Wi-Fi)`);
} else {
  console.log("  \x1b[33mNo LAN IPv4 address detected — falling back to localhost only.\x1b[0m");
  console.log(`  Local : http://localhost:${PORT}`);
}
console.log("\n  Note: plain http://<LAN-IP> works for browsing, but PWA install and");
console.log("  the service worker require a secure context — use `npm run dev:https`");
console.log("  for that (self-signed cert via Next's --experimental-https).\n");

const child = spawn("npx", ["next", "dev", "-H", "0.0.0.0", "-p", PORT], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
child.on("exit", (code) => process.exit(code ?? 0));
