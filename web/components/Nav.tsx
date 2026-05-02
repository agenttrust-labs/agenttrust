import Link from "next/link";

export function Nav() {
  return (
    <nav className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-fg font-semibold tracking-tight"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          AgentTrust
        </Link>
        <div className="flex items-center gap-6 text-sm text-fg-muted">
          <Link href="/dashboard" className="hover:text-fg transition-colors">
            Dashboard
          </Link>
          <a
            href="https://www.npmjs.com/package/@agenttrust-sdk/trustgate"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-fg transition-colors"
          >
            npm
          </a>
          <a
            href="https://github.com/mohit-1710/agenttrust"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-fg transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </nav>
  );
}
