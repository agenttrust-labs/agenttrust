"use client";

import { motion } from "framer-motion";

export function Integrate() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-12 max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-widest text-fg-muted">
            Integrate
          </p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight text-fg sm:text-4xl">
            One install. Drop-in middleware.
          </h2>
          <p className="mt-4 text-fg-muted">
            Add AgentTrust to any x402 facilitator&rsquo;s Express app in under
            twenty lines. Atomic-tx invariant enforced at compile-time +
            runtime — no way to silently corrupt the velocity ledger by
            splitting transactions.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-lg border border-border bg-bg-elevated"
        >
          <div className="flex items-center justify-between border-b border-border bg-bg-subtle/60 px-5 py-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
              server.ts
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
              TypeScript
            </span>
          </div>
          <pre className="overflow-x-auto px-5 py-5 font-mono text-[13px] leading-relaxed text-fg">
{`import express from "express";
import { Keypair } from "@solana/web3.js";
import { mountTrustGate } from "@agenttrust-sdk/trustgate/express";

const app = express();
app.use(express.json());

await mountTrustGate(app, {
  rpcUrl:             "https://api.devnet.solana.com",
  facilitatorKeypair: Keypair.fromSecretKey(/* … */),
  network:            "solana-devnet",
  atomicityEnforced:  true,  // literal \`true\` — TS compile error if you pass false
});

app.listen(3000);`}
          </pre>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-sm text-fg-muted"
        >
          You now have <code className="font-mono text-xs">POST /verify</code>,{" "}
          <code className="font-mono text-xs">POST /settle</code>,{" "}
          <code className="font-mono text-xs">POST /dispute</code>, and{" "}
          <code className="font-mono text-xs">GET /receipt/:hash</code> on your
          facilitator. x402-spec headers automatic.
        </motion.p>
      </div>
    </section>
  );
}
