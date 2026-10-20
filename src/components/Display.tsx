import type { CSSProperties } from 'react';
import { Fragment } from 'react';
import type { CalcState } from '../state/calculator';
import { serialize, type Cursor, type ListPath, type Node } from '../input/nodes';
import { DotMatrix } from './DotMatrix';

const PRETTY: Record<string, string> = {
  '*': '×',
  '/': '÷',
  '-': '−',
  '^': '^',
};

const APPS = [
  { id: 'calculate', label: 'Calculate' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'table', label: 'Table' },
  { id: 'ratio', label: 'Ratio' },
  { id: 'mathbox', label: 'Math Box' },
] as const;

function pretty(text: string): string {
  return PRETTY[text] ?? text;
}

function Run({ text, scale = 1 }: { text: string; scale?: number }) {
  const columns = Math.max(1, [...text].length) * 6 * scale;
  return (
    <span
      className="lcd-run"
      style={{ width: `calc(${columns} * var(--u))` } as CSSProperties}
    >
      <DotMatrix text={text} scale={scale} />
    </span>
  );
}

function Cursor() {
  return <span className="lcd-cursor" aria-hidden="true" />;
}

function pathsEqual(a: ListPath, b: ListPath): boolean {
  if (a.length !== b.length) return false;
  return a.every((step, i) => step.at === b[i].at && step.slot === b[i].slot);
}

function NodeList({
  nodes,
  path,
  cursor,
}: {
  nodes: Node[];
  path: ListPath;
  cursor: Cursor;
}) {
  const active = pathsEqual(path, cursor.path);
  return (
    <>
      {nodes.map((node, index) => (
        <Fragment key={index}>
          {active && cursor.index === index ? <Cursor /> : null}
          <NodeView node={node} path={path} index={index} cursor={cursor} />
        </Fragment>
      ))}
      {active && cursor.index === nodes.length ? <Cursor /> : null}
    </>
  );
}

function NodeView({
  node,
  path,
  index,
  cursor,
}: {
  node: Node;
  path: ListPath;
  index: number;
  cursor: Cursor;
}) {
  if (node.kind === 'number' || node.kind === 'atom' || node.kind === 'op') {
    return <Run text={pretty(node.text)} />;
  }

  if (node.kind === 'frac') {
    const numeratorPath: ListPath = [...path, { at: index, slot: 'num' }];
    const denominatorPath: ListPath = [...path, { at: index, slot: 'den' }];
    return (
      <span className="lcd-fraction">
        <span className="lcd-fraction-part">
          <NodeList nodes={node.num} path={numeratorPath} cursor={cursor} />
        </span>
        <span className="lcd-fraction-bar" />
        <span className="lcd-fraction-part">
          <NodeList nodes={node.den} path={denominatorPath} cursor={cursor} />
        </span>
      </span>
    );
  }

  const radicandPath: ListPath = [...path, { at: index, slot: 'radicand' }];
  return (
    <span className="lcd-radical">
      <Run text="√" />
      <span className="lcd-radicand">
        <NodeList nodes={node.radicand} path={radicandPath} cursor={cursor} />
      </span>
    </span>
  );
}

function AppIcon({ name }: { name: (typeof APPS)[number]['id'] }) {
  const shared = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.15,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'calculate':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <rect {...shared} x="3.2" y="2.2" width="9.6" height="11.6" rx="1.4" />
          <path {...shared} d="M5.4 4.6h5.2" />
          <path {...shared} d="M5.4 7.5h.1M8 7.5h.1M10.6 7.5h.1M5.4 9.8h.1M8 9.8h.1M10.6 9.8h.1M5.4 12.1h.1M8 12.1h.1M10.6 12.1h.1" strokeWidth={1.8} />
        </svg>
      );
    case 'statistics':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path {...shared} d="M3 13V8.2M8 13V3.8M13 13V6.2" strokeWidth={2} />
          <path {...shared} d="M2 13.5h12" strokeWidth={1} />
        </svg>
      );
    case 'table':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <rect {...shared} x="3" y="3" width="10" height="10" rx="0.5" />
          <path {...shared} d="M3 6.3h10M3 9.6h10M6.3 3v10M9.6 3v10" />
        </svg>
      );
    case 'ratio':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <circle {...shared} cx="4" cy="8" r="2.1" />
          <circle {...shared} cx="12" cy="8" r="2.1" />
          <circle cx="8" cy="6" r="0.7" fill="currentColor" />
          <circle cx="8" cy="10" r="0.7" fill="currentColor" />
        </svg>
      );
    case 'mathbox':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path {...shared} d="M8 2 14 5.5v6L8 15l-6-3.5v-6Z" />
          <path {...shared} d="m2 5.5 6 3.5 6-3.5M8 9v6" />
        </svg>
      );
  }
}

function MathFormatIcon() {
  return (
    <svg className="lcd-glyph" viewBox="0 0 14 10" aria-hidden="true" focusable="false">
      <path
        d="M1 5h2l1.5 4L7.2 1l1.4 8H13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShiftIcon() {
  return (
    <svg className="lcd-glyph" viewBox="0 0 9 9" aria-label="Shift enabled" role="img">
      <rect x="0.8" y="0.8" width="7.4" height="7.4" rx="0.8" fill="none" stroke="currentColor" strokeWidth="0.9" />
      <path d="M4.5 7V3M2.7 4.8 4.5 3l1.8 1.8" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg className="lcd-glyph lcd-history" viewBox="0 0 8 10" aria-hidden="true" focusable="false">
      <path d="M4 1.2 7 5H1Z" fill="currentColor" />
      <path d="M4 8.8 1 5h6Z" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

function SolarIcon() {
  return (
    <svg className="lcd-glyph lcd-sun" viewBox="0 0 10 10" aria-hidden="true" focusable="false">
      <circle cx="5" cy="5" r="1.8" fill="none" stroke="currentColor" strokeWidth="0.8" />
      <path d="M5 .8v1.2M5 8v1.2M.8 5h1.2M8 5h1.2M2 2l.9.9M7.1 7.1l.9.9M8 2l-.9.9M2.9 7.1 2 8" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" />
    </svg>
  );
}

function HomeScreen({ state }: { state: CalcState }) {
  return (
    <div className="lcd-screen lcd-home">
      <div className="lcd-home-grid">
        {APPS.map((app, index) => (
          <div
            key={app.id}
            className={`lcd-app${state.homeIndex === index ? ' is-selected' : ''}`}
            aria-current={state.homeIndex === index ? 'true' : undefined}
          >
            <span className="lcd-app-icon">
              <AppIcon name={app.id} />
            </span>
            <span className="lcd-app-label">
              <Run text={app.label} />
            </span>
          </div>
        ))}
      </div>
      {state.notice ? (
        <div className="lcd-home-notice">
          <Run text={state.notice.toUpperCase()} />
        </div>
      ) : null}
    </div>
  );
}

function CalcScreen({ state, solar }: { state: CalcState; solar: boolean }) {
  const output = state.error ?? state.result;
  const resultScale = output && output.length > 16 ? 1 : 2;
  const hasInput = state.input.length > 0;
  const angle = state.angleUnit[0];

  return (
    <div className="lcd-screen lcd-calc">
      <div className="lcd-indicators">
        <span className="lcd-indicator-slot">{state.shift ? <ShiftIcon /> : null}</span>
        <span className="lcd-math-format" aria-label="Math input/output">
          <MathFormatIcon />
        </span>
        <span className="lcd-indicator-spacer" />
        {state.history.length > 0 ? <HistoryIcon /> : null}
        {solar ? <SolarIcon /> : null}
        <Run text={angle} />
      </div>

      <div className="lcd-expression">
        <NodeList nodes={state.input} path={[]} cursor={state.cursor} />
      </div>

      <div className={`lcd-result${state.notice ? ' lcd-result-notice' : ''}`}>
        {state.notice ? (
          <Run text={state.notice.toUpperCase()} />
        ) : output ? (
          <Run text={output} scale={resultScale} />
        ) : !hasInput ? (
          <Run text="0" scale={2} />
        ) : null}
      </div>
    </div>
  );
}

export function Display({ state, solar = false }: { state: CalcState; solar?: boolean }) {
  if (state.screen === 'off') {
    return <div className="lcd lcd-off" role="img" aria-label="Calculator is off" />;
  }

  if (state.screen === 'home') {
    const selected = APPS[state.homeIndex] ?? APPS[0];
    return (
      <div
        className="lcd"
        role="img"
        aria-label={`Calculator HOME screen. Selected app: ${selected.label}.${
          state.notice ? ` ${state.notice}.` : ''
        }`}
      >
        <HomeScreen state={state} />
        <span className="sr-only" aria-live="polite">
          {state.notice ?? `HOME screen. Selected app: ${selected.label}.`}
        </span>
      </div>
    );
  }

  const output = state.error ?? state.result;
  const resultAnnouncement = output ?? (state.input.length > 0 ? 'pending' : '0');
  const announcement = state.notice
    ? `Notice: ${state.notice}.`
    : `Result: ${resultAnnouncement}.`;
  return (
    <div
      className="lcd"
      role="img"
      aria-label={`Calculator display. ${
        state.input.length > 0 ? `Expression: ${serialize(state.input)}. ` : ''
      }${announcement}`}
    >
      <CalcScreen state={state} solar={solar} />
      <span className="sr-only" aria-live="polite">
        {state.notice ?? state.error ?? state.result ?? ''}
      </span>
    </div>
  );
}
