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

export type Screen = 'calc' | 'home' | 'off';

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
  homeIndex: number;
  notice: string | null;
}

const HOME_APPS = ['Calculate', 'Statistics', 'Table', 'Ratio', 'Math Box'];

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
    screen: 'home',
    homeIndex: 0,
    notice: null,
  };
}

/** Keys that are meaningful on the HOME screen without starting a calculation. */
const HOME_KEYS = new Set([
  'on',
  'home',
  'settings',
  'shift',
  'up',
  'down',
  'left',
  'right',
  'ok',
  'equals',
  'pageup',
  'pagedown',
  'ac',
  'del',
  'back',
  'off',
  'format',
  'variable',
  'function',
  'catalog',
  'tools',
]);

/** Keys whose only job is to display an informational notice. */
const NOTICE_KEYS = new Set([
  'variable',
  'function',
  'catalog',
  'tools',
  'xvar',
  'qr',
  'mixed',
  'comma',
  'ins',
  'formatMenu',
]);

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
  'e',
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

const NOTICE_TEXT: Record<string, string> = {
  variable: 'VARIABLES NOT MODELLED',
  function: 'FUNCTIONS NOT MODELLED',
  catalog: 'CATALOG NOT MODELLED',
  tools: 'TOOLS NOT MODELLED',
  xvar: 'VARIABLE X NOT MODELLED',
  qr: 'QR CODE NOT MODELLED',
  mixed: 'MIXED NUMBERS NOT MODELLED',
  comma: 'COMMA NOT MODELLED',
  ins: 'INSERT MODE NOT MODELLED',
  formatMenu: 'FORMAT MENU NOT MODELLED',
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
    notice: null,
    justEvaluated: false,
  };
}

function notice(state: CalcState, text: string): CalcState {
  return { ...state, notice: text, shift: false };
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
      notice: null,
      ans: value,
      preAns: state.ans,
      justEvaluated: true,
      history: [...state.history, { input: source, result: text }].slice(-20),
    };
  } catch (error) {
    const code = error instanceof CalcError ? error.code : 'Math ERROR';
    return { ...state, result: null, error: code, notice: null, justEvaluated: true };
  }
}

/**
 * S⇔D / FORMAT behaviour. The 2nd edition FORMAT key toggles the current
 * result between its standard and decimal forms on a single press.
 */
function toggleResultFormat(state: CalcState): CalcState {
  if (!state.result || state.error) return state;
  const standard = formatValue(state.ans);
  const decimal = decimalText(state.ans);
  if (state.result === standard) {
    return { ...state, result: decimal, notice: null };
  }
  if (state.result === decimal) {
    return { ...state, result: standard, notice: null };
  }
  // Results entered as decimals and never evaluated exactly fall here.
  return { ...state, result: decimal === state.result ? standard : decimal, notice: null };
}

function moveHome(index: number, keyId: string): number {
  switch (keyId) {
    case 'left':
      return [0, 0, 1, 3, 3][index] ?? index;
    case 'right':
      return [1, 2, 2, 4, 4][index] ?? index;
    case 'up':
      return [0, 1, 2, 0, 1][index] ?? index;
    case 'down':
      return [3, 4, 2, 3, 4][index] ?? index;
    case 'pageup':
      return Math.max(0, index - 3);
    case 'pagedown':
      return Math.min(HOME_APPS.length - 1, index + 3);
    default:
      return index;
  }
}

/** Launch the selected HOME app. Only the Calculate app is implemented. */
function launchHome(state: CalcState): CalcState {
  if (state.homeIndex === 0) {
    return { ...state, screen: 'calc', notice: null, shift: false };
  }
  const app = HOME_APPS[state.homeIndex] ?? 'APP';
  return notice(state, `${app.toUpperCase()} NOT MODELLED`);
}

export function press(state: CalcState, keyId: string): CalcState {
  // While the unit is off, only ON has any effect.
  if (state.screen === 'off') {
    if (keyId !== 'on') return state;
    return { ...createState(), angleUnit: state.angleUnit, ans: state.ans, history: state.history };
  }

  // A notice belongs to the last key press; any different action dismisses it.
  if (state.notice && !NOTICE_KEYS.has(keyId)) {
    state = { ...state, notice: null };
  }

  // Any calculation key starts the Calculate app from HOME.
  if (state.screen === 'home' && !HOME_KEYS.has(keyId)) {
    state = { ...state, screen: 'calc', homeIndex: 0, notice: null };
  }

  if (state.screen === 'home') {
    switch (keyId) {
      case 'on':
        return { ...createState(), angleUnit: state.angleUnit, ans: state.ans, history: state.history };
      case 'home':
        return { ...state, shift: false };
      case 'shift':
        return { ...state, shift: !state.shift };
      case 'settings':
        return { ...state, angleUnit: cycleAngle(state.angleUnit), shift: false };
      case 'up':
      case 'down':
      case 'left':
      case 'right':
      case 'pageup':
      case 'pagedown':
        return {
          ...state,
          homeIndex: moveHome(state.homeIndex, keyId),
          notice: null,
          shift: false,
        };
      case 'ok':
      case 'equals':
        return launchHome(state);
      case 'ac':
        return {
          ...state,
          input: [],
          cursor: createCursor(),
          result: null,
          error: null,
          notice: null,
          shift: false,
          justEvaluated: false,
        };
      case 'del':
        return { ...state, notice: null, shift: false };
      case 'back':
        return { ...state, notice: null, shift: false };
      case 'off':
        return { ...state, screen: 'off', shift: false, notice: null };
      case 'format':
        return notice(state, 'NO RESULT TO FORMAT');
      case 'variable':
      case 'function':
      case 'catalog':
      case 'tools':
        return notice(state, NOTICE_TEXT[keyId] ?? 'NOT MODELLED');
      default:
        return state;
    }
  }

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
      return {
        ...state,
        input: [],
        cursor: createCursor(),
        result: null,
        error: null,
        notice: null,
        justEvaluated: false,
        shift: false,
      };

    case 'on':
      return { ...createState(), angleUnit: state.angleUnit, ans: state.ans, history: state.history };

    case 'home':
      return { ...state, screen: 'home', notice: null, shift: false };

    case 'back':
      return { ...state, screen: 'home', notice: null, shift: false };

    case 'settings':
      return { ...state, angleUnit: cycleAngle(state.angleUnit), shift: false };

    case 'ok':
    case 'equals':
      return evaluateInput(state);

    case 'format':
    case 'approx':
      return toggleResultFormat(state);

    case 'off':
      return { ...state, screen: 'off', shift: false, notice: null };

    case 'variable':
    case 'function':
    case 'catalog':
    case 'tools':
    case 'xvar':
    case 'qr':
    case 'mixed':
    case 'comma':
    case 'ins':
    case 'formatMenu':
      return notice(state, NOTICE_TEXT[keyId] ?? 'NOT MODELLED');

    case 'pageup':
    case 'pagedown':
      return state;

    case 'del':
      return edit(state, backspace);

    case 'left':
      return { ...state, cursor: move(state.input, state.cursor, 'left'), notice: null };
    case 'right':
      return { ...state, cursor: move(state.input, state.cursor, 'right'), notice: null };
    case 'up':
      return { ...state, cursor: move(state.input, state.cursor, 'up'), notice: null };
    case 'down':
      return { ...state, cursor: move(state.input, state.cursor, 'down'), notice: null };

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
    case 'e':
      return edit(state, (nodes, cursor) => insertAtom(nodes, cursor, 'e'));
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
