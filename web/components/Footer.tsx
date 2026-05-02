export function Footer() {
  return (
    <footer className="border-t border-border bg-bg-subtle/40">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 font-semibold tracking-tight text-fg">
              <span className="inline-block h-2 w-2 rounded-full bg-accent" />
              AgentTrust
            </div>
            <p className="mt-2 text-sm text-fg-muted">
              Solo build by Mohit · Solana Frontier 2026 · MIT licensed
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-muted">
            <a
              href="https://github.com/mohit-1710/agenttrust"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fg transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/@agenttrust-sdk/trustgate"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fg transition-colors"
            >
              npm
            </a>
            <a
              href="https://github.com/mohit-1710/agenttrust/blob/main/.github/workflows/kani-prove.yml"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fg transition-colors"
            >
              Kani CI
            </a>
            <a
              href="https://explorer.solana.com/address/8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR?cluster=devnet"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fg transition-colors"
            >
              Explorer
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
