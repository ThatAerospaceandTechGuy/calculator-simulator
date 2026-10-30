import { CalcError } from '../engine/errors';
import { decimalText, formatValue, type FormatOptions } from '../engine/format';
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
import {
  DEFAULT_SETTINGS,
  applySetting,
  currentOptionIndex,
  getMenuPage,
  menuItemCount,
  type CalcSettings,
  type FormatAction,
  type MenuPage,
} from './settings';

export type Screen = 'calc' | 'home' | 'off' | 'menu' | 'stat' | 'table' | 'ratio' | 'mathbox';

export interface HistoryEntry {
  input: string;
  result: string;
}

export interface StatColumn {
  /** Raw entered values as strings (preserves input formatting). */
  values: string[];
  /** Parsed numeric values. */
  nums: number[];
}

export interface StatState {
  mode: '1-VAR' | '2-VAR';
  /** Column 0 = X, column 1 = Y (for 2-VAR). */
  columns: StatColumn[];
  /** Currently focused column (0 = X, 1 = Y). */
  focusCol: number;
  /** Currently focused row. */
  focusRow: number;
  /** Computed results, or null until calculated. */
  results: Record<string, string> | null;
  /** 'data' = entering data, 'results' = viewing results. */
  view: 'data' | 'results';
}

export interface TableState {
  /** Function expression as text (e.g. "2x+1"). */
  func: string;
  /** Range values. */
  start: number;
  end: number;
  step: number;
  /** Computed rows, or null until generated. */
  rows: { x: string; y: string }[] | null;
  /** 'input' = entering params, 'results' = viewing table. */
  view: 'input' | 'results';
}

export interface RatioState {
  a: string;
  b: string;
  /** Which field is focused: 'a' or 'b'. */
  focus: 'a' | 'b';
  result: string | null;
  view: 'input' | 'result';
}

export interface MathBoxState {
  tool: string | null;
  input: string;
  result: string | null;
}

export interface CalcState {
  input: Node[];
  cursor: Cursor;
  result: string | null;
  error: string | null;
  shift: boolean;
  settings: CalcSettings;
  ans: Value;
  preAns: Value;
  history: HistoryEntry[];
  justEvaluated: boolean;
  screen: Screen;
  homeIndex: number;
  notice: string | null;
  menuPage: MenuPage;
  menuIndex: number;
  menuReturn: 'calc' | 'home';
  // App-specific state (only one is active at a time, determined by `screen`).
  stat: StatState;
  table: TableState;
  ratio: RatioState;
  mathbox: MathBoxState;
}

const HOME_APPS = ['Calculate', 'Statistics', 'Table', 'Ratio', 'Math Box'];

export function createState(): CalcState {
  return {
    input: [],
    cursor: createCursor(),
    result: null,
    error: null,
    shift: false,
    settings: { ...DEFAULT_SETTINGS },
    ans: ZERO,
    preAns: ZERO,
    history: [],
    justEvaluated: false,
    screen: 'home',
    homeIndex: 0,
    notice: null,
    menuPage: 'settingsRoot',
    menuIndex: 0,
    menuReturn: 'home',
    stat: {
      mode: '1-VAR',
      columns: [{ values: [], nums: [] }, { values: [], nums: [] }],
      focusCol: 0,
      focusRow: 0,
      results: null,
      view: 'data',
    },
    table: {
      func: '',
      start: 1,
      end: 10,
      step: 1,
      rows: null,
      view: 'input',
    },
    ratio: { a: '', b: '', focus: 'a', result: null, view: 'input' },
    mathbox: { tool: null, input: '', result: null },
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
  'formatMenu',
  'approx',
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
  comma: 'COMMA INPUT NOT MODELLED',
  ins: 'INSERT MODE NOT MODELLED',
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

/** The simulator's angle chip is a direct shortcut, not a SETTINGS key press. */
export function cycleAngleState(state: CalcState): CalcState {
  return {
    ...state,
    settings: { ...state.settings, angleUnit: cycleAngle(state.settings.angleUnit) },
    notice: null,
    shift: false,
  };
}

function formatOptions(settings: CalcSettings): FormatOptions {
  return {
    decimalMark: settings.decimalMark === 'Comma' ? 'comma' : 'dot',
    digitSeparator: settings.digitSeparator === 'On',
    fractionResult: settings.fractionResult === 'Mixed Number' ? 'mixed' : 'improper',
    numberFormat: settings.numberFormat === 'Norm 1' ? 'norm1' : 'norm2',
  };
}

function formatStandard(value: Value, settings: CalcSettings): string {
  return formatValue(value, formatOptions(settings));
}

function formatDecimal(value: Value, settings: CalcSettings): string {
  return decimalText(value, formatOptions(settings));
}

function reformatResult(
  result: string | null,
  ans: Value,
  previous: CalcSettings,
  next: CalcSettings,
): string | null {
  if (!result) return result;
  const before = formatOptions(previous);
  const after = formatOptions(next);
  const forms: Array<[string, string]> = [
    [formatValue(ans, before), formatValue(ans, after)],
    [decimalText(ans, before), decimalText(ans, after)],
    [
      formatValue(ans, { ...before, fractionResult: 'improper' }),
      formatValue(ans, { ...after, fractionResult: 'improper' }),
    ],
    [
      formatValue(ans, { ...before, fractionResult: 'mixed' }),
      formatValue(ans, { ...after, fractionResult: 'mixed' }),
    ],
  ];

  for (const [from, to] of forms) {
    if (result === from) return to;
  }
  return result;
}

function evaluateInput(state: CalcState): CalcState {
  if (isEmpty(state.input)) return state;
  const source = autoCloseParentheses(serialize(state.input));
  try {
    const ast = parse(source);
    const value = evaluate(ast, {
      ans: state.ans,
      preAns: state.preAns,
      angleUnit: state.settings.angleUnit,
    });
    // Casio keeps decimal input decimal: 0.1 + 0.2 displays 0.3, while 1 ÷ 3
    // stays exact. A decimal literal anywhere in the expression forces S⇔D to D.
    const prefersDecimal = /(?:\d\.\d|\.\d)/.test(source);
    const forceDecimal =
      state.settings.inputOutput === 'MathI/DecimalO' ||
      state.settings.inputOutput === 'LineI/DecimalO';
    const text =
      prefersDecimal || forceDecimal
        ? formatDecimal(value, state.settings)
        : formatStandard(value, state.settings);
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
  const standard = formatStandard(state.ans, state.settings);
  const decimal = formatDecimal(state.ans, state.settings);
  if (state.result === standard) {
    return { ...state, result: decimal, notice: null };
  }
  if (state.result === decimal) {
    return { ...state, result: standard, notice: null };
  }
  // Results entered as decimals and never evaluated exactly fall here.
  return { ...state, result: decimal === state.result ? standard : decimal, notice: null };
}

function toggleMixedNumber(state: CalcState): CalcState {
  if (!state.result || state.error) return state;
  const options = formatOptions(state.settings);
  const improper = formatValue(state.ans, { ...options, fractionResult: 'improper' });
  const mixed = formatValue(state.ans, { ...options, fractionResult: 'mixed' });
  if (improper === mixed) return state;
  return {
    ...state,
    result: state.result === mixed ? improper : mixed,
    notice: null,
  };
}

function openMenu(
  state: CalcState,
  page: MenuPage,
  returnTo: 'calc' | 'home' = state.menuReturn,
): CalcState {
  const definition = getMenuPage(page, state.settings, state.ans);
  return {
    ...state,
    screen: 'menu',
    menuPage: page,
    menuIndex: currentOptionIndex(definition, state.settings),
    menuReturn: returnTo,
    notice: null,
    shift: false,
  };
}

function closeMenu(state: CalcState): CalcState {
  return { ...state, screen: state.menuReturn, notice: null, shift: false };
}

function previousMenu(state: CalcState): CalcState {
  const definition = getMenuPage(state.menuPage, state.settings, state.ans);
  if (!definition.parent) return closeMenu(state);

  const parent = getMenuPage(definition.parent, state.settings, state.ans);
  const parentIndex = parent.items?.findIndex((item) => item.target === state.menuPage) ?? -1;
  return {
    ...state,
    menuPage: definition.parent,
    menuIndex: parentIndex >= 0 ? parentIndex : 0,
    notice: null,
    shift: false,
  };
}

function openFormatMenu(state: CalcState): CalcState {
  if (!state.result || state.error) return notice(state, 'NO RESULT TO FORMAT');
  return openMenu(state, 'formatMenu', 'calc');
}

function applyFormatAction(state: CalcState, action: FormatAction): CalcState {
  if (!state.result || state.error) {
    return { ...state, screen: 'calc', notice: 'NO RESULT TO FORMAT', shift: false };
  }

  let result: string;
  switch (action) {
    case 'standard':
      result = formatStandard(state.ans, state.settings);
      break;
    case 'decimal':
      result = formatDecimal(state.ans, state.settings);
      break;
    case 'improper':
      result = formatValue(state.ans, {
        ...formatOptions(state.settings),
        fractionResult: 'improper',
      });
      break;
    case 'mixed':
      result = formatValue(state.ans, {
        ...formatOptions(state.settings),
        fractionResult: 'mixed',
      });
      break;
  }

  return {
    ...state,
    screen: state.menuReturn,
    result,
    notice: null,
    shift: false,
  };
}

function activateMenu(state: CalcState): CalcState {
  const definition = getMenuPage(state.menuPage, state.settings, state.ans);

  if (definition.mode === 'message') {
    return closeMenu(state);
  }

  if (definition.mode === 'options') {
    const option = definition.options?.[state.menuIndex];
    if (!option) return state;

    if (definition.setting) {
      if (option.value === undefined) return state;
      const settings = applySetting(state.settings, definition.setting, option.value);
      return {
        ...state,
        settings,
        result: reformatResult(state.result, state.ans, state.settings, settings),
        notice: null,
        shift: false,
      };
    }

    if (option.action) {
      return applyFormatAction(state, option.action);
    }
    return state;
  }

  const item = definition.items?.[state.menuIndex];
  if (!item) return state;
  if (item.target) return openMenu(state, item.target);

  if (item.action === 'resetSettings') {
    const settings = { ...DEFAULT_SETTINGS };
    return {
      ...state,
      settings,
      result: reformatResult(state.result, state.ans, state.settings, settings),
      menuPage: 'settingsRoot',
      menuIndex: 0,
      notice: 'SETTINGS RESET',
      shift: false,
    };
  }

  if (item.action === 'initializeAll') {
    return { ...createState(), notice: 'ALL RESET' };
  }

  return state;
}

function pressMenu(state: CalcState, keyId: string): CalcState {
  const definition = getMenuPage(state.menuPage, state.settings, state.ans);
  const count = menuItemCount(definition);

  switch (keyId) {
    case 'up':
      return count === 0
        ? state
        : { ...state, menuIndex: Math.max(0, state.menuIndex - 1), shift: false };
    case 'down':
      return count === 0
        ? state
        : { ...state, menuIndex: Math.min(count - 1, state.menuIndex + 1), shift: false };
    case 'pageup':
      return count === 0
        ? state
        : { ...state, menuIndex: Math.max(0, state.menuIndex - 4), shift: false };
    case 'pagedown':
      return count === 0
        ? state
        : { ...state, menuIndex: Math.min(count - 1, state.menuIndex + 4), shift: false };
    case 'ok':
    case 'equals':
      return activateMenu(state);
    case 'left':
    case 'back':
      return previousMenu(state);
    case 'ac':
      return closeMenu(state);
    case 'home':
      return { ...state, screen: 'home', notice: null, shift: false };
    case 'on':
      return {
        ...createState(),
        settings: state.settings,
        ans: state.ans,
        history: state.history,
        stat: createState().stat,
        table: createState().table,
        ratio: createState().ratio,
        mathbox: createState().mathbox,
      };
    case 'off':
      return { ...state, screen: 'off', notice: null, shift: false };
    default:
      return state;
  }
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

/** Launch the selected HOME app. */
function launchHome(state: CalcState): CalcState {
  switch (state.homeIndex) {
    case 0:
      return { ...state, screen: 'calc', notice: null, shift: false };
    case 1:
      return { ...state, screen: 'stat', notice: null, shift: false, stat: { ...state.stat, view: 'data' } };
    case 2:
      return { ...state, screen: 'table', notice: null, shift: false, table: { ...state.table, view: 'input' } };
    case 3:
      return { ...state, screen: 'ratio', notice: null, shift: false, ratio: { ...state.ratio, view: 'input' } };
    case 4:
      return { ...state, screen: 'mathbox', notice: null, shift: false, mathbox: { ...state.mathbox } };
    default:
      return state;
  }
}

export function press(state: CalcState, keyId: string): CalcState {
  // While the unit is off, only ON has any effect.
  if (state.screen === 'off') {
    if (keyId !== 'on') return state;
    return {
      ...createState(),
      settings: state.settings,
      ans: state.ans,
      history: state.history,
    };
  }

  // A notice belongs to the last key press; any different action dismisses it.
  if (state.notice && !NOTICE_KEYS.has(keyId)) {
    state = { ...state, notice: null };
  }

  // Menus are modal: keys navigate the menu rather than editing the calculation.
  if (state.screen === 'menu') {
    return pressMenu(state, keyId);
  }

  // App screens (Statistics, Table, Ratio, Math Box) have dedicated key handling.
  if (state.screen === 'stat' || state.screen === 'table' || state.screen === 'ratio' || state.screen === 'mathbox') {
    return pressApp(state, keyId);
  }

  // Any calculation key starts the Calculate app from HOME.
  if (state.screen === 'home' && !HOME_KEYS.has(keyId)) {
    state = { ...state, screen: 'calc', homeIndex: 0, notice: null };
  }

  if (state.screen === 'home') {
    switch (keyId) {
      case 'on':
        return {
          ...createState(),
          settings: state.settings,
          ans: state.ans,
          history: state.history,
        };
      case 'home':
        return { ...state, shift: false };
      case 'shift':
        return { ...state, shift: !state.shift };
      case 'settings':
        return openMenu(state, 'getStarted', 'home');
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
      case 'formatMenu':
      case 'approx':
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
      return {
        ...createState(),
        settings: state.settings,
        ans: state.ans,
        history: state.history,
        stat: createState().stat,
        table: createState().table,
        ratio: createState().ratio,
        mathbox: createState().mathbox,
      };

    case 'home':
      return { ...state, screen: 'home', notice: null, shift: false };

    case 'back':
      return { ...state, screen: 'home', notice: null, shift: false };

    case 'settings':
      return openMenu(state, 'settingsRoot', 'calc');

    case 'ok':
    case 'equals':
      return evaluateInput(state);

    case 'format':
      return state.settings.formatKey === 'Decimal'
        ? toggleResultFormat(state)
        : openFormatMenu(state);

    case 'formatMenu':
      return state.settings.formatKey === 'Decimal'
        ? openFormatMenu(state)
        : toggleResultFormat(state);

    case 'approx':
      return toggleResultFormat(state);

    case 'mixed':
      return toggleMixedNumber(state);

    case 'off':
      return { ...state, screen: 'off', shift: false, notice: null };

    case 'variable':
    case 'function':
    case 'catalog':
    case 'tools':
    case 'xvar':
    case 'qr':
    case 'comma':
    case 'ins':
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
      if (state.settings.expKey === 'Power') {
        return edit(state, (nodes, cursor) => insertOp(nodes, cursor, '^'));
      }
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

/**
 * Key handling for app screens: Statistics, Table, Ratio, Math Box.
 * Each app has its own mini state machine for input vs. results viewing.
 */
function pressApp(state: CalcState, keyId: string): CalcState {
  // Common keys across all apps.
  if (keyId === 'ac' || keyId === 'back') {
    return { ...state, screen: 'home', notice: null, shift: false };
  }
  if (keyId === 'home') return { ...state, screen: 'home', notice: null, shift: false };
  if (keyId === 'on') {
    return {
      ...createState(),
      settings: state.settings,
      ans: state.ans,
      history: state.history,
    };
  }
  if (keyId === 'off') return { ...state, screen: 'off', notice: null, shift: false };
  if (keyId === 'shift') return { ...state, shift: !state.shift };

  // ------------------------------------------------------------------
  // Statistics
  // ------------------------------------------------------------------
  if (state.screen === 'stat') {
    return pressStat(state, keyId);
  }
  // ------------------------------------------------------------------
  // Table
  // ------------------------------------------------------------------
  if (state.screen === 'table') {
    return pressTable(state, keyId);
  }
  // ------------------------------------------------------------------
  // Ratio
  // ------------------------------------------------------------------
  if (state.screen === 'ratio') {
    return pressRatio(state, keyId);
  }
  // ------------------------------------------------------------------
  // Math Box
  // ------------------------------------------------------------------
  if (state.screen === 'mathbox') {
    return pressMathBox(state, keyId);
  }
  return state;
}

/** ---------- Statistics ---------- */

function pressStat(state: CalcState, keyId: string): CalcState {
  const s = state.stat;

  // Results view: navigate results, any key goes back to data entry.
  if (s.view === 'results') {
    if (keyId === 'up' || keyId === 'down' || keyId === 'left' || keyId === 'right') {
      return { ...state, stat: { ...s, view: 'data' } };
    }
    if (keyId === 'ok' || keyId === 'equals') {
      return { ...state, stat: { ...s, view: 'data' } };
    }
    return state;
  }

  // Data entry view.
  const col = s.columns[s.focusCol];
  const currentVal = col.values[s.focusRow] ?? '';

  switch (keyId) {
    case 'up':
      return {
        ...state,
        stat: { ...s, focusRow: Math.max(0, s.focusRow - 1) },
      };
    case 'down':
      return {
        ...state,
        stat: { ...s, focusRow: s.focusRow + 1 },
      };
    case 'left':
      return {
        ...state,
        stat: { ...s, focusCol: s.focusCol === 0 ? (s.mode === '2-VAR' ? 1 : 0) : 0 },
      };
    case 'right':
      return {
        ...state,
        stat: { ...s, focusCol: s.focusCol === 0 ? 1 : 0 },
      };
    case 'ok':
    case 'equals':
      // If current cell is empty but data exists elsewhere, compute results.
      const hasData = s.columns.some((c) => c.nums.some((v) => !Number.isNaN(v)));
      if (currentVal === '' && hasData && !s.results) {
        return {
          ...state,
          stat: { ...s, results: computeStatResults(s), view: 'results' },
        };
      }
      // Commit current cell and move down.
      if (currentVal !== '') {
        const nums = [...col.nums];
        const values = [...col.values];
        const parsed = Number(currentVal);
        if (!Number.isNaN(parsed)) {
          nums[s.focusRow] = parsed;
          values[s.focusRow] = currentVal;
        }
        return {
          ...state,
          stat: {
            ...s,
            columns: s.columns.map((c, i) =>
              i === s.focusCol ? { values, nums } : c
            ),
            focusRow: s.focusRow + 1,
            results: null,
          },
        };
      }
      return state;
    case 'del':
      // Delete current cell.
      return {
        ...state,
        stat: {
          ...s,
          columns: s.columns.map((c, i) => {
            if (i !== s.focusCol) return c;
            const values = c.values.filter((_, idx) => idx !== s.focusRow);
            const nums = c.nums.filter((_, idx) => idx !== s.focusRow);
            return { values, nums };
          }),
          focusRow: Math.max(0, s.focusRow - 1),
          results: null,
        },
      };
    default:
      if (/^[0-9]$/.test(keyId) || keyId === 'dot' || keyId === 'neg') {
        const ch = keyId === 'dot' ? '.' : keyId === 'neg' ? '-' : keyId;
        const newText = currentVal + ch;
        // Validate it's a parseable number (allow incomplete).
        if (newText !== '' && newText !== '.' && newText !== '-' && newText !== '-.') {
          const parsed = Number(newText);
          if (Number.isNaN(parsed)) return state;
        }
        const values = [...col.values];
        const nums = [...col.nums];
        values[s.focusRow] = newText;
        nums[s.focusRow] = Number(newText);
        return {
          ...state,
          stat: {
            ...s,
            columns: s.columns.map((c, i) =>
              i === s.focusCol ? { values, nums } : c
            ),
            results: null,
          },
        };
      }
      return state;
  }
}

function computeStatResults(s: StatState): Record<string, string> {
  const results: Record<string, string> = {};
  const x = s.columns[0].nums.filter((v) => !Number.isNaN(v));
  const n = x.length;
  if (n === 0) return results;

  const sumX = x.reduce((a, b) => a + b, 0);
  const meanX = sumX / n;
  const sumX2 = x.reduce((a, v) => a + v * v, 0);
  const variancePop = sumX2 / n - meanX * meanX;
  const sdPop = Math.sqrt(Math.max(0, variancePop));
  const sdSample = n > 1 ? Math.sqrt(Math.max(0, (sumX2 - n * meanX * meanX) / (n - 1))) : 0;
  const minX = Math.min(...x);
  const maxX = Math.max(...x);

  results['n'] = String(n);
  results['x̄'] = meanX.toString();
  results['Σx'] = sumX.toString();
  results['Σx²'] = sumX2.toString();
  results['σn'] = sdPop.toString();
  results['σn-1'] = sdSample.toString();
  results['minX'] = minX.toString();
  results['maxX'] = maxX.toString();

  if (s.mode === '2-VAR') {
    const y = s.columns[1].nums.filter((v) => !Number.isNaN(v));
    const m = Math.min(n, y.length);
    if (m > 0) {
      const sumY = y.slice(0, m).reduce((a, b) => a + b, 0);
      const meanY = sumY / m;
      const sumY2 = y.slice(0, m).reduce((a, v) => a + v * v, 0);
      const sumXY = x.slice(0, m).reduce((a, v, i) => a + v * y[i], 0);
      const sdYPop = Math.sqrt(Math.max(0, sumY2 / m - meanY * meanY));
      const sdYSample = m > 1 ? Math.sqrt(Math.max(0, (sumY2 - m * meanY * meanY) / (m - 1))) : 0;
      const covariance = sumXY / m - meanX * meanY;
      const r =
        sdPop > 0 && sdYPop > 0 ? covariance / (sdPop * sdYPop) : 0;
      const b = sdPop > 0 ? (r * sdYPop) / sdPop : 0;
      const a = meanY - b * meanX;

      results['ȳ'] = meanY.toString();
      results['Σy'] = sumY.toString();
      results['Σy²'] = sumY2.toString();
      results['Σxy'] = sumXY.toString();
      results['σn-y'] = sdYPop.toString();
      results['σn-1-y'] = sdYSample.toString();
      results['r'] = r.toString();
      results['A'] = a.toString();   // regression intercept
      results['B'] = b.toString();   // regression slope
    }
  }

  return results;
}

/** ---------- Table ---------- */

function pressTable(state: CalcState, keyId: string): CalcState {
  const t = state.table;

  if (t.view === 'results') {
    if (keyId === 'up' || keyId === 'down' || keyId === 'left' || keyId === 'right') {
      return { ...state, table: { ...t, view: 'input' } };
    }
    if (keyId === 'ok' || keyId === 'equals') {
      return { ...state, table: { ...t, view: 'input' } };
    }
    return state;
  }

  // Input view: all numeric input goes to func; arrows toggle to results if table exists.

  switch (keyId) {
    case 'left':
    case 'right':
    case 'up':
    case 'down':
      // Toggle between input and results if table exists.
      if (t.rows) {
        return { ...state, table: { ...t, view: 'results' } };
      }
      return state;
    case 'ok':
    case 'equals':
      return generateTable(state);
    case 'del':
      return {
        ...state,
        table: { ...t, func: t.func.slice(0, -1), rows: null },
      };
    default:
      if (/^[0-9]$/.test(keyId) || keyId === 'dot' || keyId === 'neg') {
        const ch = keyId === 'dot' ? '.' : keyId === 'neg' ? '-' : keyId;
        return {
          ...state,
          table: { ...t, func: t.func + ch, rows: null },
        };
      }
      // Support variable x and basic operators.
      if (keyId === 'xvar') {
        return { ...state, table: { ...t, func: t.func + 'x', rows: null } };
      }
      if (['add', 'sub', 'mul', 'div', 'pow', 'lparen', 'rparen'].includes(keyId)) {
        const opMap: Record<string, string> = {
          add: '+', sub: '-', mul: '*', div: '/', pow: '^',
          lparen: '(', rparen: ')',
        };
        return {
          ...state,
          table: { ...t, func: t.func + opMap[keyId], rows: null },
        };
      }
      return state;
  }
}

function generateTable(state: CalcState): CalcState {
  const t = state.table;
  if (!t.func.trim()) return state;

  const start = t.start;
  const end = t.end;
  const step = t.step || 1;
  if (step === 0) return state;

  const rows: { x: string; y: string }[] = [];

  for (let x = start; step > 0 ? x <= end : x >= end; x += step) {
    // Substitute x with its numeric value, then parse & evaluate.
    const exprSource = t.func.replace(/x/g, `(${x})`);
    try {
      const ast = parse(autoCloseParentheses(exprSource));
      const value = evaluate(ast, {
        ans: state.ans,
        preAns: state.preAns,
        angleUnit: state.settings.angleUnit,
      });
      const y = formatValue(value, {
        decimalMark: 'dot',
        digitSeparator: false,
        fractionResult: 'improper',
        numberFormat: 'norm2',
      });
      rows.push({ x: x.toString(), y });
    } catch {
      rows.push({ x: x.toString(), y: 'ERROR' });
    }
  }

  return {
    ...state,
    table: { ...t, rows, view: 'results' },
  };
}

/** ---------- Ratio ---------- */

function pressRatio(state: CalcState, keyId: string): CalcState {
  const r = state.ratio;

  if (r.view === 'result') {
    if (keyId === 'up' || keyId === 'down' || keyId === 'left' || keyId === 'right') {
      return { ...state, ratio: { ...r, view: 'input' } };
    }
    if (keyId === 'ok' || keyId === 'equals') {
      return { ...state, ratio: { ...r, view: 'input' } };
    }
    return state;
  }

  switch (keyId) {
    case 'left':
      return { ...state, ratio: { ...r, focus: 'a' } };
    case 'right':
      return { ...state, ratio: { ...r, focus: 'b' } };
    case 'ok':
    case 'equals':
      return computeRatio(state);
    case 'del':
      return {
        ...state,
        ratio: {
          ...r,
          a: r.focus === 'a' ? r.a.slice(0, -1) : r.a,
          b: r.focus === 'b' ? r.b.slice(0, -1) : r.b,
          result: null,
        },
      };
    default:
      if (/^[0-9]$/.test(keyId)) {
        return {
          ...state,
          ratio: {
            ...r,
            [r.focus]: r[r.focus] + keyId,
            result: null,
          },
        };
      }
      return state;
  }
}

function computeRatio(state: CalcState): CalcState {
  const r = state.ratio;
  const a = Number(r.a);
  const b = Number(r.b);
  if (Number.isNaN(a) || Number.isNaN(b) || b === 0) return state;

  const g = gcdBigInt(BigInt(Math.round(Math.abs(a))), BigInt(Math.round(Math.abs(b))));
  const simplifiedA = a / Number(g);
  const simplifiedB = b / Number(g);
  const decimal = (a / b).toString();

  return {
    ...state,
    ratio: {
      ...r,
      result: `${simplifiedA}:${simplifiedB}  (= ${decimal})`,
      view: 'result',
    },
  };
}

function gcdBigInt(a: bigint, b: bigint): bigint {
  while (b !== 0n) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

/** ---------- Math Box ---------- */

const MATHBOX_TOOLS = [
  { id: 'randint', label: 'RANDOM INT' },
  { id: 'dice', label: 'DICE (1-6)' },
  { id: 'coin', label: 'COIN TOSS' },
  { id: 'fact', label: 'FACTORIAL' },
];

function pressMathBox(state: CalcState, keyId: string): CalcState {
  const m = state.mathbox;

  if (!m.tool) {
    // Tool selection view.
    switch (keyId) {
      case 'left':
        return {
          ...state,
          mathbox: { ...m, tool: MATHBOX_TOOLS[(MATHBOX_TOOLS.length + (m.tool ? MATHBOX_TOOLS.findIndex((t) => t.id === m.tool) : 0) - 1) % MATHBOX_TOOLS.length]?.id ?? null },
        };
      case 'right':
        return {
          ...state,
          mathbox: { ...m, tool: MATHBOX_TOOLS[( (m.tool ? MATHBOX_TOOLS.findIndex((t) => t.id === m.tool) : -1) + 1) % MATHBOX_TOOLS.length]?.id ?? null },
        };
      case 'ok':
      case 'equals':
        if (m.tool) return { ...state, mathbox: { ...m, input: '', result: null } };
        return state;
      default:
        return state;
    }
  }

  // Tool active: input view.
  switch (keyId) {
    case 'left':
    case 'right':
    case 'up':
    case 'down':
      return { ...state, mathbox: { ...m, tool: null } }; // back to selection
    case 'ok':
    case 'equals':
      return runMathBoxTool(state);
    case 'del':
      return { ...state, mathbox: { ...m, input: m.input.slice(0, -1), result: null } };
    default:
      if (/^[0-9]$/.test(keyId) || keyId === 'dot' || keyId === 'neg') {
        const ch = keyId === 'dot' ? '.' : keyId === 'neg' ? '-' : keyId;
        return { ...state, mathbox: { ...m, input: m.input + ch, result: null } };
      }
      return state;
  }
}

function runMathBoxTool(state: CalcState): CalcState {
  const m = state.mathbox;
  if (!m.tool) return state;

  switch (m.tool) {
    case 'randint': {
      const n = Number(m.input);
      if (Number.isNaN(n) || n < 1) return state;
      const value = Math.floor(Math.random() * n) + 1;
      return { ...state, mathbox: { ...m, result: String(value) } };
    }
    case 'dice': {
      const value = Math.floor(Math.random() * 6) + 1;
      return { ...state, mathbox: { ...m, result: String(value) } };
    }
    case 'coin': {
      const value = Math.random() < 0.5 ? 'Heads' : 'Tails';
      return { ...state, mathbox: { ...m, result: value } };
    }
    case 'fact': {
      const n = Math.round(Number(m.input));
      if (Number.isNaN(n) || n < 0 || n > 69) return state;
      let result = 1n;
      for (let i = 2n; i <= BigInt(n); i += 1n) result *= i;
      return { ...state, mathbox: { ...m, result: result.toString() } };
    }
    default:
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
