#!/usr/bin/env node
/**
 * LAN/mobile dev launcher for Habit Activity.
 *
 * Detects the laptop's active Wi-Fi/LAN IPv4 address and starts `next dev`
 * listening on all interfaces, then prints the URL to open on a phone on the
 * same network. localhost keeps working as usual.
 *
 * Usage:
 *   npm run dev:mobile            # plain HTTP — browsing only, no PWA install
 *   npm run dev:mobile -- --https # trusted-HTTPS — full PWA install flow
 *
 * With --https, a certificate with your actual LAN IP in the Subject
 * Alternative Name is generated once (via mkcert if installed, otherwise
 * openssl) and served by Next's --experimental-https-auto-cert-dir. Trust it
 * once on the phone (Android: Settings → install user CA) and Chrome will
 * treat the app as a secure context → service worker registers →
 * beforeinstallprompt fires → real "Install App" experience.
 */
import { networkInterfaces } from "node:os";
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CERT_DIR = path.join(process.cwd(), ".certs");

function detectLanIPv4() {
  const nets = networkInterfaces();
  const candidates = [];
  for (const [name, addrs] of Object.entries(nets)) {
    for (const addr of addrs ?? []) {
      if (addr.family !== "IPv4" || addr.internal) continue;
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

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function shOrNull(cmd) {
  try {
    return sh(cmd);
  } catch {
    return null;
  }
}

function makeCertWithMkcert(ip) {
  if (!shOrNull("command -v mkcert")) return null;
  try {
    const key = path.join(CERT_DIR, "key.pem");
    const cert = path.join(CERT_DIR, "cert.pem");
    fs.mkdirSync(CERT_DIR, { recursive: true });
    execSync(`mkcert -cert-file "${cert}" -key-file "${key}" "localhost" "${ip}"`, {
      stdio: "pipe",
    });
    return { cert, key, caRoot: shOrNull("mkcert -CAROOT") };
  } catch {
    return null;
  }
}

function makeCertWithOpenssl(ip) {
  try {
    fs.mkdirSync(CERT_DIR, { recursive: true });
    const key = path.join(CERT_DIR, "key.pem");
    const cert = path.join(CERT_DIR, "cert.pem");
    const subj = `/C=XX/O=HabitActivity/CN=${ip}`;
    const config = [
      "[req]",
      "distinguished_name = dn",
      "x509_extensions = v3",
      "prompt = no",
      "[dn]",
      `CN = ${ip}`,
      "O = HabitActivity Dev",
      "[v3]",
      "basicConstraints = CA:TRUE",
      `subjectAltName = IP:${ip},DNS:localhost`,
    ].join("\n");
    const cfgPath = path.join(CERT_DIR, "openssl.cnf");
    fs.writeFileSync(cfgPath, config);
    execSync(
      `openssl req -x509 -newkey rsa:2048 -nodes -days 825 ` +
        `-keyout "${key}" -out "${cert}" -config "${cfgPath}" -sha256`,
      { stdio: "pipe" }
    );
    return { cert, key, caRoot: null };
  } catch (err) {
    console.error("  openssl cert generation failed:", err.message);
    return null;
  }
}

const args = process.argv.slice(2);
const useHttps = args.includes("--https");
const lan = detectLanIPv4();
const PORT = process.env.PORT ?? "3000";
const scheme = useHttps ? "https" : "http";
const PHONE_URL = lan ? `${scheme}://${lan.address}:${PORT}` : null;

console.log("\n\x1b[1mHabit Activity — LAN development\x1b[0m");
if (lan) {
  console.log(`  Network interface : ${lan.name}`);
  console.log(`  \x1b[32mLocal : ${scheme}://localhost:${PORT}\x1b[0m`);
  console.log(
    `  \x1b[32mPhone : ${PHONE_URL}\x1b[0m  (same Wi-Fi)`
  );
} else {
  console.log("  \x1b[33mNo LAN IPv4 address detected — falling back to localhost only.\x1b[0m");
  console.log(`  Local : ${scheme}://localhost:${PORT}`);
}

let certPaths = null;
if (useHttps) {
  if (!lan) {
    console.log("\n  \x1b[31m--https needs a LAN IP to build a SAN certificate — none found.\x1b[0m");
    process.exit(1);
  }
  certPaths = makeCertWithMkcert(lan.address) ?? makeCertWithOpenssl(lan.address);
  if (!certPaths) {
    console.log("\n  \x1b[31mCould not generate a certificate (openssl missing?).\x1b[0m");
    process.exit(1);
  }
  console.log(`\n  HTTPS certificate: ${certPaths.cert}`);
  if (certPaths.caRoot) {
    console.log(
      `\n  \x1b[36mmkcert CA detected → to trust this cert on Android (one time):\x1b[0m`
    );
    console.log("    1. Send <mkcert CAROOT>/rootCA.pem to your phone");
    console.log("    2. Settings → Security → Install a certificate → CA certificate");
    console.log("    3. Pick the rootCA.pem file");
    console.log("    4. Open the Phone URL above — Chrome treats it as a real secure context.");
  } else {
    console.log(
      "\n  \x1b[33mSelf-signed cert (no mkcert). On Android, Chrome will still show a warning\x1b[0m"
    );
    console.log(
      "  the first time you open the URL — tap \x1b[1mAdvanced → Proceed\x1b[0m to continue."
    );
    console.log(
      "  For a warning-free install experience install mkcert: `sudo apt install mkcert && mkcert -install`."
    );
  }
  console.log("\n  Service worker + install prompt now work in dev mode (secure context).");
} else {
  console.log("\n  Note: plain http://<LAN-IP> works for browsing, but the PWA install");
  console.log("  prompt and service worker require HTTPS — run `npm run dev:mobile -- --https`.");
}
console.log("");

const nextArgs = ["next", "dev", "-H", "0.0.0.0", "-p", PORT];
if (useHttps && certPaths) {
  nextArgs.push("--experimental-https", "--experimental-https-key", certPaths.key, "--experimental-https-cert", certPaths.cert);
} else if (useHttps) {
  // Fallback: let Next generate its own certs (localhost-only trust).
  nextArgs.push("--experimental-https");
}

const child = spawn("npx", nextArgs, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, PWA_DEV_HTTPS: useHttps ? "1" : "" },
});
child.on("exit", (code) => process.exit(code ?? 0));
