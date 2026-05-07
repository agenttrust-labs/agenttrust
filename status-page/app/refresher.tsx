"use client";

import { useEffect } from "react";

/**
 * Tiny client component that triggers a soft refresh every 30
 * seconds. Next.js handles the cache invalidation server-side via
 * `revalidate = 30` on the page module — the client just nudges the
 * router so the user sees the new HTML without a full reload.
 *
 * Kept deliberately minimal — no useState, no rendering, no extra
 * deps. The visible "last probe" timestamp comes from the
 * server-rendered row data.
 */
export function ClientRefresher() {
  useEffect(() => {
    const id = setInterval(() => {
      // location.reload() is the lightest correct path — the
      // server's revalidate window is 30s so most of these reloads
      // hit a warm cache and respond in ms.
      window.location.reload();
    }, 30_000);
    return () => clearInterval(id);
  }, []);
  return null;
}
