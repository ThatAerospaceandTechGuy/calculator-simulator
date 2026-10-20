export type KeyTone =
  | 'number'
  | 'operator'
  | 'function'
  | 'control'
  | 'shift'
  | 'equals'
  | 'ac'
  | 'ok';

export type KeyIcon =
  | 'power'
  | 'home'
  | 'settings'
  | 'back'
  | 'variable'
  | 'catalog'
  | 'tools'
  | 'chevron-up'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'shift'
  | 'fraction'
  | 'chevrons-up'
  | 'chevrons-down';

export interface KeySpec {
  id: string;
  label: string;
  row: number;
  col: number;
  /** Width in 1/30ths of the keypad. The top block uses six 5-unit columns. */
  span?: number;
  rowSpan?: number;
  /** Small blue legend printed above the key. */
  shiftLabel?: string;
  shiftId?: string;
  /** Small white legend printed above a control key. */
  caption?: string;
  captionTone?: 'light' | 'blue';
  kind?: 'key' | 'rocker';
  tone?: KeyTone;
  icon?: KeyIcon;
  /** Smaller type for legends such as FORMAT. */
  small?: boolean;
  ariaLabel?: string;
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
    edition: string;
  };
  display: {
    width: number;
    height: number;
    greyLevels: number;
  };
  keys: KeySpec[];
}
