# Calculator Simulator

A web app that replicates approved GCSE / A-level calculators. Pick a calculator, then use a pixel-faithful, fully functional replica — same layout, keys, display and behaviour.

> This is an **unofficial, educational** project. It is not affiliated with, endorsed by, or connected to Casio, Texas Instruments, Sharp, or any exam board. Product names are used only to describe compatibility.

## Status

Early vertical slice. Working:

- Exact-value engine (rationals, surds, π, decimal fallback)
- Recursive-descent parser and evaluator with DEG/RAD/GRA
- Tree-based MathI/O editor with fraction and radical templates
- Dot-matrix display renderer (192 × 63)
- Black CW+ 2nd-edition shell with a six-column function grid and five-column number pad
- HOME menu with Calculate, Statistics, Table, Ratio and Math Box tiles
- fx-83GT CW+ and fx-85GT CW+ specs (the 85 adds solar)
- FORMAT key toggling standard/decimal results
- Unit tests for engine, editor and key handling

Not yet implemented: the full SETTINGS menu (the key currently cycles the angle unit), statistics/table/ratio/math-box apps, variable/function/catalog/tools menus, matrix/complex apps, exam mode and PWA install.

See [`docs/PLAN.md`](docs/PLAN.md) for the design and the corrected technical decisions.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest
npm run build      # type-check + production build
```

## Keyboard

| Key | Action |
|---|---|
| `0`–`9`, `.` | digits |
| `+ - * / ^ ( )` | operators |
| `Enter` / `=` | evaluate (EXE) |
| `Backspace` | DEL |
| `Escape` | AC |
| `h` | HOME |
| `s c t` | sin / cos / tan |
| `l n` | log / ln |
| `r` | √ |
| `f` | fraction |
| `p` | π |
| `a` | Ans |
| `Shift` | toggle SHIFT latch |
| arrows | move the cursor, or the HOME selection |
| `PageUp` / `PageDown` | page the HOME selection |

## Licence

Code: MIT (see [`LICENSE`](LICENSE)).
Bitmap font: BSD-2-Clause, see [`NOTICE.md`](NOTICE.md).
