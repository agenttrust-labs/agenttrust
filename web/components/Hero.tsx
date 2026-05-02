"use client";

import { motion } from "framer-motion";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="inline-block rounded-full border border-border-strong bg-bg-elevated px-3 py-1 font-mono text-xs uppercase tracking-widest text-fg-muted">
            Solana Frontier 2026
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 max-w-3xl text-balance text-4xl font-medium tracking-tight text-fg sm:text-5xl md:text-6xl"
        >
          Completes the Solana Foundation&rsquo;s{" "}
          <span className="text-accent">ERC-8004 trust stack</span>.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-fg-muted"
        >
          Three Anchor programs that turn Quantu&rsquo;s IdentityRegistry +
          ReputationRegistry primitives into a full agent-payment trust system:
          programmable spending policies, x402 facilitator integration, and
          capability attestation. Five formally-verified safety properties.
          Drop-in TypeScript SDK.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex flex-col gap-3 sm:flex-row"
        >
          <a
            href="https://github.com/mohit-1710/agenttrust"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-fg px-5 text-sm font-medium text-bg transition-opacity hover:opacity-90"
          >
            View on GitHub
            <span aria-hidden>→</span>
          </a>
          <a
            href="https://www.npmjs.com/package/@agenttrust-sdk/trustgate"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-md border border-border-strong bg-bg-elevated px-5 text-sm font-medium text-fg transition-colors hover:bg-bg-subtle"
          >
            <code className="font-mono text-xs">
              pnpm add @agenttrust-sdk/trustgate
            </code>
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 flex flex-wrap gap-x-8 gap-y-3 font-mono text-xs uppercase tracking-widest text-fg-subtle"
        >
          <span>5/5 Kani invariants proven</span>
          <span>·</span>
          <span>169 tests passing</span>
          <span>·</span>
          <span>3 programs live on devnet</span>
          <span>·</span>
          <span>MIT-licensed</span>
        </motion.div>
      </div>
    </section>
  );
}
