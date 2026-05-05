import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import Link from 'next/link';
import { baseOptions } from '@/lib/layout.shared';
import { AskAIWidget } from '@/components/ask-ai/AskAIWidget';
import { AgentTrustLogoMark } from '@/components/docs/AgentTrustLogoMark';

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <>
      <header className="docs-topbar" aria-label="AgentTrust docs navigation">
        <a className="docs-topbar-brand" href="https://agenttrust.tech">
          <AgentTrustLogoMark className="agenttrust-brand-mark" />
          <span>AgentTrust</span>
        </a>
        <nav aria-label="Docs links">
          <span className="docs-topbar-primary">
            <Link aria-current="page" href="/docs">
              Documentation
            </Link>
            <Link href="/docs/programs/policy-vault">Programs</Link>
            <Link href="/docs/sdk">SDK</Link>
          </span>
          <span className="docs-topbar-secondary">
            <a href="https://github.com/mohit-1710/agenttrust">GitHub</a>
            <a href="https://agenttrust.tech">Launch app</a>
          </span>
        </nav>
      </header>
      <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
        {children}
        <AskAIWidget />
      </DocsLayout>
    </>
  );
}
