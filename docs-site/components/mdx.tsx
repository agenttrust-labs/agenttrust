import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { KaniProofBadge } from './docs/KaniProofBadge';
import { ProgramIdsTable } from './docs/ProgramIdsTable';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    KaniProofBadge,
    ProgramIdsTable,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
