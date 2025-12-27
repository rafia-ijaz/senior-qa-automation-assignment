import fs from 'node:fs';
import path from 'node:path';

export function readJsonFile<T>(relativePathFromRepoRoot: string): T {
  const absolutePath = path.resolve(process.cwd(), relativePathFromRepoRoot);
  const raw = fs.readFileSync(absolutePath, 'utf-8');
  return JSON.parse(raw) as T;
}
