import type { NextConfig } from "next";

/**
 * Dev-only: allow the phone (same Wi-Fi) to load Next dev resources
 * (/_next HMR + RSC payloads) from the laptop's LAN IP. Without this the
 * page loads on the phone but never hydrates, so login does nothing.
 *
 * Next's matcher is DNS-label based, so CIDR ranges don't work — use
 * single-label wildcards instead. Your LAN IP changes per network, which
 * is why we cover the private ranges with wildcards rather than one IP.
 * Production is unaffected: this only applies to `next dev`.
 */
const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.*.*", // typical home Wi-Fi
    "10.*.*.*", // 10.0.0.0/8
    // 172.16.0.0/12 (no CIDR support, so enumerate the second octet)
    ...Array.from({ length: 16 }, (_, i) => `172.${16 + i}.*.*`),
    "localhost",
  ],
};

export default nextConfig;
