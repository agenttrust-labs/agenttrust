/**
 * AgentTrust surface inventory + health-probe logic.
 *
 * `probe()` runs server-side: fetches each surface's healthz with
 * a tight timeout and packages a normalised status row for the UI.
 * The status page renders this once per request (Vercel caches the
 * full page for ~30s — see app/page.tsx revalidate); the client
 * also refreshes on a 30s interval to keep the table live without
 * a cold-cache miss.
 */

export interface SurfaceDef {
  readonly id:          string;
  readonly label:       string;
  readonly category:    "core" | "package" | "doc";
  readonly url:         string;
  /** What we GET to determine health. */
  readonly healthUrl:   string;
  /** Optional public link the row displays as a click-through. */
  readonly publicUrl?:  string;
}

export interface SurfaceStatus {
  readonly id:           string;
  readonly label:        string;
  readonly category:     SurfaceDef["category"];
  readonly url:          string;
  readonly publicUrl:    string;
  readonly ok:           boolean;
  readonly httpStatus:   number | null;
  readonly responseMs:   number | null;
  readonly note:         string | null;
  readonly checkedAtIso: string;
}

export const SURFACES: ReadonlyArray<SurfaceDef> = [
  {
    id:        "landing",
    label:     "Landing",
    category:  "core",
    url:       "https://www.agenttrust.tech",
    healthUrl: "https://www.agenttrust.tech",
    publicUrl: "https://www.agenttrust.tech",
  },
  {
    id:        "docs",
    label:     "Docs",
    category:  "doc",
    url:       "https://docs.agenttrust.tech",
    healthUrl: "https://docs.agenttrust.tech",
    publicUrl: "https://docs.agenttrust.tech",
  },
  {
    id:        "mcp",
    label:     "MCP HTTP endpoint",
    category:  "core",
    url:       "https://agenttrust-mcp.fly.dev",
    healthUrl: "https://agenttrust-mcp.fly.dev/healthz",
    publicUrl: "https://agenttrust-mcp.fly.dev",
  },
  {
    id:        "api",
    label:     "Facilitator API",
    category:  "core",
    url:       "https://agenttrust-api.fly.dev",
    healthUrl: "https://agenttrust-api.fly.dev/healthz",
    publicUrl: "https://agenttrust-api.fly.dev/healthz",
  },
  {
    id:        "demo",
    label:     "Demo endpoint",
    category:  "core",
    url:       "https://agenttrust-demo.fly.dev",
    healthUrl: "https://agenttrust-demo.fly.dev/health",
    publicUrl: "https://agenttrust-demo.fly.dev/health",
  },
  {
    id:        "sdk-npm",
    label:     "@agenttrust-sdk/trustgate (npm)",
    category:  "package",
    url:       "https://www.npmjs.com/package/@agenttrust-sdk/trustgate",
    healthUrl: "https://registry.npmjs.org/@agenttrust-sdk/trustgate",
    publicUrl: "https://www.npmjs.com/package/@agenttrust-sdk/trustgate",
  },
];

const PROBE_TIMEOUT_MS = 8000;

export async function probe(s: SurfaceDef): Promise<SurfaceStatus> {
  const startedAt   = Date.now();
  const checkedAt   = new Date().toISOString();
  const controller  = new AbortController();
  const timer       = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const res = await fetch(s.healthUrl, {
      method:    "GET",
      signal:    controller.signal,
      // Cache-bust on every probe; we rely on the page-level
      // revalidate to throttle, not on HTTP-level caching.
      cache:     "no-store",
      // Tell the upstream we want JSON when available; static HTML
      // pages will ignore the header.
      headers:   { accept: "application/json, text/html;q=0.9" },
      // Default redirect: "follow" — we want to see the final 200
      // even if Vercel rewrites the request.
    });
    const responseMs = Date.now() - startedAt;
    let note: string | null = null;
    if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
      try {
        const j = await res.json() as Record<string, unknown>;
        // Short, surface-specific summary for the row's note column.
        if (s.id === "mcp")  note = `v${(j as { version?: string }).version ?? "?"} — toolCount=${(j as { toolCount?: number }).toolCount ?? "?"}`;
        if (s.id === "api")  note = `balance=${(j as { balanceSol?: string }).balanceSol ?? "?"} SOL — counterparties=${(j as { counterpartyCount?: number }).counterpartyCount ?? "?"}`;
        if (s.id === "demo") note = `counterparties=${((j as { counterparties?: unknown[] }).counterparties ?? []).length} — minTier=${(j as { minTier?: number }).minTier ?? "?"}`;
        if (s.id === "sdk-npm") {
          const dist = (j as { "dist-tags"?: { latest?: string } })["dist-tags"];
          note = `latest=${dist?.latest ?? "?"}`;
        }
      } catch (_) {
        // Body wasn't JSON-parseable; surface still ok if 2xx.
      }
    }
    return {
      id:           s.id,
      label:        s.label,
      category:     s.category,
      url:          s.url,
      publicUrl:    s.publicUrl ?? s.url,
      ok:           res.ok,
      httpStatus:   res.status,
      responseMs,
      note,
      checkedAtIso: checkedAt,
    };
  } catch (e) {
    const responseMs = Date.now() - startedAt;
    return {
      id:           s.id,
      label:        s.label,
      category:     s.category,
      url:          s.url,
      publicUrl:    s.publicUrl ?? s.url,
      ok:           false,
      httpStatus:   null,
      responseMs,
      note:         (e as Error).name === "AbortError" ? "timeout" : (e as Error).message.slice(0, 60),
      checkedAtIso: checkedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function probeAll(): Promise<SurfaceStatus[]> {
  return Promise.all(SURFACES.map(probe));
}
