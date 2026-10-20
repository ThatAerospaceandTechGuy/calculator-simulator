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

type ShellStyle = CSSProperties & Record<'--body-top' | '--body-bottom' | '--accent', string>;

export function Shell({ spec, state, onKey }: ShellProps) {
  const style: ShellStyle = {
    '--body-top': spec.shell.bodyTop,
    '--body-bottom': spec.shell.bodyBottom,
    '--accent': spec.shell.accent,
  };

  return (
    <div className="calculator" style={style}>
      <div className="calculator-head">
        <span className="calculator-brand">{spec.brand}</span>
        <span className="calculator-model">{spec.model}</span>
      </div>

      <div className="calculator-display">
        <Display state={state} />
      </div>

      <Keypad keys={spec.keys} shift={state.shift} onKey={onKey} />

      <div className="calculator-foot">
        {spec.shell.solar ? <span className="solar-panel" aria-hidden="true" /> : <span />}
        <span className="calculator-family">{spec.shell.label}</span>
      </div>
    </div>
  );
}
