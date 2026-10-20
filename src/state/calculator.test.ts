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
    expect(run(['2', 'exp10', '3', 'equals']).result).toBe('2000');
    expect(run(['2', 'pow', '1', '0', 'equals']).result).toBe('1024');
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

  it('cycles angle units', () => {
    let state = press(createState(), 'settings');
    expect(state.angleUnit).toBe('RAD');
    state = pressKeys(state, ['sin', 'pi', 'div', '6', 'equals']);
    expect(state.result).toBe('1/2');
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
    expect(state.screen).toBe('home');
    expect(state.notice).toContain('STATISTICS');

    state = press(state, 'left');
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
