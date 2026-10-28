export function createDefaultWorker(): Worker {
  return new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
}
