import { DEFAULT_BASE_PATH } from './viteAssets';

export interface AssetArgs {
  outDir: string;
  basePath: string;
  urlsFile?: string;
}

export const ASSET_USAGE = 'usage: bg-removal-assets <outDir> [--base-path /bg-removal/] [--urls-file <file.json>]';

function valueAfter(argv: readonly string[], index: number): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${argv[index] ?? ''} needs a value; ${ASSET_USAGE}`);
  }
  return value;
}

/** Reads the asset-copy CLI arguments; throws with the usage line on anything it does not know. */
export function parseAssetArgs(argv: readonly string[]): AssetArgs {
  const args: Partial<AssetArgs> = { basePath: DEFAULT_BASE_PATH };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? '';
    if (arg === '--base-path') {
      args.basePath = valueAfter(argv, i);
      i += 1;
    } else if (arg === '--urls-file') {
      args.urlsFile = valueAfter(argv, i);
      i += 1;
    } else if (!arg.startsWith('--') && args.outDir === undefined) {
      args.outDir = arg;
    } else {
      throw new Error(`unexpected argument ${arg}; ${ASSET_USAGE}`);
    }
  }
  if (args.outDir === undefined) {
    throw new Error(ASSET_USAGE);
  }
  return { outDir: args.outDir, basePath: args.basePath ?? DEFAULT_BASE_PATH, urlsFile: args.urlsFile };
}
