import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 300_000,
  globalSetup: './e2e/global-setup.ts',
  reporter: 'list',
  workers: 1,
  use: { ...devices['Desktop Chrome'] },
});
