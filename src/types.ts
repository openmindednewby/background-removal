export interface Size {
  width: number;
  height: number;
}

export interface MaskBuffer extends Size {
  data: Uint8ClampedArray;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect extends Size {
  left: number;
  top: number;
}
