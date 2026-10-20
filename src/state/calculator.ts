import { CalcError } from '../engine/errors';
import { decimalText, formatValue } from '../engine/format';
import { autoCloseParentheses, parse } from '../engine/parser';
import { evaluate } from '../engine/evaluator';
import { ZERO, type AngleUnit, type Value } from '../engine/values';
import {
  backspace,
  createCursor,
  insertAtom,
  insertFunction,
  insertNumber,
  insertOp,
  insertTemplate,
  isEmpty,
  move,
  serialize,
  type Cursor,
  type EditResult,
  type Node,
} from '../input/nodes';

export type Screen = 'calc' | 'home' | 'settings';

export interface HistoryEntry {
  input: string;
  result: string;
}

export interface CalcState {
  input: Node[];
  cursor: Cursor;
  result: string | null;
  error: string | null;
  shift: boolean;
  angleUnit: AngleUnit;
  ans: Value;
  preAns: Value;
  history: HistoryEntry[];
  justEvaluated: boolean;
  screen: Screen;
}

export function createState(): CalcState {
  return {
    input: [],
    cursor: createCursor(),
    result: null,
    error: null,
    shift: false,
    angleUnit: 'DEG',
    ans: ZERO,
    preAns: ZERO,
    history: [],
    justEvaluated: false,
    screen: 'calc',
  };
}

/** Keys that begin a fresh expression once a result has been shown. */
const VALUE_KEYS = new Set([
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'dot',
  'lparen',
  'neg',
  'pi',
  'ans',
  'preans',
  'frac',
  'sqrt',
  'cbrt',
  'abs',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'log',
  'ln',
  'pow10',
  'expe',
]);

const OPERATOR_KEYS = new Set(['add', 'sub', 'mul', 'div', 'pow', 'x2', 'x3', 'recip', 'percent']);

const OPERATOR_TEXT: Record<string, string> = {
  add: '+',
  sub: '-',
  mul: '*',
  div: '/',
  pow: '^',
  lparen: '(',
  rparen: ')',
  percent: '%',
  neg: '-',
};

type Editor = (nodes: Node[], cursor: Cursor) => EditResult | null;

function edit(state: CalcState, editor: Editor): CalcState {
  const outcome = editor(state.input, state.cursor);
  if (!outcome) return state;
  return {
    ...state,
    input: outcome.nodes,
    cursor: outcome.cursor,
    result: null,
    error: null,
    justEvaluated: false,
  };
}

function cycleAngle(unit: AngleUnit): AngleUnit {
  if (unit === 'DEG') return 'RAD';
  if (unit === 'RAD') return 'GRA';
  return 'DEG';
}

function evaluateInput(state: CalcState): CalcState {
  if (isEmpty(state.input)) return state;
  const source = autoCloseParentheses(serialize(state.input));
  try {
    const ast = parse(source);
    const value = evaluate(ast, {
      ans: state.ans,
      preAns: state.preAns,
      angleUnit: state.angleUnit,
    });
    // Casio keeps decimal input decimal: 0.1 + 0.2 displays 0.3, while 1 ÷ 3
    // stays exact. A decimal literal anywhere in the expression forces S⇔D to D.
    const prefersDecimal = /(?:\d\.\d|\.\d)/.test(source);
    const text = prefersDecimal ? decimalText(value) : formatValue(value);
    return {
      ...state,
      result: text,
      error: null,
      ans: value,
      preAns: state.ans,
      justEvaluated: true,
      history: [...state.history, { input: source, result: text }].slice(-20),
    };
  } catch (error) {
    const code = error instanceof CalcError ? error.code : 'Math ERROR';
    return { ...state, result: null, error: code, justEvaluated: true };
  }
}

export function press(state: CalcState, keyId: string): CalcState {
  // After `=`, a value key starts a new expression; an operator continues from Ans.
  if (state.justEvaluated) {
    if (VALUE_KEYS.has(keyId)) {
      state = { ...state, input: [], cursor: createCursor(), justEvaluated: false };
    } else if (OPERATOR_KEYS.has(keyId)) {
      state = {
        ...state,
        input: [{ kind: 'atom', text: 'Ans' }],
        cursor: { path: [], index: 1 },
        justEvaluated: false,
      };
    } else if (keyId === 'del' || keyId === 'left' || keyId === 'right') {
      state = { ...state, result: null, error: null, justEvaluated: false };
    }
  }

  switch (keyId) {
    case 'shift':
      return { ...state, shift: !state.shift };

    case 'ac':
      return { ...state, input: [], cursor: createCursor(), result: null, error: null, justEvaluated: false };

    case 'on':
      return { ...createState(), angleUnit: state.angleUnit, ans: state.ans, history: state.history };

    case 'home':
      return { ...state, screen: 'calc' };

    case 'settings':
      return { ...state, angleUnit: cycleAngle(state.angleUnit) };

    case 'ok':
      return state;

    case 'equals':
      return evaluateInput(state);

    case 'del':
      return edit(state, backspace);

    case 'left':
      return { ...state, cursor: move(state.input, state.cursor, 'left') };
    case 'right':
      return { ...state, cursor: move(state.input, state.cursor, 'right') };
    case 'up':
      return { ...state, cursor: move(state.input, state.cursor, 'up') };
    case 'down':
      return { ...state, cursor: move(state.input, state.cursor, 'down') };

    case 'dot':
      return edit(state, (nodes, cursor) => insertNumber(nodes, cursor, '.'));

    case 'frac':
      return edit(state, (nodes, cursor) => insertTemplate(nodes, cursor, 'frac'));
    case 'sqrt':
      return edit(state, (nodes, cursor) => insertTemplate(nodes, cursor, 'sqrt'));

    case 'add':
    case 'sub':
    case 'mul':
    case 'div':
    case 'pow':
    case 'lparen':
    case 'rparen':
    case 'percent':
    case 'neg': {
      const text = OPERATOR_TEXT[keyId];
      return edit(state, (nodes, cursor) => insertOp(nodes, cursor, text));
    }

    case 'x2': {
      return edit(state, (nodes, cursor) => {
        const powered = insertOp(nodes, cursor, '^');
        return insertNumber(powered.nodes, powered.cursor, '2');
      });
    }

    case 'x3': {
      return edit(state, (nodes, cursor) => {
        const powered = insertOp(nodes, cursor, '^');
        return insertNumber(powered.nodes, powered.cursor, '3');
      });
    }

    case 'recip':
      return edit(state, (nodes, cursor) => {
        const powered = insertOp(nodes, cursor, '^');
        const minus = insertOp(powered.nodes, powered.cursor, '-');
        return insertNumber(minus.nodes, minus.cursor, '1');
      });

    case 'exp10':
      return edit(state, (nodes, cursor) => {
        const times = insertOp(nodes, cursor, '*');
        const ten = insertNumber(times.nodes, times.cursor, '1');
        if (!ten) return null;
        const zero = insertNumber(ten.nodes, ten.cursor, '0');
        if (!zero) return null;
        return insertOp(zero.nodes, zero.cursor, '^');
      });

    case 'pow10':
      return edit(state, (nodes, cursor) => {
        const one = insertNumber(nodes, cursor, '1');
        if (!one) return null;
        const zero = insertNumber(one.nodes, one.cursor, '0');
        if (!zero) return null;
        return insertOp(zero.nodes, zero.cursor, '^');
      });

    case 'expe':
      return edit(state, (nodes, cursor) => {
        const e = insertAtom(nodes, cursor, 'e');
        return insertOp(e.nodes, e.cursor, '^');
      });

    case 'pi':
      return edit(state, (nodes, cursor) => insertAtom(nodes, cursor, 'π'));
    case 'ans':
      return edit(state, (nodes, cursor) => insertAtom(nodes, cursor, 'Ans'));
    case 'preans':
      return edit(state, (nodes, cursor) => insertAtom(nodes, cursor, 'PreAns'));

    case 'sin':
    case 'cos':
    case 'tan':
    case 'asin':
    case 'acos':
    case 'atan':
    case 'log':
    case 'ln':
    case 'abs':
    case 'cbrt':
      return edit(state, (nodes, cursor) => insertFunction(nodes, cursor, keyId));

    default:
      if (/^[0-9]$/.test(keyId)) {
        return edit(state, (nodes, cursor) => insertNumber(nodes, cursor, keyId));
      }
      return state;
  }
}

/** Convenience for tests: run a sequence of key ids. */
export function pressKeys(state: CalcState, keys: string[]): CalcState {
  return keys.reduce((current, key) => press(current, key), state);
}

/**
 * Resolves the SHIFT latch against a key spec, then consumes it. Both mouse and
 * physical-keyboard input go through this function so behaviour cannot diverge.
 */
export function pressKey(
  state: CalcState,
  key: { id: string; shiftId?: string },
): CalcState {
  if (key.id === 'shift') return press(state, 'shift');
  const effective = state.shift ? key.shiftId ?? key.id : key.id;
  return press({ ...state, shift: false }, effective);
}
