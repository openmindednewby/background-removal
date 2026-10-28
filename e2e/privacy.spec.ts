import { expect, test } from '@playwright/test';
import type { BrowserContext, Route } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { HarnessReport } from './harness';

const ORIGIN = 'http://bgr.test';
const IOU_FLOOR = 0.95;
const MOUNTS: Array<[string, string]> = [
  ['/ort/', 'node_modules/onnxruntime-web/dist/'],
  ['/models/', 'models/'],
  ['/fixtures/', 'test/fixtures/'],
  ['/', '.e2e-build/'],
];
const TYPES: Record<string, string | undefined> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.wasm': 'application/wasm',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
};

interface SeenRequest {
  url: string;
  method: string;
  bodyBytes: number;
}

function localFile(pathname: string): string | undefined {
  const mount = MOUNTS.find(([prefix]) => pathname.startsWith(prefix));
  if (mount === undefined) {
    return undefined;
  }
  const relative = pathname === '/' ? 'index.html' : pathname.slice(mount[0].length);
  const file = path.join(mount[1], relative);
  return existsSync(file) ? file : undefined;
}

async function recordAndServe(context: BrowserContext, seen: SeenRequest[]): Promise<void> {
  await context.route('**/*', (route: Route) => {
    const request = route.request();
    seen.push({ url: request.url(), method: request.method(), bodyBytes: request.postDataBuffer()?.length ?? 0 });
    const url = new URL(request.url());
    const file = url.origin === ORIGIN ? localFile(url.pathname) : undefined;
    if (file === undefined) {
      return url.origin === ORIGIN ? route.fulfill({ status: 200, body: '' }) : route.abort();
    }
    return route.fulfill({ status: 200, body: readFileSync(file), contentType: TYPES[path.extname(file)] ?? 'application/octet-stream' });
  });
}

function leaks(seen: SeenRequest[]): SeenRequest[] {
  return seen.filter((request) => request.method !== 'GET' || request.bodyBytes > 0 || !request.url.startsWith(ORIGIN));
}

test.describe('removeBackground in Chromium', () => {
  test('cutting five photos, sends no image bytes and keeps four full photos at IoU 0.95 or more', async ({ page, context }) => {
    const seen: SeenRequest[] = [];
    await recordAndServe(context, seen);
    await page.goto(`${ORIGIN}/`);

    const report = await page.evaluate(() => (window as unknown as { runHarness: () => Promise<HarnessReport> }).runHarness());

    mkdirSync('test-results', { recursive: true });
    writeFileSync('test-results/bgr-report.json', JSON.stringify({ report, seen }, null, 2));
    expect(leaks(seen)).toEqual([]);
    expect(report.cases.filter((result) => result.name !== 'fingertips' && result.iou < IOU_FLOOR)).toEqual([]);
    expect(report.refineErased).toBe(true);
  });

  test('a planted upload of the photo, is caught by the request probe', async ({ page, context }) => {
    const seen: SeenRequest[] = [];
    await recordAndServe(context, seen);
    await page.goto(`${ORIGIN}/`);

    await page.evaluate(async () => {
      const photo = await (await fetch('/fixtures/jimmy.jpg')).blob();
      await fetch('/upload', { method: 'POST', body: photo });
    });

    expect(leaks(seen).map((request) => request.method)).toEqual(['POST']);
  });
});
