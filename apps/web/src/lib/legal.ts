import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { marked } from 'marked';

// Legal pages are rendered from docs/legal so the repo has a single source of truth (STAGE2 §9).
const LEGAL_DIR = path.join(process.cwd(), '..', '..', 'docs', 'legal');

export async function renderLegal(file: string) {
  const md = await readFile(path.join(LEGAL_DIR, file), 'utf8');
  return marked.parse(md, { async: false });
}
