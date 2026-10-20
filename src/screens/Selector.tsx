import type { CSSProperties } from 'react';
import { SPECS, UPCOMING } from '../calculators/registry';
import type { CalculatorSpec } from '../calculators/types';

function MiniCalc({ spec }: { spec: CalculatorSpec }) {
  return (
    <span
      className="mini-calc"
      style={
        {
          '--mini-top': spec.shell.bodyTop,
          '--mini-bottom': spec.shell.bodyBottom,
          '--mini-accent': spec.shell.accent,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <span className="mini-topline">
        <span className="mini-brand">CASIO</span>
        {spec.shell.solar ? <span className="mini-solar" /> : null}
      </span>
      <span className="mini-model">{spec.model}</span>
      <span className="mini-screen">
        <span className="mini-expr">12+3</span>
        <span className="mini-result">15</span>
      </span>
      <span className="mini-classwiz">{spec.shell.label}</span>
      <span className="mini-keys">
        {Array.from({ length: 36 }, (_, i) => {
          const classes = ['mini-key'];
          if (i < 18) classes.push('mini-key-dark');
          if (i === 8) classes.push('mini-key-ok');
          if (i === 12) classes.push('mini-key-shift');
          return <span key={i} className={classes.join(' ')} />;
        })}
      </span>
    </span>
  );
}

function ExamBadges({ spec }: { spec: CalculatorSpec }) {
  return (
    <span className="badges">
      {spec.exam.gcse ? <span className="badge badge-gcse">GCSE</span> : null}
      {spec.exam.alevel ? <span className="badge badge-alevel">A-level</span> : null}
      <span className="badge badge-tier">Tier 0</span>
    </span>
  );
}

export function Selector({
  onSelect,
  lastId,
}: {
  onSelect: (id: string) => void;
  lastId: string | null;
}) {
  return (
    <main className="selector">
      <header className="selector-head">
        <div className="wordmark">
          <span className="wordmark-mark">±</span>
          <span className="wordmark-text">CalcSim</span>
        </div>
        <p className="selector-kicker">
          Functional replicas of the calculators UK students actually sit exams with.
        </p>
        <p className="selector-sub">
          Pick a model to start. Every key works; nothing here is a screenshot.
        </p>
      </header>

      <section aria-labelledby="available-heading">
        <div className="section-head">
          <h2 id="available-heading">Available now</h2>
          <span className="section-note">Dot-matrix display · exact fractions &amp; surds</span>
        </div>

        <div className="calculator-grid">
          {SPECS.map((spec) => (
            <button
              key={spec.id}
              type="button"
              className={`calculator-card${lastId === spec.id ? ' is-last' : ''}`}
              onClick={() => onSelect(spec.id)}
              aria-label={`Open ${spec.label}`}
            >
              <span className="card-preview">
                <MiniCalc spec={spec} />
              </span>
              <span className="card-body">
                <span className="card-brand">{spec.brand} ClassWiz</span>
                <span className="card-model">{spec.model}</span>
                <ExamBadges spec={spec} />
                <span className="card-cta">Open calculator →</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="soon-heading" className="soon-section">
        <div className="section-head">
          <h2 id="soon-heading">On the roadmap</h2>
          <span className="section-note">Scoped, not simulated yet</span>
        </div>
        <div className="soon-grid">
          {UPCOMING.map((model) => (
            <article key={model.id} className="soon-card" aria-disabled="true">
              <span className="soon-model">{model.model}</span>
              <span className="soon-exam">{model.exam}</span>
              <p>{model.note}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="selector-foot">
        <p>
          Unofficial and educational. Not affiliated with Casio, Texas Instruments, Sharp or any exam
          board. Product names describe compatibility only.
        </p>
        <p>
          Behaviour is modelled on the CW+ manual. Always check your exam board's calculator rules
          before relying on a specific model.
        </p>
      </footer>
    </main>
  );
}
