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

export function Display({ state }: { state: CalcState }) {
  const output = state.error ?? state.result;
  const resultScale = output && output.length > 16 ? 1 : 2;
  const hasInput = state.input.length > 0;

  return (
    <div
      className="lcd"
      role="img"
      aria-label={`Calculator display. ${
        hasInput ? `Expression: ${serialize(state.input)}.` : ''
      } Result: ${output ?? '0'}.`}
    >
      <div className="lcd-screen">
        <div className="lcd-indicators">
          {state.shift ? <Run text="SHIFT" /> : null}
          <Run text={state.angleUnit} />
          <span className="lcd-indicator-spacer" />
          <Run text="MATH" />
        </div>

        <div className="lcd-expression">
          <NodeList nodes={state.input} path={[]} cursor={state.cursor} />
        </div>

        <div className="lcd-result">
          {output ? (
            <Run text={output} scale={resultScale} />
          ) : !hasInput ? (
            <Run text="0" scale={2} />
          ) : null}
        </div>
      </div>

      <span className="sr-only" aria-live="polite">
        {state.error ?? state.result ?? ''}
      </span>
    </div>
  );
}
