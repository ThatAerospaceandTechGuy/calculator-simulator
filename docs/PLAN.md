# Calculator Simulator — Engineering Plan

> A single-page web app that opens on a **selector screen**, then renders a **pixel-faithful, fully functional replica** of the chosen calculator — same layout, keys, display, modes and behaviour.
>
> **Status:** Phase 0/1/2 done as a vertical slice. Calculate, HOME, SETTINGS and FORMAT menus are working; remaining apps and settings fidelity are in progress.
> **Revision:** 3 — 2026-10-20. Supersedes the initial planning draft.

---

## 1. Product

**Audience:** GCSE / A-level students and teachers who want to practise on the exact calculator they will use in an exam.

**Non-negotiables**

- Every replica is *fully functional*, never a screenshot with clickable hotspots.
- Faithful behaviour first, faithful pixels second — but both matter.
- Works offline (PWA), desktop + tablet + phone.
- No backend, no accounts. Static hosting only.

**Not a goal (v1):** exam-mode circumvention, ROM emulation, or a general-purpose CAS.

---

## 2. Corrections to the first draft

These were wrong or under-specified and drive the architecture below:

| # | First draft | Reality | Consequence |
|---|---|---|---|
| 1 | DSEG7/DSEG14 segment fonts, ghost segments | CW+ uses a **192×63 dot-matrix LCD** with 4 grey levels | Build a dot-matrix renderer; segment fonts are irrelevant for this family |
| 2 | `input: string` | MathI/O is a **2-D expression tree** with a cursor path | Structured input + cursor, not a string |
| 3 | `decimal.js` for all arithmetic | Exact results (`1/3`, `√2`, `2π`) need **rational + surd + π** arithmetic | Exact value layer, decimal fallback |
| 4 | "modes + SHIFT/ALPHA latches" | CW+ is **menu/screen driven** (HOME grid, SETTINGS, CATALOG, dialogs) | Screen + menu context in the state machine |
| 5 | fx-83GT CW+ and fx-85GT CW+ differ by functions | They are **functionally identical**; the 85 adds solar | One core, two specs |
| 6 | 83/85/991 share one shell | 991CW+ has a different keypad and feature set | Share the core, not the shell |
| 7 | 1–2 weeks for the engine | Parity is iterative and needs a fixture corpus | Plan in months, not weeks |

---

## 3. Scope

| Tier | Model | Type | Status |
|---|---|---|---|
| **0** | Casio **fx-83GT CW+** | Scientific, GCSE | Implemented slice |
| **0** | Casio **fx-85GT CW+** | Same as 83 + solar | Implemented slice |
| **0** | Casio **fx-991CW+** | Advanced scientific, A-level | Engine ready; apps pending |
| **1** | Casio **fx-CG50** / **fx-CG100** | Graphing, colour | Not started |
| **2** | TI-30X Pro, Sharp EL-W506/W531, fx-991EX, TI-84 Plus CE | Alternatives | Not started |

**Tier 0 target:** all three CW+ models usable for ordinary calculation, with model-specific shells and feature flags.

---

## 4. Stack

| Layer | Choice | Why |
|---|---|---|
| Build | **Vite** | Fast, static output |
| UI | **React 19 + TypeScript** | Key grid, display, screens |
| Styling | Plain CSS + custom properties | Precise control, no utility-class overhead |
| Engine | **Pure TypeScript** | Framework-free, testable |
| Exact math | `bigint` rationals + surd/π normalisation | Reproduces Casio's exact display |
| Numeric math | **decimal.js** (40-digit working precision) | Transcendentals without float noise |
| Display | Custom **5×7 bitmap font → SVG** | Real dot-matrix look, no font licensing |
| Tests | **Vitest** | Engine, editor, state machine |
| E2E (later) | Playwright | Key presses, visual snapshots |
| PWA (later) | `vite-plugin-pwa` | Offline install |

No API, no database. Deploy to GitHub Pages / Vercel / Netlify.

---

## 5. Architecture

```
┌──────────────────────────────────────────────────┐
│ UI · React                                       │
│ Selector · Simulator · Shell · Keypad · Display  │
└──────────────────────┬───────────────────────────┘
                       │ CalcState, press(keyId)
┌──────────────────────▼───────────────────────────┐
│ Input editor · state machine                     │
│ ExprNode tree, cursor path, SHIFT latch, screens │
└──────────────────────┬───────────────────────────┘
                       │ serialise → parse → evaluate
┌──────────────────────▼───────────────────────────┐
│ Engine · pure TS                                 │
│ exact values → parser → evaluator → formatter    │
└──────────────────────┬───────────────────────────┘
                       │ driven by
┌──────────────────────▼───────────────────────────┐
│ Device specs · data                              │
│ shell, keys, labels, colours, feature flags       │
└──────────────────────────────────────────────────┘
```

The engine knows nothing about React, CSS, or key positions. The UI knows nothing about arithmetic.

---

## 6. Value layer

The single most important design decision. Casio's default output is **exact**, so the engine carries an exact value whenever it can.

```ts
type Rational = { n: bigint; d: bigint };          // always normalised, d > 0

type Exact =
  | { kind: 'rational'; r: Rational }
  | { kind: 'surd'; c: Rational; rad: bigint }     // c·√rad, rad square-free
  | { kind: 'pi'; c: Rational };                   // c·π

type Value =
  | { kind: 'exact'; exact: Exact }
  | { kind: 'decimal'; dec: Decimal };
```

Rules:

- All four operations stay exact when both sides are representable.
- `√` extracts square factors (`√8 → 2√2`) and rationalises divisions (`1/√2 → √2/2`).
- Addition of unlike surds (`√2 + √3`) or `π × π` falls back to decimal.
- Results are rounded to **10 significant digits for display**, with 40 digits of working precision.
- Display uses **Norm 2** by default: scientific notation outside `1e-9 … 1e10`. `Norm 1` uses `1e-2 … 1e10`.
- Output options include mixed/improper fractions, dot/comma decimal marks and optional digit grouping.
- `Ans` and `PreAns` store `Value`, not strings, so exactness survives chaining.
- Complex numbers, matrices and vectors are future value variants, not parser hacks.

Known limitations (documented, tested): one surd term only, no symbolic sums, no exact `sin` outside the standard angles, recurring-decimal notation not yet rendered.

---

## 7. Input model

MathI/O input is a tree, not a string:

```ts
type Node =
  | { kind: 'number'; text: string }
  | { kind: 'atom'; text: string }       // π, Ans, sin, e …
  | { kind: 'op'; text: string }         // + - * / ^ ( ) , %
  | { kind: 'frac'; num: Node[]; den: Node[] }
  | { kind: 'sqrt'; radicand: Node[] };

type ListPath = Array<{ at: number; slot: 'num' | 'den' | 'radicand' }>;
type Cursor = { path: ListPath; index: number };
```

- The cursor addresses a list plus an insertion index. `path` names the nested slot.
- `a/b` inserts a fraction template; `√` inserts a radical template.
- Digits merge into the preceding number literal; DEL splits/removes nodes.
- Left/right walks out of templates; up/down moves between numerator and denominator.
- Serialisation is deliberately parenthesised: `(1)/(3)`, `√(2)`, `sin(30)`.
- Missing closing parentheses are auto-closed at `=`.

This is the minimum needed for authentic editing. Function argument lists, powers with superscript slots and mixed numbers extend the same model.

---

## 8. Parser, evaluator, formatter

**Parser** — recursive descent, right-associative `^`, unary minus below power (`-2^2 = -4`), implicit multiplication (`2π`, `3(4+5)`, `2sin(30)`), functions with or without parentheses. Errors: `Syntax ERROR`.

**Evaluator** — exact arithmetic first; decimal fallback for transcendentals. Angle mode is part of the evaluation context. Exact trig table for multiples of 30°/45°; other angles use decimal trig. Domain errors → `Math ERROR`.

**Formatter** — exact first: `1/3`, `2√2`, `π/2`, with optional mixed-number output (`1 1/2`). Decimal: 10 significant digits, trailing zeros stripped, `×10^n` outside the selected Norm range. Options also cover dot/comma decimal marks and digit grouping (`2,000`). The UI is responsible for pretty symbols (`×`, `÷`, `−`); the engine stores ASCII operators.

`Ans`/`PreAns` and history are updated only on `=`.

---

## 9. Display

- Physical pixel grid: **192 × 63**, scaled by CSS. One dot = one SVG rect.
- 5×7 glyph cell with a 1-dot gap: exactly 32 small characters per line, 16 large.
- Expression line: small glyphs, stacked fractions and radicals composed from runs.
- Result line: large glyphs, automatically falls back to small above 16 characters.
- Menu screen: title/count, a four-row scrolling window, inverted selected row, option numbers, current-option check, scrollbar and a status footer.
- Indicator row: SHIFT, MathI/O, angle unit, history and solar flags.
- 4-gradation grey is modelled with CSS colours; per-pixel greyscale is a later upgrade.
- No official fonts or logos. The bitmap font is the classic Adafruit GFX 5×7 face (BSD-2-Clause), with math glyph overrides for `π √ × ÷ − ² ³ °`.

The shell is drawn in CSS from measured proportions; it is **not** a product photo.

---

## 10. Interaction and screens

CW+ interaction is menu-driven. The state machine keeps a screen plus a small menu context:

```ts
type Screen = 'calc' | 'home' | 'off' | 'menu';

interface MenuContext {
  menuPage: MenuPage;
  menuIndex: number;
  menuReturn: 'calc' | 'home';
}
```

v1 implements:

- the HOME grid and Calculate app;
- the SETTINGS root: **Calc Settings**, **System Settings**, **Reset** and **Get Started**;
- Calc Settings pages for Input/Output, Angle Unit, Number Format (Norm 1/Norm 2), Fraction Result, Decimal Mark, Digit Separator, the ×10ˣ key and the FORMAT key;
- System Settings pages for Contrast, Auto Power Off, Show Option Num, MultiLine Font and QR Code (some values are stored preferences rather than hardware behaviours);
- Reset Settings / Initialize All;
- the FORMAT menu: Standard, Decimal, Improper Fraction and Mixed Number when the result is rational;
- a four-row scrolling menu window with option numbers and a current-option check.

Statistics, Table, Ratio and Math Box remain represented on HOME but deliberately stubbed. A general screen stack (`catalog`, dialogs, app-specific screens) is the next step.

Key semantics:

- **SHIFT is a latch**, pressed once and consumed by the next key.
- **ALPHA** (future) is a second latch; both indicators live on the LCD.
- `EXE` evaluates; the expression stays visible above the result. `OK` selects a menu item and evaluates in Calculate.
- After `EXE`, a digit starts a new expression; an operator continues from `Ans`.
- `AC` closes the current menu, or clears input and result when no menu is open. `←` / Back moves back one menu level.
- `DEL` edits; `ON` powers on to HOME. `SHIFT` + `AC` powers off.
- Arrow keys move the input cursor through nested templates, the HOME selection, or the menu selection. `PageUp` / `PageDown` jump four menu rows.
- `SETTINGS` on HOME opens **Get Started**; inside Calculate it opens the SETTINGS root. The angle chip in the page header is a direct shortcut that cycles DEG → RAD → GRA without opening the menu.
- `FORMAT` behaviour is configurable. With the default **Decimal** setting, `FORMAT` toggles standard/decimal and `SHIFT` + `FORMAT` opens the FORMAT menu. With **Format Menu**, those actions are reversed. The shifted ≈ key always toggles.
- `×10ˣ` inserts `×10^` in Sci Notat mode, or `^` in Power mode.
- `SHIFT` + `a b/c` toggles the current result between improper and mixed form.
- `SHIFT` + `7` inserts π and `SHIFT` + `8` inserts e.

Physical keyboard mapping (v1): digits, `. + - * / ^ ( ) %`, `Enter`, `Backspace`, `Escape`, arrows, `PageUp` / `PageDown`, `h`, `s c t l n r f p a e`. `Shift` toggles the latch. On-screen SETTINGS/FORMAT are used for the menus.

---

## 11. Device specs

Each model is data. Adding a model should not require touching the engine.

```ts
interface CalculatorSpec {
  id: string;
  brand: string;
  model: string;
  family: 'classwiz' | 'graphing';
  exam: { gcse: boolean; alevel: boolean };
  features: string[];                 // 'complex' | 'matrix' | 'table' …
  shell: {
    bodyTop: string; bodyBottom: string; accent: string;
    solar: boolean; label: string;
  };
  display: { width: 192; height: 63; greyLevels: number };
  keys: KeySpec[];
}

interface KeySpec {
  id: string;
  label: string;
  shiftLabel?: string;
  shiftId?: string;
  row: number;
  col: number;
  span?: number;
  kind?: 'key' | 'dpad' | 'equals' | 'ac' | 'shift';
  tone?: 'number' | 'operator' | 'function' | 'control' | 'shift' | 'equals' | 'ac';
}
```

Feature flags gate apps. A model that lacks `matrix` must not expose matrix screens even if the core could run them.

---

## 12. UI

**Selector**

- Cards with a CSS shell preview, model name, and GCSE/A-level badges.
- Search/filter eventually; v1 is a grid.
- Will remember the last model later; for now it always starts on the selector.

**Simulator**

- Responsive calculator shell, centred, scaled with `clamp()`.
- Top bar: back, model, direct angle-unit chip (click to cycle), unofficial pill.
- Contextual hint for HOME, menus, SHIFT and normal Calculate use.
- Collapsible history panel and keyboard help.
- No page reload when changing model.

**Accessibility**

- Keys are `<button>`s with `aria-label`s.
- Display is `aria-live="polite"` but only announces the **result/error**, not every keystroke.
- Full keyboard operability, visible focus rings.
- Reduced-motion support for press animations.

---

## 13. Persistence

Planned, not yet wired. Versioned `localStorage` keys:

- `calcsim:v1:lastModel` — selected calculator id
- `calcsim:v1:settings:<model>` — the full `CalcSettings` object (including angle unit)
- `calcsim:v1:history:<model>` — optional history

No sync. Corrupt/unparseable values are ignored.

---

## 14. Testing

| Layer | What | Method |
|---|---|---|
| Exact values | `1/3`, `√8`, `1/√2`, `2π` | Vitest unit |
| Parser | precedence, unary minus, implicit multiplication | Vitest unit |
| Evaluator | trig table, domains, angle units | Vitest unit |
| Formatter | fractions, surds, mixed numbers, Norm 1/Norm 2, grouping, decimal mark | Vitest unit |
| Editor | templates, cursor ascent/descent, DEL | Vitest unit |
| State machine | key sequences, SHIFT latch, `Ans`, menus, FORMAT, reset | Vitest unit |
| Parity | recorded real-device outputs | Golden fixture corpus (next) |
| E2E | click keys, assert display | Playwright (next) |
| Visual | screenshot regression | Playwright (next) |

Current automated suite: 50 Vitest cases across engine, editor and state machine. Menu rendering has also been checked in a headless browser at desktop, 390 px and 320 px widths.

Golden fixtures use the same source string as the parser:

```json
{ "input": "sin(30)", "angle": "DEG", "display": "1/2" }
```

Record them from a real device or a trusted emulator; never invent expected values.

---

## 15. Repository layout

```
calculator-simulator/
├─ docs/PLAN.md
├─ src/
│  ├─ engine/          values.ts parser.ts evaluator.ts format.ts errors.ts
│  ├─ input/           nodes.ts (tree, cursor, editing, serialisation)
│  ├─ state/           calculator.ts (press → CalcState), settings.ts (menu model)
│  ├─ calculators/     types.ts specs.ts registry.ts
│  ├─ components/      Display, DotMatrix, Keypad, Key, Shell
│  ├─ screens/         Selector, Simulator
│  ├─ ui/              font5x7.ts
│  ├─ App.tsx  main.tsx  app.css
├─ scripts/gen-font.mjs
├─ index.html  vite.config.ts  tsconfig.json  package.json
└─ README.md  LICENSE  NOTICE.md
```

---

## 16. Roadmap

| Phase | Deliverable | Effort |
|---|---|---|
| **0** | Plan, stack, repo hygiene, font pipeline | done |
| **1** | Exact value layer, parser, evaluator, formatter, tests | done (slice) |
| **2** | Tree editor, state machine, dot-matrix display, shell, selector | done (slice) |
| **3** | fx-83GT CW+ parity: shell, keys, Calculate, SETTINGS/FORMAT, error cases | in progress |
| **4** | fx-85GT CW+ spec + fx-991CW+ shell and feature flags | 1–2 weeks |
| **5** | Remaining menus and apps: CATALOG, stats/table/complex/matrix engines; Fix/Sci and line input | 6–10 weeks |
| **6** | PWA, persistence, accessibility audit, Playwright suite, deploy | 2–3 weeks |
| **7** | Graphing core + fx-CG50/CG100 | 3–6 months |

These are part-time estimates. Behavioural parity with real hardware is the long pole, not the UI.

---

## 17. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Exact-symbolic scope creep | Engine never ships | One surd term + π now; value union designed for extension |
| Casio rounding/display differences | Perceived inaccuracy | Golden corpus, documented deviations, 10-digit display rule |
| Menu/app scope | Months of work | Ship calculation mode first; feature-gate every app |
| Trademark/trade dress | Legal | CSS-drawn shell, no logos, "unofficial" disclaimer, no product photos |
| Font licensing | Legal | BSD-2-Clause bitmap font, attribution in NOTICE |
| Touch vs keyboard divergence | UX bugs | One `press(keyId)` entry point for both |
| Low-end devices | Jank | Memoise keypad, SVG display only, no heavy canvas in v1 |

---

## 18. Open decisions

1. **Parity target:** fx-83GT CW+ only for v1, or all three CW+ models?
2. **Accuracy:** how close is "close enough" for trig and rounding? Needs a real device.
3. **Exam mode:** model it visually, or omit it entirely?
4. **Mobile:** portrait calculator-first, or landscape with side panels?
5. **Deployment:** GitHub Pages vs Vercel; custom domain?
6. **Number Format:** when Fix/Sci land, should the digit-choice step be a submenu or an inline value picker?
7. **Line input:** implement a true LineI editor, or keep the setting as an output-only preference with an explicit notice?

---

## 19. References

- Casio fx-83GT CW+ / fx-85GT CW+ user manual (2026 revision)
- Casio ClassWiz CW catalogue — 192 × 63 dot display, 10 + 2 digits
- Adafruit GFX 5×7 bitmap font (BSD-2-Clause)
- Decimal.js documentation
