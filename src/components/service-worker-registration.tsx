"use client";

import { useEffect } from "react";

/**
 * Registers the service worker, but only in secure contexts (https or
 * localhost) where browsers actually allow it. On plain http:// LAN hosts
 * this is a no-op, which is expected.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return; // avoid SW/dev churn
    if (!("serviceWorker" in navigator)) return;
    if (!window.isSecureContext) return;

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
        console.warn("Service worker registration failed:", err);
      });
    };

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
