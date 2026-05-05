import 'server-only';

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const DOCS_ROOT = path.join(process.cwd(), 'content/docs');

async function collectMdxFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return collectMdxFiles(fullPath);
      if (entry.isFile() && entry.name.endsWith('.mdx')) return [fullPath];
      return [];
    }),
  );

  return files.flat().sort();
}

function pagePathForFile(filePath: string): string {
  const relativePath = path.relative(DOCS_ROOT, filePath);
  const withoutExtension = relativePath.replace(/\.mdx$/, '');
  if (withoutExtension === 'index') return '/';
  if (withoutExtension.endsWith('/index')) {
    return `/${withoutExtension.slice(0, -'/index'.length)}`;
  }
  return `/${withoutExtension}`;
}

export async function loadDocsContext(): Promise<string> {
  const files = await collectMdxFiles(DOCS_ROOT);
  const sections = await Promise.all(
    files.map(async (filePath) => {
      const content = await readFile(filePath, 'utf8');
      return `# ${pagePathForFile(filePath)}\n\n${content}`;
    }),
  );

  return sections.join('\n\n---\n\n');
}

export async function buildDocsAssistantPrompt(): Promise<string> {
  const docs = await loadDocsContext();

  return `You are AgentTrust's documentation assistant. Answer questions about AgentTrust using ONLY the documentation below. If the answer is not in the docs, say "Not covered in current docs — see github.com/mohit-1710/agenttrust". Cite the page path you are answering from when relevant.

<DOCS>
${docs}
</DOCS>`;
}
