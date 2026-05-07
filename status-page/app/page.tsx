import { probeAll, type SurfaceStatus } from "@/lib/surfaces";
import { ClientRefresher } from "./refresher";

// Server-side cache: re-probe every 30 seconds. Vercel's edge
// caches the rendered HTML; the client component below re-fetches
// the same JSON via /api/surfaces every 30s to keep the table live
// without a full page reload.
export const revalidate = 30;

function formatPill(s: SurfaceStatus) {
  if (s.ok)               return { cls: "green",  label: "operational" };
  if (s.httpStatus === null) return { cls: "red",  label: "unreachable" };
  if (s.httpStatus >= 500) return { cls: "red",   label: `${s.httpStatus} server error` };
  return { cls: "amber", label: `${s.httpStatus}` };
}

export default async function StatusPage() {
  const rows = await probeAll();
  const allGreen = rows.every((r) => r.ok);
  const operational = rows.filter((r) => r.ok).length;

  return (
    <main>
      <p className="eyebrow">AgentTrust / Status</p>
      <h1>{allGreen ? "All systems operational" : `${operational} of ${rows.length} surfaces operational`}</h1>
      <p className="subtitle">
        Live health for the AgentTrust hosted surfaces. Probes run on
        the server every 30 seconds and the client refreshes the
        table on the same cadence. devnet only — mainnet flips on
        post-grant.
      </p>

      <div className="summary">
        <span className={`pill ${allGreen ? "green" : "amber"}`}>
          <span className="dot" />
          {allGreen ? "Operational" : "Degraded"}
        </span>
        <span className="refresh-note">
          Last server probe: {new Date(rows[0]?.checkedAtIso ?? Date.now()).toLocaleTimeString()}
        </span>
      </div>

      <table className="surfaces">
        <thead>
          <tr>
            <th>Surface</th>
            <th>Status</th>
            <th>Response</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const pill = formatPill(s);
            return (
              <tr key={s.id}>
                <td>
                  <span className="surface-label">{s.label}</span>
                  <span className="surface-cat">{s.category}</span>
                  <br />
                  <a href={s.publicUrl} target="_blank" rel="noreferrer">{new URL(s.publicUrl).host}</a>
                </td>
                <td>
                  <span className={`pill ${pill.cls}`}>
                    <span className="dot" />
                    {pill.label}
                  </span>
                </td>
                <td>
                  <span className="response">
                    {s.responseMs !== null ? `${s.responseMs} ms` : "—"}
                  </span>
                </td>
                <td>
                  <span className="note">{s.note ?? (s.ok ? "ok" : "—")}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ClientRefresher />

      <footer>
        <span>Source:</span>
        <a href="https://github.com/agenttrust-labs/agenttrust" target="_blank" rel="noreferrer">agenttrust-labs/agenttrust</a>
        <span>·</span>
        <a href="https://www.agenttrust.tech" target="_blank" rel="noreferrer">www.agenttrust.tech</a>
        <span>·</span>
        <a href="https://docs.agenttrust.tech" target="_blank" rel="noreferrer">docs.agenttrust.tech</a>
      </footer>
    </main>
  );
}
