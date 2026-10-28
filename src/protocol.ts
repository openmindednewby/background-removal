import type { Backend } from './Backend';
import type { ModelKind } from './ModelKind';

export interface WorkerConfig {
  modelUrl: string;
  runtimeBaseUrl: string;
  model: ModelKind;
  preferWebGpu: boolean;
}

export interface CutRequest {
  id: number;
  config: WorkerConfig;
  image: Blob | ImageBitmap;
}

export interface CutSuccess {
  id: number;
  ok: true;
  png: Blob;
  mask: Uint8ClampedArray<ArrayBuffer>;
  image: Uint8ClampedArray<ArrayBuffer>;
  width: number;
  height: number;
  backend: Backend;
  elapsedMs: number;
}

export interface CutFailure {
  id: number;
  ok: false;
  error: string;
}

export type CutResponse = CutSuccess | CutFailure;
