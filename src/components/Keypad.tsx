import type { CSSProperties } from 'react';
import type { KeySpec } from '../calculators/types';

interface KeypadProps {
  keys: KeySpec[];
  shift: boolean;
  onKey: (key: KeySpec) => void;
}

const DPAD: KeySpec[] = [
  { id: 'up', label: 'Up', row: 0, col: 0 },
  { id: 'left', label: 'Left', row: 0, col: 0 },
  { id: 'ok', label: 'OK', row: 0, col: 0 },
  { id: 'right', label: 'Right', row: 0, col: 0 },
  { id: 'down', label: 'Down', row: 0, col: 0 },
];

function placement(key: KeySpec): CSSProperties {
  return {
    gridRow: `${key.row + 1} / span ${key.rowSpan ?? 1}`,
    gridColumn: `${key.col + 1} / span ${key.span ?? 1}`,
  };
}

function KeyButton({
  keySpec,
  shift,
  onKey,
}: {
  keySpec: KeySpec;
  shift: boolean;
  onKey: (key: KeySpec) => void;
}) {
  const tone = keySpec.tone ?? 'function';
  const label = keySpec.shiftLabel ? `${keySpec.label}, shift: ${keySpec.shiftLabel}` : keySpec.label;

  return (
    <button
      type="button"
      className={`key key-${tone}${keySpec.shiftLabel ? ' has-shift' : ''}${
        keySpec.id === 'shift' && shift ? ' is-latched' : ''
      }`}
      style={placement(keySpec)}
      onClick={() => onKey(keySpec)}
      aria-label={label}
      aria-pressed={keySpec.id === 'shift' ? shift : undefined}
    >
      {keySpec.shiftLabel ? <span className="key-shift-label">{keySpec.shiftLabel}</span> : null}
      <span className="key-label">{keySpec.label}</span>
    </button>
  );
}

function Dpad({ onKey }: { onKey: (key: KeySpec) => void }) {
  const get = (id: string) => DPAD.find((key) => key.id === id) as KeySpec;
  return (
    <div className="dpad" style={{ gridRow: '1 / span 2', gridColumn: '2 / span 3' }}>
      <button type="button" className="dpad-key dpad-up" onClick={() => onKey(get('up'))} aria-label="Up">
        ▲
      </button>
      <button type="button" className="dpad-key dpad-left" onClick={() => onKey(get('left'))} aria-label="Left">
        ◀
      </button>
      <button type="button" className="dpad-key dpad-ok" onClick={() => onKey(get('ok'))} aria-label="OK">
        OK
      </button>
      <button type="button" className="dpad-key dpad-right" onClick={() => onKey(get('right'))} aria-label="Right">
        ▶
      </button>
      <button type="button" className="dpad-key dpad-down" onClick={() => onKey(get('down'))} aria-label="Down">
        ▼
      </button>
    </div>
  );
}

export function Keypad({ keys, shift, onKey }: KeypadProps) {
  return (
    <div className="keypad">
      {keys.map((keySpec) =>
        keySpec.kind === 'dpad' ? (
          <Dpad key={keySpec.id} onKey={onKey} />
        ) : (
          <KeyButton key={keySpec.id} keySpec={keySpec} shift={shift} onKey={onKey} />
        ),
      )}
    </div>
  );
}
