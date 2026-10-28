import { createBackgroundRemover as createWithWorker } from './client';
import type { BackgroundRemover, BackgroundRemoverOptions } from './client';
import { createDefaultWorker } from './defaultWorker';

export { createDefaultWorker } from './defaultWorker';

export type DefaultWorkerRemoverOptions = Omit<BackgroundRemoverOptions, 'createWorker'> & { createWorker?: () => Worker };

/** The main createBackgroundRemover, starting the bundled worker beside this file unless createWorker is given. */
export function createBackgroundRemover(options: DefaultWorkerRemoverOptions): BackgroundRemover {
  return createWithWorker({ ...options, createWorker: options.createWorker ?? createDefaultWorker });
}
