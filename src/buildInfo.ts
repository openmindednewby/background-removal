import type { AssetVersions } from './assetUrls';

export interface BuildInfo extends AssetVersions {
  downloadBytes: number;
}

declare const __BG_REMOVAL_BUILD__: BuildInfo;

/** Versions and first-download size of the assets this build expects, fixed by tsup at build time. */
export function buildInfo(): BuildInfo {
  return __BG_REMOVAL_BUILD__;
}
