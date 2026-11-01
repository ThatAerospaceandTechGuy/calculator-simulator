import type { CSSProperties } from 'react';
import type { CalculatorSpec, KeySpec } from '../calculators/types';
import type { CalcState } from '../state/calculator';
import { Display } from './Display';
import { Keypad } from './Keypad';

interface ShellProps {
  spec: CalculatorSpec;
  state: CalcState;
  onKey: (key: KeySpec) => void;
}

type ShellStyle = CSSProperties &
  Record<'--body-top' | '--body-bottom' | '--accent', string>;

export function Shell({ spec, state, onKey }: ShellProps) {
  const style: ShellStyle = {
    '--body-top': spec.shell.bodyTop,
    '--body-bottom': spec.shell.bodyBottom,
    '--accent': spec.shell.accent,
  };

  return (
    <div
      className="calculator"
      style={style}
      data-model={spec.id}
      data-solar={spec.shell.solar ? 'true' : 'false'}
      role="group"
      aria-label={`${spec.label} simulator`}
    >
      <div className="calc-topline">
        <div className="calc-identity">
          <span className="casio-wordmark">CASIO</span>
          <span className="calc-model">{spec.model}</span>
          <span className="calc-edition">{spec.shell.edition}</span>
        </div>

        {spec.shell.solar ? (
          <span className="solar-panel" aria-label="Solar panel">
            {Array.from({ length: 6 }, (_, index) => (
              <span key={index} className="solar-cell" />
            ))}
          </span>
        ) : (
          <span className="calc-top-spacer" aria-hidden="true" />
        )}
      </div>

      <div className="display-bezel">
        <Display state={state} solar={spec.shell.solar} />
      </div>

      <div className="display-footer"><span className="classwiz-wordmark">{spec.shell.label}</span></div>

      <Keypad keys={spec.keys} shift={state.shift} onKey={onKey} />
    </div>
  );
}
