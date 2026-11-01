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
- SETTINGS menu with Calc Settings, System Settings, Reset and Get Started pages
- Calc settings for angle unit, fraction result, decimal mark, digit separator, input/output decimal mode and the ×10ˣ key
- Configurable FORMAT key, plus a FORMAT menu for standard, decimal, improper and mixed-number results
- Unit tests for engine, editor and key handling

Partially modelled: Input/Output line modes (the setting is stored and decimal-output modes work, but the editor remains MathI), Number Format currently offers Norm 1/Norm 2 (Fix/Sci are not yet selectable), and some system settings are stored preferences rather than hardware behaviours. Statistics, Table, Ratio and Math Box, variable/function/catalog/tools menus, matrix/complex apps, exam mode and PWA install are not implemented.

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
| `Enter` / `=` | evaluate (EXE) or select a menu item |
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
| arrows | move the cursor, the HOME selection, or the menu selection |
| `Escape` / `AC` | leave the current menu (or clear a calculation) |
| `PageUp` / `PageDown` | page the HOME selection or menu |

On-screen **SETTINGS** and **FORMAT** keys open the menus; use the arrow keys and OK/AC to navigate. With the default FORMAT Key setting, SHIFT + FORMAT opens the FORMAT menu.

## Licence

Code: MIT (see [`LICENSE`](LICENSE)).
Bitmap font: BSD-2-Clause, see [`NOTICE.md`](NOTICE.md).


## Deployment

The production site is hosted on Cloudflare Pages at https://calculator-simulator.pages.dev. The `main` branch is connected for automatic production deployments. Cloudflare builds the app with `npm run build` and publishes the `dist` directory.
