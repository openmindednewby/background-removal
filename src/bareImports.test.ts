import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bareImports } from './bareImports';

function moduleWith(code: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'bare-'));
  writeFileSync(join(dir, 'local.js'), 'export const a = 1;');
  const entry = join(dir, 'entry.js');
  writeFileSync(entry, code);
  return entry;
}

describe('bareImports', () => {
  it('with static, side-effect, dynamic and node builtin imports of packages, lists each package', async () => {
    const entry = moduleWith(`import * as ort from 'onnxruntime-web';import "x-side";const d = await import("dyn");import fs from 'node:fs';console.log(ort, d, fs);`);

    const found = await bareImports(entry);

    expect([...found].sort()).toEqual(['dyn', 'node:fs', 'onnxruntime-web', 'x-side']);
  });

  it('with a relative import, a runtime-built url import and from-like text in strings, lists nothing', async () => {
    const entry = moduleWith(`import { a } from './local.js';const u = 'https://h/' + a;await import(u);const s = "copy-from" + "from 'int32'";console.log(s);`);

    const found = await bareImports(entry);

    expect(found).toEqual([]);
  });
});
