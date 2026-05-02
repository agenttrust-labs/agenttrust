"use client";

import { Connection, PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface ProgramSpec {
  name:        string;
  programId:   string;
  description: string;
}

const PROGRAMS: ProgramSpec[] = [
  { name: "policy_vault",        programId: "8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR", description: "5 policy kinds + Kani-proven invariants" },
  { name: "trustgate",           programId: "HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N", description: "x402 facilitator + give_feedback CPI" },
  { name: "validation_registry", programId: "Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv", description: "4 PDAs + 5 instructions; capability attestation" },
];

interface ProgramState {
  loading:    boolean;
  executable: boolean | null;
  owner:      string | null;
  dataLen:    number | null;
  error:      string | null;
}

const RPC_URL = "https://api.devnet.solana.com";

export function ProgramStatus() {
  const [states, setStates] = useState<Record<string, ProgramState>>(() =>
    Object.fromEntries(
      PROGRAMS.map((p) => [
        p.programId,
        { loading: true, executable: null, owner: null, dataLen: null, error: null },
      ]),
    ),
  );

  useEffect(() => {
    const conn = new Connection(RPC_URL, "confirmed");
    let cancelled = false;

    (async () => {
      for (const p of PROGRAMS) {
        try {
          const info = await conn.getAccountInfo(new PublicKey(p.programId));
          if (cancelled) return;
          if (!info) {
            setStates((s) => ({
              ...s,
              [p.programId]: {
                loading: false, executable: false, owner: null, dataLen: null,
                error: "account not found",
              },
            }));
            continue;
          }
          setStates((s) => ({
            ...s,
            [p.programId]: {
              loading:    false,
              executable: info.executable,
              owner:      info.owner.toBase58(),
              dataLen:    info.data.length,
              error:      null,
            },
          }));
        } catch (e) {
          if (cancelled) return;
          setStates((s) => ({
            ...s,
            [p.programId]: {
              loading: false, executable: null, owner: null, dataLen: null,
              error: e instanceof Error ? e.message : String(e),
            },
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="grid gap-px overflow-hidden rounded-lg bg-border md:grid-cols-3">
      {PROGRAMS.map((p, i) => {
        const st = states[p.programId];
        return (
          <motion.article
            key={p.programId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col bg-bg-elevated p-6"
          >
            <header className="flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-fg-subtle">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-1 font-mono text-base text-fg">{p.name}</h3>
              </div>
              <StatusBadge state={st} />
            </header>
            <p className="mt-4 text-sm text-fg-muted">{p.description}</p>
            <dl className="mt-6 space-y-3 border-t border-border pt-4 font-mono text-xs">
              <Row label="Program ID">
                <a
                  href={`https://explorer.solana.com/address/${p.programId}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-fg-muted underline-offset-2 hover:text-accent hover:underline"
                >
                  {p.programId}
                </a>
              </Row>
              <Row label="Owner">
                {st.loading ? <Skeleton width="w-32" /> : (
                  <span className="break-all text-fg-muted">{st.owner ?? "—"}</span>
                )}
              </Row>
              <Row label="Data length">
                {st.loading ? <Skeleton width="w-16" /> : (
                  <span className="text-fg-muted">{st.dataLen != null ? `${st.dataLen.toLocaleString()} bytes` : "—"}</span>
                )}
              </Row>
              <Row label="Network">
                <span className="text-fg-muted">solana-devnet</span>
              </Row>
            </dl>
          </motion.article>
        );
      })}
    </div>
  );
}

function StatusBadge({ state }: { state: ProgramState }) {
  if (state.loading) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-subtle px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
        <span className="h-1.5 w-1.5 rounded-full bg-fg-subtle animate-pulse" />
        Loading
      </span>
    );
  }
  if (state.error) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-red-700">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Error
      </span>
    );
  }
  if (state.executable) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-accent">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        Executable
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-subtle px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-fg-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-fg-subtle" />
      Not deployed
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
      <dt className="text-[10px] uppercase tracking-widest text-fg-subtle">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function Skeleton({ width }: { width: string }) {
  return <span className={`inline-block h-3 ${width} rounded bg-bg-subtle animate-pulse`} />;
}
