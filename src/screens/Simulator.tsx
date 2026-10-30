import { useEffect, useState } from 'react';
import type { CalculatorSpec, KeySpec } from '../calculators/types';
import { createState, cycleAngleState, press, pressKey } from '../state/calculator';
import { Shell } from '../components/Shell';

const KEYBOARD_MAP: Record<string, string> = {
  '0': '0',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '.': 'dot',
  '+': 'add',
  '-': 'sub',
  '*': 'mul',
  '/': 'div',
  '^': 'pow',
  '(': 'lparen',
  ')': 'rparen',
  '%': 'percent',
  Enter: 'equals',
  '=': 'equals',
  Backspace: 'del',
  Delete: 'ac',
  Escape: 'ac',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  PageUp: 'pageup',
  PageDown: 'pagedown',
  h: 'home',
  s: 'sin',
  c: 'cos',
  t: 'tan',
  l: 'log',
  n: 'ln',
  r: 'sqrt',
  f: 'frac',
  p: 'pi',
  a: 'ans',
  e: 'exp10',
  // Shifted symbols produced by a physical keyboard.
  '!': '1',
  '@': '2',
  '#': '3',
  $: '4',
  '&': '7',
  _: 'sub',
  '{': 'lparen',
  '}': 'rparen',
};

export function Simulator({ spec, onBack }: { spec: CalculatorSpec; onBack: () => void }) {
  const [state, setState] = useState(createState);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === 'Shift') {
        event.preventDefault();
        if (!event.repeat) setState((previous) => press(previous, 'shift'));
        return;
      }

      const id = KEYBOARD_MAP[event.key] ?? KEYBOARD_MAP[event.key.toLowerCase()];
      if (!id) return;

      event.preventDefault();
      const keySpec = spec.keys.find((key) => key.id === id);
      setState((previous) =>
        keySpec ? pressKey(previous, keySpec) : press({ ...previous, shift: false }, id),
      );
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [spec]);

  const handleKey = (key: KeySpec) => setState((previous) => pressKey(previous, key));

  return (
    <main className="simulator">
      <header className="sim-head">
        <button type="button" className="ghost-button" onClick={onBack}>
          ← Calculators
        </button>
        <div className="sim-title">
          <span className="sim-brand">{spec.brand} ClassWiz</span>
          <strong>{spec.model}</strong>
        </div>
        <div className="sim-actions">
          <button
            type="button"
            className="chip-button"
            onClick={() => setState((previous) => cycleAngleState(previous))}
            aria-label={`Angle unit: ${state.settings.angleUnit}. Click to cycle.`}
          >
            {state.settings.angleUnit}
          </button>
          <span className="unofficial-pill">Unofficial</span>
        </div>
      </header>

      <div className="sim-layout">
        <div className="sim-stage">
          <Shell spec={spec} state={state} onKey={handleKey} onBack={onBack} />
          <p className="sim-hint">
            {state.screen === 'off' ? (
              <span className="hint-active">The calculator is off. Press ON to wake it.</span>
            ) : state.screen === 'home' ? (
              <>
                HOME screen. Use the arrows and <kbd>OK</kbd>, or just start typing a calculation.
              </>
            ) : state.screen === 'menu' ? (
              <>
                MENU. Use <kbd>↑</kbd>/<kbd>↓</kbd> and <kbd>OK</kbd>; <kbd>AC</kbd> or <kbd>←</kbd>{' '}
                goes back.
              </>
            ) : state.shift ? (
              <span className="hint-active">
                SHIFT is latched — the next key uses its blue function.
              </span>
            ) : (
              <>
                Tip: press <kbd>Shift</kbd> then <kbd>s</kbd> for sin⁻¹. Arrow keys edit the expression.
              </>
            )}
          </p>
        </div>

        <aside className="sim-side">
          <section className="side-card">
            <h2>History</h2>
            {state.history.length === 0 ? (
              <p className="muted">Results appear here after you press EXE.</p>
            ) : (
              <ol className="history-list">
                {[...state.history].reverse().map((entry, index) => (
                  <li key={`${entry.input}-${index}`}>
                    <span className="history-input">{entry.input}</span>
                    <span className="history-result">= {entry.result}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="side-card">
            <h2>Keyboard</h2>
            <dl className="keymap">
              <div><dt>0–9 . + −</dt><dd>number keys</dd></div>
              <div><dt>Enter</dt><dd>EXE</dd></div>
              <div><dt>Backspace</dt><dd>DEL</dd></div>
              <div><dt>Esc</dt><dd>AC</dd></div>
              <div><dt>h</dt><dd>HOME</dd></div>
              <div><dt>s c t</dt><dd>sin, cos, tan</dd></div>
              <div><dt>l n</dt><dd>log, ln</dd></div>
              <div><dt>r f p</dt><dd>√, fraction, π</dd></div>
              <div><dt>Shift</dt><dd>toggle SHIFT</dd></div>
            </dl>
          </section>

          <section className="side-card">
            <h2>Model notes</h2>
            <p className="muted">
              This {spec.model} spec uses the shared CW+ core.{' '}
              {spec.shell.solar
                ? 'The 85 adds a solar panel; functions are identical to the 83.'
                : 'Battery-only sibling of the fx-85GT CW+.'}
            </p>
            <p className="muted">
              The HOME menu, Calculate app and SETTINGS/FORMAT menus are modelled. Statistics,
              Table, Ratio and Math Box are visible but stubbed. Fractions, surds and
              standard-angle trig are exact.
            </p>
            <button
              type="button"
              className="ghost-button"
              onClick={() => setState(createState())}
            >
              Reset calculator
            </button>
          </section>
        </aside>
      </div>
    </main>
  );
}
