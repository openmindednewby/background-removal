import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { copyBgRemovalAssets, installedAssetUrls } from './assets';
import { parseAssetArgs } from './cliArgs';

const args = parseAssetArgs(process.argv.slice(2));
const copies = copyBgRemovalAssets(resolve(args.outDir), args.basePath);
if (args.urlsFile !== undefined) {
  const urlsFile = resolve(args.urlsFile);
  mkdirSync(dirname(urlsFile), { recursive: true });
  writeFileSync(urlsFile, `${JSON.stringify(installedAssetUrls(args.basePath), null, 2)}\n`);
}
process.stdout.write(`bg-removal-assets: copied ${copies.length} files into ${args.outDir}\n`);
