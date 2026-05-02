"use client";

import { motion } from "framer-motion";

interface Component {
  index: string;
  name: string;
  tagline: string;
  description: string;
  bullets: string[];
  programId: string;
}

const COMPONENTS: Component[] = [
  {
    index: "01",
    name: "PolicyVault",
    tagline: "Programmable spending policies",
    description:
      "Five orthogonal policy kinds composed under one gate_payment instruction with fail-fast semantics. KillSwitch, Spending, Velocity, CounterpartyTier, RequireValidation.",
    bullets: [
      "Manual byte-offset reads of Quantu AtomStats (no Cargo dep on Quantu)",
      "Five Kani-proven safety invariants, 377 sub-checks",
      "Multisig-gated policy authority (1..=7 members)",
    ],
    programId: "8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR",
  },
  {
    index: "02",
    name: "TrustGate",
    tagline: "x402 facilitator integration",
    description:
      "Anchor program + Express service + npm SDK. PDA-signed CPI to agent_registry_8004::give_feedback with idempotency-checked emission log. Atomic-tx invariant enforced at compile-time + runtime.",
    bullets: [
      "@agenttrust-sdk/trustgate published to npm",
      "Drop-in mountTrustGate(app, config) middleware",
      "Token-2022 TransferHook footgun guarded by literal-type marker",
    ],
    programId: "HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N",
  },
  {
    index: "03",
    name: "ValidationRegistry",
    tagline: "Capability attestation",
    description:
      "The third leg Quantu archived in v0.5.0 — productized. Permissionless namespace + attestor registration; downstream-consumer-filtering for sybil resistance. Audit-trail-preserving revocation.",
    bullets: [
      "4 PDAs + 5 instructions",
      "10 capability namespaces seeded (KYC, audit, model-card, jurisdiction)",
      "Byte-perfect schema match to PolicyVault's RequireValidation policy",
    ],
    programId: "Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv",
  },
];

export function Trinity() {
  return (
    <section className="border-b border-border bg-bg-subtle/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-16 max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-widest text-fg-muted">
            Architecture
          </p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight text-fg sm:text-4xl">
            Three components, one trust stack.
          </h2>
          <p className="mt-4 text-fg-muted">
            Each program is independently useful. Composed, they form a complete
            payment-trust primitive a facilitator can drop into an x402 stack in
            an afternoon.
          </p>
        </div>

        <div className="grid gap-px overflow-hidden rounded-lg bg-border md:grid-cols-3">
          {COMPONENTS.map((c, i) => (
            <motion.article
              key={c.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col bg-bg-elevated p-7"
            >
              <header className="flex items-baseline justify-between">
                <span className="font-mono text-xs text-fg-subtle">{c.index}</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-accent">
                  Component
                </span>
              </header>
              <h3 className="mt-4 text-xl font-semibold text-fg">{c.name}</h3>
              <p className="mt-1 text-sm font-medium text-fg-muted">{c.tagline}</p>
              <p className="mt-4 text-sm leading-relaxed text-fg-muted">
                {c.description}
              </p>
              <ul className="mt-5 space-y-2 text-sm text-fg-muted">
                {c.bullets.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span aria-hidden className="text-accent">·</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 border-t border-border pt-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
                  Program ID (devnet)
                </p>
                <a
                  href={`https://explorer.solana.com/address/${c.programId}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block break-all font-mono text-[11px] text-fg-muted underline-offset-2 hover:text-accent hover:underline"
                >
                  {c.programId}
                </a>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
