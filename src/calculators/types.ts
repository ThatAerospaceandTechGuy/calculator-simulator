export type KeyTone = 'number' | 'operator' | 'function' | 'control' | 'shift' | 'equals' | 'ac';

export interface KeySpec {
  id: string;
  label: string;
  row: number;
  col: number;
  span?: number;
  rowSpan?: number;
  shiftLabel?: string;
  shiftId?: string;
  kind?: 'key' | 'dpad';
  tone?: KeyTone;
}

export interface CalculatorSpec {
  id: string;
  brand: string;
  model: string;
  label: string;
  family: 'classwiz' | 'graphing';
  exam: { gcse: boolean; alevel: boolean };
  features: string[];
  shell: {
    bodyTop: string;
    bodyBottom: string;
    accent: string;
    solar: boolean;
    label: string;
  };
  display: {
    width: number;
    height: number;
    greyLevels: number;
  };
  keys: KeySpec[];
}
