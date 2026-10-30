import { describe, expect, it } from 'vitest';
import { createState, press, pressKey, pressKeys } from './calculator';

function run(keys: string[]) {
  return pressKeys(createState(), keys);
}

describe('calculator state machine', () => {
  it('evaluates basic arithmetic', () => {
    expect(run(['2', 'add', '2', 'equals']).result).toBe('4');
    expect(run(['9', 'mul', '8', 'equals']).result).toBe('72');
  });

  it('keeps fractions exact', () => {
    expect(run(['1', 'div', '3', 'equals']).result).toBe('1/3');
    expect(run(['frac', '1', 'down', '3', 'equals']).result).toBe('1/3');
  });

  it('keeps surds exact', () => {
    expect(run(['sqrt', '2', 'equals']).result).toBe('√2');
    expect(run(['sqrt', '8', 'equals']).result).toBe('2√2');
  });

  it('respects decimal input', () => {
    expect(run(['0', 'dot', '1', 'add', '0', 'dot', '2', 'equals']).result).toBe('0.3');
    expect(run(['dot', '5', 'equals']).result).toBe('0.5');
  });

  it('continues from Ans after a result', () => {
    const first = run(['1', 'div', '3', 'equals']);
    const second = pressKeys(first, ['add', '1', 'equals']);
    expect(second.result).toBe('4/3');
    expect(second.preAns).toBe(first.ans);
  });

  it('starts a new expression when a digit is pressed after =', () => {
    const first = run(['2', 'add', '2', 'equals']);
    const second = pressKeys(first, ['7', 'equals']);
    expect(second.result).toBe('7');
  });

  it('handles powers and engineering input', () => {
    expect(run(['3', 'x2', 'equals']).result).toBe('9');
    expect(run(['5', 'x3', 'equals']).result).toBe('125');
    expect(run(['2', 'exp10', '3', 'equals']).result).toBe('2,000');
    expect(run(['2', 'pow', '1', '0', 'equals']).result).toBe('1,024');
  });

  it('lifts the SHIFT latch and applies the shifted key once', () => {
    let state = createState();
    state = press(state, 'shift');
    expect(state.shift).toBe(true);

    state = pressKey(state, { id: 'sin', shiftId: 'asin' });
    expect(state.shift).toBe(false);

    state = pressKeys(state, ['1', 'equals']);
    expect(state.result).toBe('90');
  });

  it('applies shifted roots', () => {
    let state = press(createState(), 'shift');
    state = pressKey(state, { id: 'sqrt', shiftId: 'cbrt' });
    state = pressKeys(state, ['2', '7', 'equals']);
    expect(state.result).toBe('3');
  });

  it('opens SETTINGS and changes the angle unit through the menu', () => {
    let state = press(createState(), '2');
    state = press(state, 'settings');
    expect(state.screen).toBe('menu');
    expect(state.menuPage).toBe('settingsRoot');

    state = press(state, 'ok'); // Calc Settings
    expect(state.menuPage).toBe('calcSettings');

    state = press(state, 'down'); // Angle Unit
    state = press(state, 'ok');
    expect(state.menuPage).toBe('angleUnit');

    state = press(state, 'down'); // Radian
    state = press(state, 'ok');
    expect(state.settings.angleUnit).toBe('RAD');

    state = press(state, 'ac'); // back to Calculate
    state = press(state, 'ac'); // clear the pending 2
    state = pressKeys(state, ['sin', 'pi', 'div', '6', 'equals']);
    expect(state.result).toBe('1/2');
  });

  it('opens Get Started from HOME without changing the angle', () => {
    let state = press(createState(), 'settings');
    expect(state.screen).toBe('menu');
    expect(state.menuPage).toBe('getStarted');
    expect(state.settings.angleUnit).toBe('DEG');

    state = press(state, 'ac');
    expect(state.screen).toBe('home');
  });

  it('navigates back through menu pages', () => {
    let state = press(createState(), '2');
    state = press(state, 'settings');
    state = press(state, 'ok'); // Calc Settings
    state = press(state, 'down'); // Angle Unit
    state = press(state, 'ok'); // Angle Unit options

    state = press(state, 'left'); // back to Calc Settings
    expect(state.menuPage).toBe('calcSettings');
    expect(state.menuIndex).toBe(1);

    state = press(state, 'left'); // back to root
    expect(state.menuPage).toBe('settingsRoot');

    state = press(state, 'ac');
    expect(state.screen).toBe('calc');
  });

  it('applies mixed-number output through Fraction Result', () => {
    let state = press(createState(), '2');
    state = press(state, 'settings');
    state = press(state, 'ok'); // Calc Settings
    state = pressKeys(state, ['down', 'down', 'down']); // Fraction Result
    state = press(state, 'ok');
    state = press(state, 'down'); // Mixed Number
    state = press(state, 'ok');
    expect(state.settings.fractionResult).toBe('Mixed Number');

    state = press(state, 'ac'); // close the menu
    state = press(state, 'ac'); // clear the pending 2
    state = pressKeys(state, ['3', 'div', '2', 'equals']);
    expect(state.result).toBe('1 1/2');
  });

  it('applies a comma decimal mark to decimal results', () => {
    let state = press(createState(), '2');
    state = press(state, 'settings');
    state = press(state, 'ok'); // Calc Settings
    state = pressKeys(state, ['down', 'down', 'down', 'down']); // Decimal Mark
    state = press(state, 'ok');
    state = press(state, 'down'); // Comma
    state = press(state, 'ok');
    expect(state.settings.decimalMark).toBe('Comma');

    state = press(state, 'ac');
    state = press(state, 'ac');
    state = pressKeys(state, ['1', 'div', '3', 'equals']);
    state = press(state, 'format');
    expect(state.result).toBe('0,3333333333');
  });

  it('opens the FORMAT menu with SHIFT+FORMAT and converts to mixed', () => {
    let state = run(['3', 'div', '2', 'equals']);
    state = press(state, 'formatMenu');
    expect(state.screen).toBe('menu');
    expect(state.menuPage).toBe('formatMenu');

    state = pressKeys(state, ['down', 'down', 'down']); // Mixed Number
    state = press(state, 'ok');
    expect(state.screen).toBe('calc');
    expect(state.result).toBe('1 1/2');
  });

  it('can switch the FORMAT key to menu mode', () => {
    let state = press(createState(), '2');
    state = press(state, 'settings');
    state = press(state, 'ok'); // Calc Settings
    state = pressKeys(state, ['down', 'down', 'down', 'down', 'down', 'down', 'down']); // FORMAT Key
    state = press(state, 'ok');
    state = press(state, 'down'); // Format Menu
    state = press(state, 'ok');
    expect(state.settings.formatKey).toBe('Format Menu');

    state = press(state, 'ac');
    state = press(state, 'ac');
    state = pressKeys(state, ['3', 'div', '2', 'equals']);
    state = press(state, 'format');
    expect(state.screen).toBe('menu');
    expect(state.menuPage).toBe('formatMenu');
  });

  it('toggles mixed and improper forms with the shifted fraction key', () => {
    let state = run(['3', 'div', '2', 'equals']);
    expect(state.result).toBe('3/2');
    state = press(state, 'mixed');
    expect(state.result).toBe('1 1/2');
    state = press(state, 'mixed');
    expect(state.result).toBe('3/2');
  });

  it('resets settings from the Reset menu', () => {
    let state = press(createState(), '2');
    state = press(state, 'settings');
    state = press(state, 'ok'); // Calc Settings
    state = pressKeys(state, ['down', 'down', 'down']); // Fraction Result
    state = press(state, 'ok');
    state = press(state, 'down'); // Mixed Number
    state = press(state, 'ok');
    expect(state.settings.fractionResult).toBe('Mixed Number');

    state = press(state, 'ac'); // close the menu
    state = press(state, 'settings'); // reopen at the root
    state = press(state, 'down'); // System Settings
    state = press(state, 'down'); // Reset
    state = press(state, 'ok'); // Reset page
    state = press(state, 'ok'); // Reset Settings
    expect(state.settings.fractionResult).toBe('Improp Fraction');
    expect(state.notice).toBe('SETTINGS RESET');
  });

  it('clears input and result with AC', () => {
    const state = pressKeys(run(['2', 'add', '2', 'equals']), ['ac']);
    expect(state.input).toEqual([]);
    expect(state.result).toBeNull();
    expect(state.error).toBeNull();
  });

  it('reports errors on the display', () => {
    const state = run(['1', 'div', '0', 'equals']);
    expect(state.error).toBe('Math ERROR');
    expect(state.result).toBeNull();
  });

  it('does not evaluate an empty expression', () => {
    const state = run(['equals']);
    expect(state.result).toBeNull();
    expect(state.error).toBeNull();
  });

  it('starts on the HOME grid and launches the selected app', () => {
    let state = createState();
    expect(state.screen).toBe('home');
    expect(state.homeIndex).toBe(0);

    state = press(state, 'right');
    expect(state.homeIndex).toBe(1);
    state = press(state, 'ok');
    expect(state.screen).toBe('stat');

    state = press(state, 'back');
    expect(state.screen).toBe('home');
    state = press(state, 'left');
    expect(state.homeIndex).toBe(0);
    state = press(state, 'ok');
    expect(state.screen).toBe('calc');
  });

  it('starts Calculate when a digit is pressed from HOME', () => {
    const state = run(['2', 'add', '2', 'equals']);
    expect(state.screen).toBe('calc');
    expect(state.result).toBe('4');
  });

  it('toggles a result between fraction and decimal with FORMAT', () => {
    let state = run(['1', 'div', '3', 'equals']);
    expect(state.result).toBe('1/3');
    state = press(state, 'format');
    expect(state.result).toBe('0.3333333333');
    state = press(state, 'format');
    expect(state.result).toBe('1/3');
  });

  it('inserts pi with SHIFT and 7', () => {
    let state = press(createState(), 'shift');
    state = pressKey(state, { id: '7', shiftId: 'pi' });
    state = press(state, 'equals');
    expect(state.result).toBe('π');
  });

  it('powers off with SHIFT + AC and wakes with ON', () => {
    let state = press(createState(), 'shift');
    state = pressKey(state, { id: 'ac', shiftId: 'off' });
    expect(state.screen).toBe('off');
    state = press(state, '2');
    expect(state.screen).toBe('off');
    state = press(state, 'on');
    expect(state.screen).toBe('home');
  });
});
