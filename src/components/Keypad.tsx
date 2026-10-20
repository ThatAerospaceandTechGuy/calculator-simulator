import type { CSSProperties } from 'react';
import type { KeySpec } from '../calculators/types';
import { KeyIcon } from './KeyIcon';

interface KeypadProps {
  keys: KeySpec[];
  shift: boolean;
  onKey: (key: KeySpec) => void;
}

function placement(key: KeySpec): CSSProperties {
  return {
    gridRow: `${key.row + 1} / span ${key.rowSpan ?? 1}`,
    gridColumn: `${key.col + 1} / span ${key.span ?? 1}`,
  };
}

function accessibleName(keySpec: KeySpec): string {
  if (keySpec.ariaLabel) return keySpec.ariaLabel;
  const above = keySpec.caption ?? keySpec.shiftLabel;
  return [above, keySpec.label].filter(Boolean).join(' ') || keySpec.id;
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
  const above = keySpec.caption ?? keySpec.shiftLabel;
  const aboveTone = keySpec.caption ? (keySpec.captionTone ?? 'light') : 'blue';
  const iconOnly = Boolean(keySpec.icon) && !keySpec.label;
  const latched = keySpec.id === 'shift' && shift;
  const roundTop = ['variable', 'function', 'catalog', 'tools'].includes(keySpec.id);

  return (
    <div
      className={`key-slot key-slot-${tone}${above ? ' has-above' : ''}${
        iconOnly ? ' is-icon-only' : ''
      }`}
      style={placement(keySpec)}
    >
      {above ? <span className={`key-above key-above-${aboveTone}`}>{above}</span> : null}
      <button
        type="button"
        className={`key key-${tone} key-${keySpec.id}${keySpec.small ? ' key-small' : ''}${
          roundTop ? ' key-top-round' : ''
        }${latched ? ' is-latched' : ''}`}
        onClick={() => onKey(keySpec)}
        aria-label={accessibleName(keySpec)}
        aria-pressed={keySpec.id === 'shift' ? shift : undefined}
      >
        {keySpec.icon ? <KeyIcon name={keySpec.icon} /> : null}
        {keySpec.label ? <span className="key-label">{keySpec.label}</span> : null}
      </button>
    </div>
  );
}

function Rocker({ keySpec, onKey }: { keySpec: KeySpec; onKey: (key: KeySpec) => void }) {
  return (
    <div className="key-slot key-slot-rocker" style={placement(keySpec)}>
      <div className="key-rocker" role="group" aria-label="Page scroll">
        <button
          type="button"
          className="rocker-key rocker-up"
          onClick={() => onKey({ ...keySpec, id: 'pageup', kind: 'key', label: '', icon: 'chevrons-up' })}
          aria-label="Page up"
        >
          <KeyIcon name="chevrons-up" />
        </button>
        <span className="rocker-divider" aria-hidden="true" />
        <button
          type="button"
          className="rocker-key rocker-down"
          onClick={() =>
            onKey({ ...keySpec, id: 'pagedown', kind: 'key', label: '', icon: 'chevrons-down' })
          }
          aria-label="Page down"
        >
          <KeyIcon name="chevrons-down" />
        </button>
      </div>
    </div>
  );
}

export function Keypad({ keys, shift, onKey }: KeypadProps) {
  return (
    <div className="keypad">
      {keys.map((keySpec) =>
        keySpec.kind === 'rocker' ? (
          <Rocker key={keySpec.id} keySpec={keySpec} onKey={onKey} />
        ) : (
          <KeyButton key={keySpec.id} keySpec={keySpec} shift={shift} onKey={onKey} />
        ),
      )}
    </div>
  );
}
