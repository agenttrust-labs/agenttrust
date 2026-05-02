"use client";

import { motion } from "framer-motion";

const INVARIANTS = [
  { id: 1, name: "paused_implies_no_allow",         checks: 126, time: "0.20s" },
  { id: 2, name: "velocity_counter_le_limit",       checks: 9,   time: "0.03s" },
  { id: 3, name: "counterparty_tier_monotone",      checks: 8,   time: "0.02s" },
  { id: 4, name: "validation_expiry_correct",       checks: 85,  time: "0.21s" },
  { id: 5, name: "multisig_threshold_enforced",     checks: 149, time: "62.55s" },
];

export function Verification() {
  const totalChecks = INVARIANTS.reduce((s, i) => s + i.checks, 0);

  return (
    <section className="border-b border-border bg-bg-subtle/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-12 max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-widest text-fg-muted">
            Formal verification
          </p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight text-fg sm:text-4xl">
            Every safety property machine-checked.
          </h2>
          <p className="mt-4 text-fg-muted">
            PolicyVault&rsquo;s five load-bearing invariants are proven via{" "}
            <a
              href="https://github.com/model-checking/kani"
              target="_blank"
              rel="noopener noreferrer"
              className="text-fg underline underline-offset-2 hover:text-accent"
            >
              Kani
            </a>
            , Rust&rsquo;s bounded model checker. Symbolic execution explores
            the full input space — every <code className="font-mono text-xs">u64</code>,{" "}
            <code className="font-mono text-xs">u8</code>, and{" "}
            <code className="font-mono text-xs">bool</code> combination — and
            asserts the property. CI runs all five on every PR.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-lg border border-border bg-bg-elevated"
        >
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-bg-subtle/60 font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
              <tr>
                <th className="px-5 py-3 text-left">#</th>
                <th className="px-5 py-3 text-left">Invariant</th>
                <th className="px-5 py-3 text-right">Sub-checks</th>
                <th className="px-5 py-3 text-right">Time</th>
                <th className="px-5 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {INVARIANTS.map((inv) => (
                <tr key={inv.id} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-4 font-mono text-fg-subtle">{String(inv.id).padStart(2, "0")}</td>
                  <td className="px-5 py-4 font-mono text-fg">{inv.name}</td>
                  <td className="px-5 py-4 text-right font-mono text-fg-muted">{inv.checks}</td>
                  <td className="px-5 py-4 text-right font-mono text-fg-muted">{inv.time}</td>
                  <td className="px-5 py-4 text-right">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-accent">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                      Proven
                    </span>
                  </td>
                </tr>
              ))}
              <tr className="bg-bg-subtle/40">
                <td className="px-5 py-3" />
                <td className="px-5 py-3 font-mono text-xs uppercase tracking-widest text-fg-subtle">Total</td>
                <td className="px-5 py-3 text-right font-mono text-fg">{totalChecks}</td>
                <td className="px-5 py-3 text-right font-mono text-fg">~63s</td>
                <td className="px-5 py-3 text-right font-mono text-xs uppercase tracking-widest text-accent">5/5 green</td>
              </tr>
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
}
