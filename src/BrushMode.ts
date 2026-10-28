export const BrushMode = {
  Keep: 'keep',
  Erase: 'erase',
} as const;

export type BrushMode = (typeof BrushMode)[keyof typeof BrushMode];
