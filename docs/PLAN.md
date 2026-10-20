# Calculator Simulator — Web App Plan

> A single-page web app that, on load, presents a **selector screen** where you pick a calculator. The app then renders a **pixel-faithful, fully functional replica** of that calculator — same layout, keys, display, modes, and behaviour — with no page reloads and no backend.
>
> **Status:** Planning document. Last updated 2026-10-20.

---

## 1. Vision & goals

A single-page web app that, on load, presents a **selector screen** where you pick a calculator. The app then renders a **pixel-faithful, fully functional replica** of that calculator — same layout, keys, display, modes, and behavior — with no page reloads and no backend.

**Target audience:** GCSE / A-level students (and teachers) who want to practise on the exact calculator they'll use in the exam.

**Non-negotiable requirements:**
- Every replica must be *fully functional*, not a static image.
- Selection happens once at the start (with an easy "change calculator" button later).
- Faithful visual + behavioral match to the real device.
- Works offline (PWA), runs on desktop + tablet + phone.

---

## 2. Scope — which calculators

Build in tiers so you always have a shippable product.

| Tier | Calculator | Type | Why |
|---|---|---|---|
| **0 (MVP)** | Casio **fx-83GT CW+** | Basic scientific | Most common GCSE calculator |
| **0 (MVP)** | Casio **fx-85GT CW+** | Scientific | Same shell, extra functions |
| **0 (MVP)** | Casio **fx-991CW+** | Advanced scientific (ClassWiz) | Standard A-level calculator |
| **1** | Casio **fx-CG50** | Graphing (colour) | A-level Further / Graphing |
| **1** | Casio **fx-CG100** | Graphing (newest) | Modern replacement |
| **2** | Texas Instruments **TI-30X Pro MultiView** | Scientific | Common alternative |
| **2** | Sharp **EL-W506 / EL-W531** | Scientific | Common alternative |
| **2** | Casio **fx-991EX** | ClassWiz (older) | Backwards compatibility |
| **2** | TI-84 Plus CE | Graphing | US / IB crossover |

> **Key design decision:** the ClassWiz family (fx-83/85/991 CW+) shares *one* calculation core and one shell, differing only in which features are enabled. Likewise the fx-CG50/CG100 share a graphing core. This cuts build cost massively.

---

## 3. Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| Build tool | **Vite** | Fast, simple, great PWA plugin |
| Framework | **React 18 + TypeScript** | Component model fits a key grid; TS for the engine |
| Styling | **CSS Modules** (or Tailwind) + custom CSS | Need precise per-key styling and gradients |
| Calculator engine | **Pure TypeScript**, framework-agnostic | Testable, reusable, no React in the core |
| Precision math | **decimal.js** (or `big.js`) | JS floats can't match Casio's 15-digit arithmetic |
| Fonts | **DSEG** (DSEG7 / DSEG14 / DSEG12) — SIL OFL | Authentic seven/14-segment LCD look |
| Testing | **Vitest** (unit) + **Playwright** (E2E) | Engine logic + key-press behaviour |
| State | Local React state + `localStorage` | No server, no auth |
| PWA | `vite-plugin-pwa` | Offline, installable |

No database, no API, no backend. Everything ships as static files → GitHub Pages / Vercel / Netlify.

---

## 4. Architecture — three clean layers

```
┌─────────────────────────────────────────────┐
│  LAYER 3 · RENDERING / UX  (React)          │
│  Selector screen · Simulator screen ·       │
│  Key grid · LCD display · keyboard overlay  │
└───────────────────────┬─────────────────────┘
                        │  uses
┌───────────────────────▼─────────────────────┐
│  LAYER 2 · DEVICE SPECS  (data / JSON)      │
│  Key layout, colours, fonts, shell,         │
│  enabled feature flags, exam status         │
└───────────────────────┬─────────────────────┘
                        │  drives
┌───────────────────────▼─────────────────────┐
│  LAYER 1 · CALCULATOR CORE  (pure TS)       │
│  Tokenizer → Parser → Evaluator → Formatter │
│  State machine (modes, memory, shift, ans)  │
└─────────────────────────────────────────────┘
```

**The core is completely UI-independent.** It exposes a `press(keyId, currentState) → newState` API. React only renders the state.

---

## 5. The calculator core (the hard part)

This is where 80% of the effort lives. Build a generic **scientific calculator engine** that emulates Casio's ClassWiz behaviour.

### 5.1 Modules
- **`tokenizer.ts`** — turns key input into tokens (numbers, operators, functions, fractions, powers).
- **`parser.ts`** — recursive descent / shunting-yard with Casio's precedence rules (implicit multiplication, `-` vs `(-)`, `2π`, `3√2`, etc.).
- **`evaluator.ts`** — computes using a decimal type; handles degrees/radians/gradians, fractions, complex numbers.
- **`formatter.ts`** — converts result to display string: MathI/O vs LineI/O, fraction vs decimal, scientific notation, rounding rules, `×10^` notation.
- **`history.ts`** — keeps a log of (input, result) for the history panel.
- **`memory.ts`** — A, B, C, D, E, F, X, Y, M, Ans, PreAns.
- **`stateMachine.ts`** — mode transitions (Calc, Stat, Table, Matrix, Vector, Equation…), SHIFT/ALPHA latches, error states.

### 5.2 State shape (per calculator)
```ts
interface CalcState {
  mode: Mode;                 // 'calc' | 'stat' | 'table' | 'matrix' | 'vector' | 'equation' | ...
  input: string;              // raw expression being built
  tokens: Token[];
  result: string | null;
  ans: string;
  preAns: string;
  memory: Record<string, number>;
  angleUnit: 'DEG' | 'RAD' | 'GRA';
  displayFormat: 'MathI/O' | 'LineI/O';
  numberFormat: 'Norm1' | 'Norm2' | 'Fix' | 'Sci' | 'Eng';
  error: null | 'Math ERROR' | 'Syntax ERROR' | 'Argument ERROR' | 'Range ERROR';
  shift: boolean;
  alpha: boolean;
  setup: SetupConfig;
}
```

### 5.3 Precision strategy
Casio internally uses a 15-digit mantissa and shows results with specific rounding. To match:
- Use a decimal library for all arithmetic.
- Emulate Casio's rounding to 15 significant digits.
- Note: *exact* parity with the real hardware is the hardest goal — call it out as a stretch goal and validate against a real calculator.

---

## 6. Device specs — data-driven design

Each calculator is described by a JSON spec. Adding a new model = adding a spec + (sometimes) a core.

```json
{
  "id": "casio-fx-991cw-plus",
  "brand": "Casio",
  "model": "fx-991CW+",
  "label": "ClassWiz fx-991CW+",
  "family": "classwiz",
  "exam": { "gcse": true, "alevel": true, "ib": false },
  "core": "classwiz",
  "features": ["complex", "matrix", "vector", "spreadsheet", "base-n", "distribution"],
  "shell": {
    "width": 340, "height": 660, "radius": 26,
    "body": { "top": "#f4f4f2", "bottom": "#d9d9d6" },
    "accent": "#c8102e",
    "solarPanel": true
  },
  "display": {
    "type": "natural-v.v",
    "lines": 2,
    "charFont": "DSEG14", "numFont": "DSEG7",
    "ghostSegments": true
  },
  "keys": [
    { "id": "on",     "label": "ON",     "row": 0, "col": 0, "size": [1,1], "shape": "round", "color": "dark" },
    { "id": "shift",  "label": "SHIFT",  "row": 1, "col": 0, "color": "gold" },
    { "id": "sin",    "label": "sin",    "row": 3, "col": 0, "alt": "sin⁻¹" },
    { "id": "log",    "label": "log",    "row": 3, "col": 1, "alt": "10^x" },
    { "id": "num7",   "label": "7",      "row": 6, "col": 0 }
  ]
}
```

The renderer reads this spec and draws the shell, keys, and display automatically.

---

## 7. UI screens

### 7.1 Selector screen (the "choose at the start")
- Grid of calculator **cards** (image/render + name + exam badges).
- Search/filter by brand, type, exam.
- "Exam status" badges (GCSE ✓ / A-level ✓).
- Click → transition animation → simulator.
- Remembers last choice (`localStorage`) and can auto-load it.

### 7.2 Simulator screen
- The calculator replica, centred, scalable to viewport.
- Top bar: brand/model, **Change calculator**, Help, Theme toggle, Settings.
- Side/bottom panel (collapsible): **History**, **Memory viewer**, **Keyboard mapping**, **Exam-mode indicator**.
- On mobile: calculator fills the width, panels become bottom sheets.

### 7.3 Help / keyboard overlay
- Shows the physical-keyboard → calculator-key mapping.
- Lists SHIFT/ALPHA secondary functions.

---

## 8. Interaction design

| Input | Behaviour |
|---|---|
| Mouse / touch | Tap a key → press animation + action |
| Physical keyboard | `7` → num7, `+` → plus, `Enter` → `=`, `Shift` held → SHIFT latch, `Escape` → AC |
| Key repeat | Holding a key (e.g. cursor) repeats |
| Long-press | Context actions where the real calculator uses a menu |

Key mapping table (example):
```
Digits 0-9  → number keys
+ - * /      → operators
^            → power
( )          → parentheses
Enter        → =
Backspace    → DEL
Escape       → AC
Shift (hold) → SHIFT
```

---

## 9. Display rendering (the "wow" factor)

- **LCD background** with subtle gradient, reflection, and bezel.
- **Ghost segments:** render dimmed `8.8.8.8.8` placeholders and overlay the active digits — mimics a real LCD.
- **Fonts:** DSEG7 for the result line, DSEG14 for the expression line.
- **Stacked fractions:** render `1/2` as a true stacked fraction (fraction bar + numerator/denominator) to match MathI/O.
- **Cursor/blinking** where the real device shows one.
- **Indicator strip:** DEG/RAD/GRA, SHIFT, ALPHA, M, ↔, etc.

---

## 10. Graphing core (fx-CG50 / fx-CG100) — Tier 1

A separate, larger module:
- **Canvas plotter** with pan/zoom, trace, roots, intercepts, intersections.
- **Functions:** y=, parametric, polar, conic sections, 3D graphs (simplified).
- **Table mode**, **Recursion**, **Statistics** (regression curves), **Matrix**, **Vector**, **Equation solver**, **Financial**, **Program**.
- **Colour display** (the CG50's signature feature).
- This is essentially a second app inside the same framework — scope it honestly.

---

## 11. Persistence & settings

Stored in `localStorage`:
- Last selected calculator.
- Theme (light/dark).
- Display settings per calculator.
- Calculation history (optional, per calculator).
- Keyboard-mapping preference.

No accounts, no sync (unless you later add a backend).

---

## 12. Accessibility

- All keys are real `<button>`s with `aria-label`s.
- Display is exposed as live text (`aria-live="polite"`).
- Full keyboard operability (tab + enter).
- Focus-visible outlines.
- Colour-contrast-safe shell themes.

---

## 13. Testing strategy

| Type | Tool | What it covers |
|---|---|---|
| Unit | Vitest | Tokenizer, parser, evaluator, formatter — hundreds of cases |
| Snapshot | Vitest | Display output for known inputs (`2+2` → `4`, `1/3` → `1/3`, etc.) |
| Engine parity | Vitest | Compare against recorded real-calculator outputs |
| E2E | Playwright | Click keys, assert display, mode transitions |
| Visual | Playwright + screenshot | Pixel-regression of each replica |
| Manual | You + a real calculator | Behavioural spot-checks |

---

## 14. Project structure

```
calc-simulator/
├─ public/
│  └─ fonts/                 # DSEG fonts
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ screens/
│  │  ├─ Selector.tsx
│  │  └─ Simulator.tsx
│  ├─ components/
│  │  ├─ Shell.tsx           # device frame
│  │  ├─ KeyGrid.tsx
│  │  ├─ Key.tsx
│  │  ├─ Display.tsx
│  │  ├─ HistoryPanel.tsx
│  │  └─ KeyboardOverlay.tsx
│  ├─ calculators/
│  │  ├─ registry.ts         # id → spec + core
│  │  ├─ specs/              # JSON per model
│  │  │  ├─ casio-fx-83gt-cw.json
│  │  │  ├─ casio-fx-85gt-cw.json
│  │  │  ├─ casio-fx-991cw.json
│  │  │  └─ casio-fx-cg50.json
│  │  ├─ cores/
│  │  │  ├─ classwiz.ts      # shared ClassWiz core
│  │  │  └─ graphing.ts      # fx-CG core
│  ├─ engine/
│  │  ├─ tokenizer.ts
│  │  ├─ parser.ts
│  │  ├─ evaluator.ts
│  │  ├─ formatter.ts
│  │  ├─ stateMachine.ts
│  │  └─ memory.ts
│  ├─ utils/
│  │  ├─ storage.ts
│  │  └─ keyboardMap.ts
│  └─ styles/
├─ tests/
│  ├─ engine/
│  └─ e2e/
├─ index.html
├─ vite.config.ts
└─ README.md
```

---

## 15. Milestones & rough effort

| Phase | Deliverable | Effort |
|---|---|---|
| **0** | Research, assets, decide scope, scaffold Vite+React+TS | 3–5 days |
| **1** | Engine: tokenizer → parser → evaluator → formatter + tests | 1–2 weeks |
| **2** | fx-83GT CW+ replica (shell, display, keys, basic ops) — **MVP** | 1 week |
| **3** | fx-85GT CW+ + fx-991CW+ (features: stats, table, complex, matrix…) | 1–2 weeks |
| **4** | Selector screen, keyboard mapping, persistence, theming | 3–5 days |
| **5** | Graphing core + fx-CG50 replica | 3–5 weeks |
| **6** | Polish, accessibility, tests, docs, deploy | 1 week |

**MVP (Phases 0–2):** one fully working calculator you can select and use. **Tier 1 complete:** the three most important UK calculators.

---

## 16. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Matching Casio's exact rounding/display | Behaviour parity | Validate against a real device; document known deviations |
| Graphing calculator scope creep | Timeline | Time-box; ship a useful subset first |
| Trademark/copyright (logos, product images) | Legal | Draw shells in CSS/SVG, no official logos; add an "unofficial, educational" disclaimer |
| Font licensing | Legal | DSEG is SIL OFL — keep attribution |
| Touch/keyboard input divergence | UX bugs | Single input abstraction layer; thorough E2E tests |
| Performance on low-end devices | UX | Canvas for graphs; memoize; avoid re-rendering the whole grid |

---

## 17. Open decisions (worth confirming before building)

1. **Tier 0 only, or include graphing (fx-CG50) in v1?** Graphing roughly triples the effort.
2. **Exact parity or "close enough"?** Parity requires testing against real hardware.
3. **Should it store/sync history** across devices (needs a backend), or stay local?
4. **Mobile-first or desktop-first?** Affects layout significantly.
5. **Licence/attribution** for fonts and any third-party assets.

---

## 18. Immediate next steps

1. Confirm the Tier 0 calculator list and stack.
2. Scaffold the project and build the engine first (it's the foundation).
3. Replicate the **fx-83GT CW+** end-to-end as the proof of concept.
4. Add the selector + fx-85/991.
5. Then decide on graphing.
