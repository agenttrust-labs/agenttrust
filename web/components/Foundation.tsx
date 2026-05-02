"use client";

import { motion } from "framer-motion";

export function Foundation() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-12 md:grid-cols-2 md:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="font-mono text-xs uppercase tracking-widest text-fg-muted">
              Foundation alignment
            </p>
            <h2 className="mt-3 text-3xl font-medium tracking-tight text-fg sm:text-4xl">
              Built on top of, not parallel to.
            </h2>
            <p className="mt-6 text-fg-muted leading-relaxed">
              Quantu Labs shipped two of the three ERC-8004 legs on Solana
              (IdentityRegistry + ReputationRegistry). The third —
              ValidationRegistry — was archived in v0.5.0 pending a redesign
              for spam resistance.
            </p>
            <p className="mt-4 text-fg-muted leading-relaxed">
              AgentTrust productizes that third leg AND introduces a
              policy-as-code primitive (PolicyVault) plus an x402-native
              facilitator surface (TrustGate) that consume Quantu&rsquo;s
              existing primitives via byte-precise PDA reads. Pinned commit{" "}
              <code className="font-mono text-xs text-fg">bfb09ad</code>;
              graceful degradation when Quantu pushes upgrades.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-px overflow-hidden rounded-lg bg-border"
          >
            <Row label="ERC-8004 spec" value="3 of 3 legs covered" mono />
            <Row label="Quantu integration" value="byte-precise read-only" mono />
            <Row label="Cargo dep on Quantu" value="zero" mono />
            <Row label="Schema-version canary" value="byte 560 == 1" mono />
            <Row label="Sybil resistance (v1)" value="downstream-consumer-filtering" />
            <Row label="License" value="MIT (workspace-wide)" />
            <Row label="Mainnet readiness" value="v1 ships devnet; v1.1+ adds Ed25519 sysvar verify" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Row({
  label, value, mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 bg-bg-elevated p-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <span className="text-sm text-fg-muted">{label}</span>
      <span
        className={`text-sm text-fg ${mono ? "font-mono text-xs" : "font-medium"}`}
      >
        {value}
      </span>
    </div>
  );
}
