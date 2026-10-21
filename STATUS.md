# Calculator Simulator — Summary & To-Do

Last updated: 2026-10-21 (commit `b8eeb10`)

## Project Overview

A web app that replicates approved GCSE/A-level calculators. Currently focused on
the Casio fx-83GT CW+ / fx-85GT CW+ (black, 2nd edition). The replica is
fully functional (not screenshots with hotspots): faithful layout, keys, display,
modes and behaviour. No backend, no official logos or product photos.

- Stack: Vite + React 19 + TypeScript + Vitest
- Display: 192×63 dot-matrix LCD with SVG bitmap font (Adafruit GFX 5×7)
- Engine: exact-value arithmetic (rationals, surds, π) with decimal fallback
- Input: tree-based MathI/O editor with fraction and radical templates
- State machine with screen + menu context (`calc` | `home` | `off` | `menu`)

## Architecture

```
UI (React) → CalcState / press(keyId) → Input editor + state machine
             → serialise → parse → evaluate → format → Display (dot matrix)
             → driven by device specs (calculator data)
```

Engine is pure TS, framework-free. UI knows nothing about arithmetic.

## Current Status (What Works)

### Engine
- Exact-value layer: rationals, surds, π, decimal fallback
- Recursive-descent parser (right-assoc `^`, unary minus, implicit multiplication)
- Evaluator with DEG/RAD/GRA angle modes, exact trig table for standard angles
- Formatter: exact first (`1/3`, `2√2`, `π/2`), 10 significant digits, Norm 1/Norm 2
- Mixed-number output (`1 1/2`), dot/comma decimal marks, digit grouping
- Surd rationalisation, decimal fallback for transcendentals

### Input Editor
- Tree-based MathI/O nodes (number, atom, op, frac, sqrt) with cursor path
- Fraction and radical templates, auto-close parentheses
- DEL splits/removes nodes, left/right navigates nested templates

### State Machine
- Screen stack: HOME, Calculate, off, menu
- SHIFT latch (consumed by next key)
- `EXE` evaluates; expression stays visible above result
- After `=`, digit starts new expression; operator continues from `Ans`
- `AC` clears input/result (keeps Ans, history, settings)
- `DEL` edits; `ON` powers on to HOME; `SHIFT` + `AC` powers off
- Arrow keys move cursor through nested templates or HOME/menu selection
- FORMAT key: configurable (Decimal or Format Menu mode)
- `SHIFT` + `FORMAT` (≈): opens FORMAT menu (Decimal mode) or toggles (Format Menu mode)
- `×10ˣ` key: Sci Notat inserts `×10^`, Power inserts `^`
- `SHIFT` + `a b/c` toggles improper/mixed form
- Angle chip in header cycles DEG → RAD → GRA directly

### UI
- Selector screen with calculator cards
- Black CW+ 2nd-edition shell (CSS-drawn, no product photos)
- Six-column function grid, five-column number pad
- Dot-matrix display renderer (192×63, scaled by CSS)
- HOME menu: Calculate, Statistics, Table, Ratio, Math Box tiles
- Collapsible history panel and keyboard help
- Responsive: desktop, tablet, phone (tested at 1280/390/320px)

### SETTINGS Menu (full implementation)
- **Settings root**: Calc Settings, System Settings, Reset, Get Started
- **Calc Settings** (8 items, scrolling):
  - Input/Output (MathI/MathO, MathI/DecimalO, LineI/LineO, LineI/DecimalO)
  - Angle Unit (Degree, Radian, Gradian)
  - Number Format (Norm 1, Norm 2)
  - Fraction Result (Improp Fraction, Mixed Number)
  - Decimal Mark (Dot, Comma)
  - Digit Separator (On, Off)
  - ×10ˣ Key (Sci Notat, Power)
  - FORMAT Key (Decimal, Format Menu)
- **System Settings** (5 items, scrolling):
  - Contrast (1–9), Auto Power Off (10/60 Min.), MultiLine Font (Normal/Small),
    Show Option Num (On/Off), QR Code (Version 3/11)
- **Reset**: Reset Settings, Initialize All
- **Get Started**: message page with usage tips
- 4-row scrolling menu window with option numbers and current-option check (✓)
- Menu footer with hint or notice
- `AC` closes menu; `←`/Back moves back one level; `PageUp`/`PageDown` jump 4 rows

### FORMAT Menu
- Opens via `SHIFT` + `FORMAT` (Decimal mode) or `FORMAT` (Format Menu mode)
- Options: Standard, Decimal, Improp Fraction, Mixed Number (last two only for rationals)
- Applies result conversion immediately

### Tests
- 50 Vitest cases across engine, editor and state machine
- Engine: parser, evaluator, formatter (Norm, grouping, decimal mark, mixed)
- Editor: templates, cursor movement, DEL
- State machine: key sequences, SHIFT latch, Ans, menus, FORMAT, reset
- Browser QA: no console errors, no failed requests, no horizontal overflow

## Partially Modelled

- **Input/Output line modes**: setting is stored and decimal-output modes work, but
  the editor remains MathI (no true LineI editor). A notice is not shown.
- **Number Format**: only Norm 1/Norm 2. Fix/Sci are not selectable.
- **System Settings**: some values are stored preferences, not hardware behaviours:
  - Contrast: applies a CSS `contrast()` filter to the LCD (visual, subtle)
  - Auto Power Off: stored but no timer
  - MultiLine Font: stored but single font size
  - QR Code: stored but not generated
- **Reformat on setting change**: reformatResult attempts to update the current
  result when a setting changes (angle, decimal mark, digit separator, fraction
  result, Norm). Mixed results from FORMAT menu are handled.

## Not Implemented

- Statistics, Table, Ratio, Math Box apps (shown on HOME but stubbed)
- Variable / Function / Catalog / Tools menus
- Complex numbers, matrices, vectors
- fx-991CW+ shell and feature flags
- Graphing core (fx-CG50/CG100)
- Alternative calculators (TI-30X Pro, Sharp EL-W506/W531, fx-991EX, TI-84 Plus CE)
- PWA install, offline support, persistence (localStorage planned but not wired)
- Exam mode
- Playwright E2E / visual regression tests
- Golden fixture corpus (parity testing against real device)
- Recurring-decimal notation
- True line-input editor
- Fix/Sci number formats

## Key Files

| File | Purpose |
|------|---------|
| `src/state/settings.ts` | Settings types, defaults, menu page definitions, option labels/checks, menu helpers, `applySetting` |
| `src/state/calculator.ts` | Menu-aware state machine, formatting integration, key behaviour, `cycleAngleState` |
| `src/components/Display.tsx` | CalcScreen, HomeScreen, MenuScreen (4-row window, scrollbar, checks, footer), ARIA labels |
| `src/calculator.css` | Shell, LCD, menu layout (rows, selection, scroll, footer), responsive rules |
| `src/engine/format.ts` | `FormatOptions`, mixed fractions, grouping, decimal mark, Norm 1/Norm 2 thresholds |
| `src/engine/values.ts` | Exact value types (rational, surd, π, decimal) |
| `src/engine/parser.ts` | Recursive-descent parser |
| `src/engine/evaluator.ts` | Exact arithmetic, decimal fallback, trig table |
| `src/input/nodes.ts` | Tree-based MathI/O editor, cursor, serialisation |
| `src/screens/Simulator.tsx` | Angle chip shortcut, menu hint, model notes, keyboard handler |
| `src/ui/font5x7.ts` | 5×7 bitmap font + extra glyphs (π, √, ×, ÷, −, ², ³, °, ✓) |
| `src/calculators/specs.ts` | CW+ key grid, SHIFT mappings, shell definitions |
| `src/state/calculator.test.ts` | 26 menu, FORMAT, reset, formatting regression tests |
| `src/engine/engine.test.ts` | 17 parser, evaluator, formatter tests |
| `src/input/editor.test.ts` | 7 editor tests |
| `README.md` | Status, keyboard docs, getting started |
| `docs/PLAN.md` | Engineering plan, architecture, roadmap |

## To-Do List (Prioritised)

### High Priority
1. **Implement Fix/Sci number formats** — add submenu for digit count (0–9 for Fix, 1–10 for Sci)
2. **True LineI editor** — implement line-input mode or add explicit "not modelled" notice
3. **Wire persistence** — localStorage for lastModel, settings, history
4. **Implement remaining HOME apps** — Statistics, Table, Ratio, Math Box (or at least stubs with notices)

### Medium Priority
5. **System settings fidelity** — auto power-off timer, multi-line font scaling, QR code generation
6. **Catalog / Variable / Function / Tools menus** — implement or add notices
7. **Exam mode** — visual model or omit
8. **Complex numbers / matrices / vectors** — value variants + engines
9. **fx-991CW+ shell** — different keypad and feature flags
10. **PWA support** — offline install via vite-plugin-pwa

### Low Priority
11. **Playwright E2E suite** — click keys, assert display, visual regression
12. **Golden fixture corpus** — recorded real-device outputs for parity testing
13. **Recurring-decimal notation** — render repeating decimals
14. **Alternative calculators** — TI-30X Pro, Sharp EL-W506/W531, fx-991EX, TI-84 Plus CE
15. **Graphing core** — fx-CG50/CG100

### Code Quality / Polish
16. **Menu UI polish** — adjust row height, spacing, selected-row style, scrollbar visibility based on reference image (user has a reference photo they cannot share as image input)
17. **Add keyboard shortcuts** for SETTINGS and FORMAT (e.g. F1/F2 or dedicated keys)
18. **Input/Output decimal mode indicator** — switch LCD indicator icon for LineI
19. **Menu confirmation dialogs** — real Casio asks before Reset Settings / Initialize All
20. **Show Option Num effect on HOME** — currently only affects menu rows

## Known Limitations (Documented)

- Exact-symbolic scope: one surd term only, no symbolic sums, no exact `sin` outside standard angles
- Display: 4-gradation grey via CSS colours; per-pixel greyscale is a later upgrade
- No official fonts or logos; bitmap font is Adafruit GFX 5×7 (BSD-2-Clause)
- Shell is CSS-drawn from measured proportions, not a product photo
- `localStorage` persistence is planned but not yet wired
- Menu UI is an approximation; user has a reference image they cannot share via this interface

## Test Commands

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest (50 cases)
npm run build      # type-check + production build
```

## Git History

| Commit | Description |
|--------|-------------|
| `b8eeb10` | Add CW+ SETTINGS/FORMAT menu system |
| `e658470` | Rebuild the CW+ UI to match the black 2nd-edition hardware |
| `2ad8637` | Rewrite plan and implement first simulator slice |
| `3df05bd` | Add calculator simulator plan and README |
