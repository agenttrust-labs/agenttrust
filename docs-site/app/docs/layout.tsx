import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import Link from 'next/link';
import { baseOptions } from '@/lib/layout.shared';
import { AskAIWidget } from '@/components/ask-ai/AskAIWidget';

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <>
      <header className="docs-topbar" aria-label="AgentTrust docs navigation">
        <a className="docs-topbar-brand" href="https://agenttrust.tech">
          <span aria-hidden="true" className="agenttrust-brand-mark" />
          <span>AgentTrust</span>
        </a>
        <nav aria-label="Docs links">
          <Link aria-current="page" href="/docs">
            Documentation
          </Link>
          <a href="https://agenttrust.tech">Home</a>
          <a href="https://github.com/mohit-1710/agenttrust">GitHub</a>
        </nav>
      </header>
      <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
        {children}
        <AskAIWidget />
      </DocsLayout>
    </>
  );
}
