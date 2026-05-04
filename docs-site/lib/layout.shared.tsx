import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, gitConfig } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="agenttrust-brand">
          <span aria-hidden="true" className="agenttrust-brand-mark" />
          <span>{appName}</span>
        </span>
      ),
      url: 'https://agenttrust.tech',
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
