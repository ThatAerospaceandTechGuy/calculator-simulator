import type { CalculatorSpec, KeySpec } from './types';

const keys: KeySpec[] = [
  { id: 'shift', label: 'SHIFT', row: 0, col: 0, kind: 'key', tone: 'shift' },
  { id: 'dpad', label: 'D-pad', row: 0, col: 1, span: 3, rowSpan: 2, kind: 'dpad' },
  { id: 'on', label: 'ON', row: 0, col: 4, tone: 'control' },

  { id: 'home', label: 'HOME', row: 1, col: 0, tone: 'control' },
  { id: 'settings', label: 'SETTINGS', row: 1, col: 4, tone: 'control' },

  { id: 'x2', label: 'x²', row: 2, col: 0, shiftLabel: 'x³', shiftId: 'x3', tone: 'function' },
  { id: 'pow', label: 'x^', row: 2, col: 1, tone: 'function' },
  { id: 'sqrt', label: '√', row: 2, col: 2, shiftLabel: '∛', shiftId: 'cbrt', tone: 'function' },
  { id: 'frac', label: 'a⁄b', row: 2, col: 3, tone: 'function' },
  { id: 'recip', label: 'x⁻¹', row: 2, col: 4, tone: 'function' },

  { id: 'log', label: 'log', row: 3, col: 0, shiftLabel: '10ˣ', shiftId: 'pow10', tone: 'function' },
  { id: 'ln', label: 'ln', row: 3, col: 1, shiftLabel: 'eˣ', shiftId: 'expe', tone: 'function' },
  { id: 'sin', label: 'sin', row: 3, col: 2, shiftLabel: 'sin⁻¹', shiftId: 'asin', tone: 'function' },
  { id: 'cos', label: 'cos', row: 3, col: 3, shiftLabel: 'cos⁻¹', shiftId: 'acos', tone: 'function' },
  { id: 'tan', label: 'tan', row: 3, col: 4, shiftLabel: 'tan⁻¹', shiftId: 'atan', tone: 'function' },

  { id: 'neg', label: '(−)', row: 4, col: 0, tone: 'function' },
  { id: 'abs', label: '|x|', row: 4, col: 1, tone: 'function' },
  { id: 'lparen', label: '(', row: 4, col: 2, tone: 'function' },
  { id: 'rparen', label: ')', row: 4, col: 3, tone: 'function' },
  { id: 'percent', label: '%', row: 4, col: 4, tone: 'function' },

  { id: '7', label: '7', row: 5, col: 0, tone: 'number' },
  { id: '8', label: '8', row: 5, col: 1, tone: 'number' },
  { id: '9', label: '9', row: 5, col: 2, tone: 'number' },
  { id: 'del', label: 'DEL', row: 5, col: 3, tone: 'control' },
  { id: 'ac', label: 'AC', row: 5, col: 4, tone: 'ac' },

  { id: '4', label: '4', row: 6, col: 0, tone: 'number' },
  { id: '5', label: '5', row: 6, col: 1, tone: 'number' },
  { id: '6', label: '6', row: 6, col: 2, tone: 'number' },
  { id: 'mul', label: '×', row: 6, col: 3, tone: 'operator' },
  { id: 'div', label: '÷', row: 6, col: 4, tone: 'operator' },

  { id: '1', label: '1', row: 7, col: 0, tone: 'number' },
  { id: '2', label: '2', row: 7, col: 1, tone: 'number' },
  { id: '3', label: '3', row: 7, col: 2, tone: 'number' },
  { id: 'add', label: '+', row: 7, col: 3, tone: 'operator' },
  { id: 'sub', label: '−', row: 7, col: 4, tone: 'operator' },

  { id: '0', label: '0', row: 8, col: 0, tone: 'number' },
  { id: 'dot', label: '.', row: 8, col: 1, tone: 'number' },
  { id: 'exp10', label: '×10ˣ', row: 8, col: 2, shiftLabel: 'π', shiftId: 'pi', tone: 'function' },
  { id: 'ans', label: 'Ans', row: 8, col: 3, shiftLabel: 'PreAns', shiftId: 'preans', tone: 'function' },
  { id: 'equals', label: '=', row: 8, col: 4, tone: 'equals' },
];

function classwiz(
  id: string,
  model: string,
  solar: boolean,
  bodyTop: string,
  bodyBottom: string,
): CalculatorSpec {
  return {
    id,
    brand: 'Casio',
    model,
    label: `ClassWiz ${model}`,
    family: 'classwiz',
    exam: { gcse: true, alevel: false },
    features: ['fraction', 'surd', 'trig', 'angle-units', 'scientific-notation'],
    shell: {
      bodyTop,
      bodyBottom,
      accent: '#c8102e',
      solar,
      label: 'ClassWiz',
    },
    display: { width: 192, height: 63, greyLevels: 4 },
    keys,
  };
}

export const fx83gtCwPlus = classwiz(
  'casio-fx-83gt-cw-plus',
  'fx-83GT CW+',
  false,
  '#f5f3ee',
  '#d4d0c7',
);

export const fx85gtCwPlus = classwiz(
  'casio-fx-85gt-cw-plus',
  'fx-85GT CW+',
  true,
  '#eef4ef',
  '#c9d2ca',
);

export const SPECS: CalculatorSpec[] = [fx83gtCwPlus, fx85gtCwPlus];
