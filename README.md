# Calculator Simulator

A web app that replicates approved GCSE / A-level calculators. Pick a calculator, then use a pixel-faithful, fully functional replica — same layout, keys, display and behaviour.

> This is an **unofficial, educational** project. It is not affiliated with, endorsed by, or connected to Casio, Texas Instruments, Sharp, or any exam board. Product names are used only to describe compatibility.

## Status

Early vertical slice. Working:

- Exact-value engine (rationals, surds, π, decimal fallback)
- Recursive-descent parser and evaluator with DEG/RAD/GRA
- Tree-based MathI/O editor with fraction and radical templates
- Dot-matrix display renderer (192 × 63)
- Selector + calculator shell + keypad
- fx-83GT CW+ and fx-85GT CW+ specs
- Unit tests for engine, editor and key handling

Not yet implemented: HOME/SETTINGS menus, statistics/table/matrix/complex apps, exam mode, PWA install, pixel-parity shell measurements.

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
| `Enter` / `=` | evaluate |
| `Backspace` | DEL |
| `Escape` | AC |
| `s c t` | sin / cos / tan |
| `l n` | log / ln |
| `r` | √ |
| `f` | fraction |
| `p` | π |
| `a` | Ans |
| `Shift` | toggle SHIFT latch |
| arrows | move input cursor |

## Licence

Code: MIT (see [`LICENSE`](LICENSE)).
Bitmap font: BSD-2-Clause, see [`NOTICE.md`](NOTICE.md).
