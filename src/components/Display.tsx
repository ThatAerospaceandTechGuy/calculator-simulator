import type { CSSProperties } from 'react';
import { Fragment } from 'react';
import type { CalcState } from '../state/calculator';
import { getMenuPage, menuItemCount } from '../state/settings';
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

const MENU_ROWS = 4;

function MenuScreen({ state }: { state: CalcState }) {
  const definition = getMenuPage(state.menuPage, state.settings, state.ans);
  const count = menuItemCount(definition);
  const start = Math.max(0, Math.min(state.menuIndex - 1, count - MENU_ROWS));
  const options = definition.mode === 'options' ? definition.options ?? [] : [];
  const items = definition.mode === 'list' ? definition.items ?? [] : [];
  const showNumbers = state.settings.showOptionNum === 'On';

  return (
    <div className="lcd-screen lcd-menu">
      <div className="lcd-menu-head">
        <Run text={definition.title} />
        {count > 0 ? (
          <span className="lcd-menu-count">
            <Run text={`${state.menuIndex + 1}/${count}`} />
          </span>
        ) : null}
      </div>

      {definition.mode === 'message' ? (
        <div className="lcd-menu-message">
          {(definition.message ?? []).map((line, index) => (
            <div className="lcd-menu-message-line" key={index}>
              <Run text={line} />
            </div>
          ))}
        </div>
      ) : (
        <div className="lcd-menu-body">
          <div className="lcd-menu-rows">
            {options.slice(start, start + MENU_ROWS).map((option, offset) => {
              const index = start + offset;
              const selected = index === state.menuIndex;
              const current = definition.setting
                ? String(state.settings[definition.setting]) === String(option.value)
                : false;
              return (
                <div
                  className={`lcd-menu-row${selected ? ' is-selected' : ''}`}
                  key={`${option.label}-${index}`}
                  aria-current={selected ? 'true' : undefined}
                >
                  {showNumbers ? (
                    <span className="lcd-menu-num">
                      <Run text={String(index + 1)} />
                    </span>
                  ) : null}
                  <span className="lcd-menu-label">
                    <Run text={option.label} />
                  </span>
                  {current ? (
                    <span className="lcd-menu-check">
                      <Run text="✓" />
                    </span>
                  ) : null}
                </div>
              );
            })}

            {items.slice(start, start + MENU_ROWS).map((item, offset) => {
              const index = start + offset;
              const selected = index === state.menuIndex;
              return (
                <div
                  className={`lcd-menu-row${selected ? ' is-selected' : ''}`}
                  key={`${item.label}-${index}`}
                  aria-current={selected ? 'true' : undefined}
                >
                  {showNumbers ? (
                    <span className="lcd-menu-num">
                      <Run text={String(index + 1)} />
                    </span>
                  ) : null}
                  <span className="lcd-menu-label">
                    <Run text={item.label} />
                  </span>
                  {item.detail ? (
                    <span className="lcd-menu-detail">
                      <Run text={item.detail} />
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          {count > MENU_ROWS ? (
            <div className="lcd-menu-scroll" aria-hidden="true">
              <span
                className="lcd-menu-thumb"
                style={{
                  top: `${(start / count) * 100}%`,
                  height: `${Math.max(2, (MENU_ROWS / count) * 100)}%`,
                }}
              />
            </div>
          ) : null}
        </div>
      )}

      {state.notice ? (
        <div className="lcd-menu-foot is-notice">
          <Run text={state.notice} />
        </div>
      ) : (
        <div className="lcd-menu-foot">
          <Run text={definition.mode === 'message' ? 'AC: BACK' : 'OK: SELECT  AC: BACK'} />
        </div>
      )}
    </div>
  );
}

function CalcScreen({ state, solar }: { state: CalcState; solar: boolean }) {
  const output = state.error ?? state.result;
  const resultScale = output && output.length > 16 ? 1 : 2;
  const hasInput = state.input.length > 0;
  const angle = state.settings.angleUnit[0];

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

/** ---------- Statistics Screen ---------- */

function StatScreen({ state }: { state: CalcState }) {
  const s = state.stat;

  if (s.view === 'results') {
    const resultEntries = s.results ? Object.entries(s.results) : [];
    return (
      <div className="lcd-screen lcd-stat">
        <div className="lcd-stat-title">
          <Run text={s.mode === '1-VAR' ? '1-VAR STAT' : '2-VAR STAT'} />
        </div>
        <div className="lcd-stat-results">
          {resultEntries.map(([key, val], i) => (
            <div key={i} className="lcd-stat-row">
              <Run text={key} />
              <Run text={val} />
            </div>
          ))}
        </div>
        <div className="lcd-stat-foot">
          <Run text="AC: BACK" />
        </div>
      </div>
    );
  }

  // Data entry view
  const xCol = s.columns[0];
  const yCol = s.columns[1];

  return (
    <div className="lcd-screen lcd-stat">
      <div className="lcd-stat-title">
        <Run text={s.mode === '1-VAR' ? '1-VAR STAT' : '2-VAR STAT'} />
      </div>
      <div className="lcd-stat-grid">
        <div className="lcd-stat-col">
          <Run text="X" />
          {xCol.values.map((v, i) => (
            <Run key={i} text={v === '' && i === s.focusRow && s.focusCol === 0 ? '_' : v} />
          ))}
        </div>
        {s.mode === '2-VAR' && (
          <div className="lcd-stat-col">
            <Run text="Y" />
            {yCol.values.map((v, i) => (
              <Run key={i} text={v === '' && i === s.focusRow && s.focusCol === 1 ? '_' : v} />
            ))}
          </div>
        )}
      </div>
      <div className="lcd-stat-foot">
        <Run text="OK: CALC  AC: BACK" />
      </div>
    </div>
  );
}

/** ---------- Table Screen ---------- */

function TableScreen({ state }: { state: CalcState }) {
  const t = state.table;

  if (t.view === 'results') {
    return (
      <div className="lcd-screen lcd-table">
        <div className="lcd-table-title">
          <Run text="TABLE" />
        </div>
        <div className="lcd-table-func">
          <Run text={`f(x) = ${t.func}`} />
        </div>
        <div className="lcd-table-rows">
          {t.rows?.map((row, i) => (
            <div key={i} className="lcd-table-row">
              <Run text={row.x} />
              <Run text={row.y} />
            </div>
          ))}
        </div>
        <div className="lcd-table-foot">
          <Run text="AC: BACK" />
        </div>
      </div>
    );
  }

  return (
    <div className="lcd-screen lcd-table">
      <div className="lcd-table-title">
        <Run text="TABLE" />
      </div>
      <div className="lcd-table-input">
        <Run text="f(x) =" />
        <Run text={t.func || '_'} />
      </div>
      <div className="lcd-table-foot">
        <Run text="OK: CALC  AC: BACK" />
      </div>
    </div>
  );
}

/** ---------- Ratio Screen ---------- */

function RatioScreen({ state }: { state: CalcState }) {
  const r = state.ratio;

  if (r.view === 'result') {
    return (
      <div className="lcd-screen lcd-ratio">
        <div className="lcd-ratio-title">
          <Run text="RATIO" />
        </div>
        <div className="lcd-ratio-result">
          <Run text={r.result || ''} />
        </div>
        <div className="lcd-ratio-foot">
          <Run text="AC: BACK" />
        </div>
      </div>
    );
  }

  return (
    <div className="lcd-screen lcd-ratio">
      <div className="lcd-ratio-title">
        <Run text="RATIO" />
      </div>
      <div className="lcd-ratio-input">
        <Run text={r.focus === 'a' ? (r.a || '_') : r.a} />
        <Run text=":" />
        <Run text={r.focus === 'b' ? (r.b || '_') : r.b} />
      </div>
      <div className="lcd-ratio-foot">
        <Run text="OK: CALC  AC: BACK" />
      </div>
    </div>
  );
}

/** ---------- Math Box Screen ---------- */

function MathBoxScreen({ state }: { state: CalcState }) {
  const m = state.mathbox;

  if (!m.tool) {
    return (
      <div className="lcd-screen lcd-mathbox">
        <div className="lcd-mathbox-title">
          <Run text="MATH BOX" />
        </div>
        <div className="lcd-mathbox-tools">
          {['RANDOM INT', 'DICE 1-6', 'COIN TOSS', 'FACTORIAL'].map((label, i) => (
            <div key={i} className="lcd-mathbox-tool">
              <Run text={label} />
            </div>
          ))}
        </div>
        <div className="lcd-mathbox-foot">
          <Run text="OK: SELECT  AC: BACK" />
        </div>
      </div>
    );
  }

  return (
    <div className="lcd-screen lcd-mathbox">
      <div className="lcd-mathbox-title">
        <Run text={m.tool} />
      </div>
      <div className="lcd-mathbox-input">
        <Run text={m.input || '_'} />
      </div>
      {m.result && (
        <div className="lcd-mathbox-result">
          <Run text={m.result} />
        </div>
      )}
      <div className="lcd-mathbox-foot">
        <Run text="OK: CALC  AC: BACK" />
      </div>
    </div>
  );
}

export function Display({ state, solar = false }: { state: CalcState; solar?: boolean }) {
  const lcdStyle = {
    filter: `contrast(${(0.94 + state.settings.contrast * 0.02).toFixed(2)})`,
  } as CSSProperties;

  if (state.screen === 'off') {
    return <div className="lcd lcd-off" role="img" aria-label="Calculator is off" />;
  }

  if (state.screen === 'home') {
    const selected = APPS[state.homeIndex] ?? APPS[0];
    return (
      <div
        className="lcd"
        role="img"
        style={lcdStyle}
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

  if (state.screen === 'menu') {
    const definition = getMenuPage(state.menuPage, state.settings, state.ans);
    const selected =
      definition.mode === 'options'
        ? definition.options?.[state.menuIndex]?.label
        : definition.items?.[state.menuIndex]?.label;
    const announcement = state.notice
      ? `Notice: ${state.notice}.`
      : definition.mode === 'message'
        ? `${definition.title}. Press AC to close.`
        : `${definition.title}.${selected ? ` Selected: ${selected}.` : ''}`;
    return (
      <div
        className="lcd"
        role="img"
        style={lcdStyle}
        aria-label={`Calculator menu. ${announcement}`}
      >
        <MenuScreen state={state} />
        <span className="sr-only" aria-live="polite">
          {announcement}
        </span>
      </div>
    );
  }

  if (state.screen === 'stat') {
    return (
      <div
        className="lcd"
        role="img"
        style={lcdStyle}
        aria-label={`Statistics app. ${state.stat.view === 'results' ? 'Viewing results' : 'Entering data'}.`}
      >
        <StatScreen state={state} />
        <span className="sr-only" aria-live="polite">
          {state.stat.view === 'results'
            ? `Statistics results: ${Object.entries(state.stat.results ?? {}).map(([k, v]) => `${k} ${v}`).join(', ')}`
            : 'Statistics data entry'}
        </span>
      </div>
    );
  }

  if (state.screen === 'table') {
    return (
      <div
        className="lcd"
        role="img"
        style={lcdStyle}
        aria-label={`Table app. ${state.table.view === 'results' ? 'Viewing table' : 'Entering function'}.`}
      >
        <TableScreen state={state} />
        <span className="sr-only" aria-live="polite">
          {state.table.view === 'results' ? 'Table results' : `Table function: ${state.table.func}`}
        </span>
      </div>
    );
  }

  if (state.screen === 'ratio') {
    return (
      <div
        className="lcd"
        role="img"
        style={lcdStyle}
        aria-label={`Ratio app. ${state.ratio.view === 'result' ? 'Viewing result' : 'Entering ratio'}.`}
      >
        <RatioScreen state={state} />
        <span className="sr-only" aria-live="polite">
          {state.ratio.view === 'result'
            ? `Ratio result: ${state.ratio.result}`
            : `Ratio input: ${state.ratio.a}:${state.ratio.b}`}
        </span>
      </div>
    );
  }

  if (state.screen === 'mathbox') {
    return (
      <div
        className="lcd"
        role="img"
        style={lcdStyle}
        aria-label={`Math Box app. ${state.mathbox.tool ?? 'Selecting tool'}.`}
      >
        <MathBoxScreen state={state} />
        <span className="sr-only" aria-live="polite">
          {state.mathbox.tool
            ? `Math Box ${state.mathbox.tool}. Input: ${state.mathbox.input}. ${state.mathbox.result ?? ''}`
            : 'Math Box tool selection'}
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
      style={lcdStyle}
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
