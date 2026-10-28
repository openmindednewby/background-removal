/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/index.ts', '!src/worker.ts', '!src/vite.ts', '!src/client.ts', '!src/defaultWorker.ts', '!src/refineCanvas.ts'],
  coverageThreshold: { global: { branches: 80, functions: 100, lines: 100, statements: 100 } },
  transform: { '^.+\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }] },
};
