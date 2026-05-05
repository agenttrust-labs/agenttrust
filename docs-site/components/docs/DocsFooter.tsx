import type { JSX } from 'react';
import { GITHUB_REPO, LICENSE, SDK_PACKAGE } from '@/lib/constants';

export function DocsFooter(): JSX.Element {
  return (
    <footer className="docs-footer">
      <span>
        repo <code>{GITHUB_REPO}</code>
      </span>
      <span>
        npm <code>{SDK_PACKAGE}</code>
      </span>
      <span className="license-badge">{LICENSE}</span>
    </footer>
  );
}
