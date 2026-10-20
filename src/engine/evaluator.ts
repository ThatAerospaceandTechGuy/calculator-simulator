import Decimal from 'decimal.js';
import { CalcError } from './errors';
import type { Expr } from './parser';
import {
  abs,
  add,
  decimalValue,
  div,
  exactPi,
  exactRational,
  exactSurd,
  factorial,
  fromRadians,
  isZero,
  mul,
  neg,
  pow,
  rat,
  sqrt,
  sub,
  toDecimal,
  toRadians,
  type AngleUnit,
  type Rational,
  type Value,
} from './values';

export interface EvalContext {
  ans: Value;
  preAns: Value;
  angleUnit: AngleUnit;
}

const SIN_TABLE = new Map<number, Value>([
  [0, exactRational(0n)],
  [30, exactRational(1n, 2n)],
  [45, exactSurd(rat(1n, 2n), 2n)],
  [60, exactSurd(rat(1n, 2n), 3n)],
  [90, exactRational(1n)],
  [120, exactSurd(rat(1n, 2n), 3n)],
  [135, exactSurd(rat(1n, 2n), 2n)],
  [150, exactRational(1n, 2n)],
  [180, exactRational(0n)],
  [210, exactRational(-1n, 2n)],
  [225, exactSurd(rat(-1n, 2n), 2n)],
  [240, exactSurd(rat(-1n, 2n), 3n)],
  [270, exactRational(-1n)],
  [300, exactSurd(rat(-1n, 2n), 3n)],
  [315, exactSurd(rat(-1n, 2n), 2n)],
  [330, exactRational(-1n, 2n)],
]);

/** Exact angle in degrees, when the value can be interpreted that way. */
function exactDegrees(value: Value, unit: AngleUnit): Rational | null {
  if (value.kind !== 'exact') return null;
  const e = value.exact;
  if (unit === 'DEG' && e.kind === 'rational') return e.r;
  if (unit === 'GRA' && e.kind === 'rational') return rat(e.r.n * 9n, e.r.d * 10n);
  if (unit === 'RAD' && e.kind === 'pi') return rat(e.c.n * 180n, e.c.d);
  return null;
}

function tableKey(degrees: Rational): number | null {
  if (degrees.d !== 1n) return null;
  const mod = Number(((degrees.n % 360n) + 360n) % 360n);
  return mod;
}

function sinExact(degrees: Rational): Value | null {
  const key = tableKey(degrees);
  if (key === null) return null;
  return SIN_TABLE.get(key) ?? null;
}

function cosExact(degrees: Rational): Value | null {
  return sinExact(rat(degrees.n + 90n * degrees.d, degrees.d));
}

function tanExact(degrees: Rational): Value | null {
  const sin = sinExact(degrees);
  const cos = cosExact(degrees);
  if (!sin || !cos) return null;
  if (isZero(cos)) throw new CalcError('Math ERROR');
  return div(sin, cos);
}

function trigFallback(value: Value, unit: AngleUnit, fn: 'sin' | 'cos' | 'tan'): Value {
  const radians = toRadians(toDecimal(value), unit);
  if (fn === 'sin') return decimalValue(radians.sin());
  if (fn === 'cos') return decimalValue(radians.cos());
  if (radians.cos().abs().lt('1e-30')) throw new CalcError('Math ERROR');
  return decimalValue(radians.tan());
}

function inverseTrig(value: Value, unit: AngleUnit, fn: 'asin' | 'acos' | 'atan'): Value {
  const d = toDecimal(value);
  let result: Decimal;
  if (fn === 'asin') {
    if (d.abs().gt(1)) throw new CalcError('Math ERROR');
    result = d.asin();
  } else if (fn === 'acos') {
    if (d.abs().gt(1)) throw new CalcError('Math ERROR');
    result = d.acos();
  } else {
    result = d.atan();
  }
  return decimalValue(fromRadians(result, unit));
}

function log10(value: Value): Value {
  const decimal = toDecimal(value);
  if (decimal.lte(0)) throw new CalcError('Math ERROR');
  if (value.kind === 'exact' && value.exact.kind === 'rational') {
    const r = value.exact.r;
    for (let k = -15n; k <= 15n; k += 1n) {
      const power = k >= 0n ? rat(10n ** k) : rat(1n, 10n ** -k);
      if (power.n === r.n && power.d === r.d) return exactRational(k);
    }
  }
  return decimalValue(decimal.log(10));
}

function naturalLog(value: Value): Value {
  const d = toDecimal(value);
  if (d.lte(0)) throw new CalcError('Math ERROR');
  if (value.kind === 'exact' && value.exact.kind === 'rational') {
    const r = value.exact.r;
    if (r.n === 1n && r.d === 1n) return exactRational(0n);
  }
  return decimalValue(d.ln());
}

function cubeRoot(value: Value): Value {
  const d = toDecimal(value);
  if (d.isZero()) return exactRational(0n);
  const third = new Decimal(1).div(3);
  const magnitude = d.abs().pow(third);
  const result = d.isNegative() ? magnitude.neg() : magnitude;
  return decimalValue(result);
}

export function evaluate(expr: Expr, ctx: EvalContext): Value {
  switch (expr.type) {
    case 'number':
      return expr.value;
    case 'const': {
      switch (expr.name) {
        case 'π':
          return exactPi(rat(1n));
        case 'e':
          return decimalValue(new Decimal(1).exp());
        case 'Ans':
          return ctx.ans;
        case 'PreAns':
          return ctx.preAns;
      }
      break;
    }
    case 'unary': {
      if (expr.op === '-') return neg(evaluate(expr.arg, ctx));
      if (expr.op === '+') return evaluate(expr.arg, ctx);
      // Postfix percent.
      return div(evaluate(expr.arg, ctx), exactRational(100n));
    }
    case 'binary': {
      const left = evaluate(expr.left, ctx);
      const right = evaluate(expr.right, ctx);
      switch (expr.op) {
        case '+':
          return add(left, right);
        case '-':
          return sub(left, right);
        case '*':
          return mul(left, right);
        case '/':
          return div(left, right);
        case '^':
          return pow(left, right);
      }
      break;
    }
    case 'call': {
      const arg = evaluate(expr.arg, ctx);
      switch (expr.name) {
        case 'sin':
        case 'cos':
        case 'tan': {
          const degrees = exactDegrees(arg, ctx.angleUnit);
          if (degrees) {
            const exact =
              expr.name === 'sin'
                ? sinExact(degrees)
                : expr.name === 'cos'
                  ? cosExact(degrees)
                  : tanExact(degrees);
            if (exact) return exact;
          }
          return trigFallback(arg, ctx.angleUnit, expr.name);
        }
        case 'asin':
        case 'acos':
        case 'atan':
          return inverseTrig(arg, ctx.angleUnit, expr.name);
        case 'log':
          return log10(arg);
        case 'ln':
          return naturalLog(arg);
        case 'exp':
          return decimalValue(toDecimal(arg).exp());
        case 'sqrt':
          return sqrt(arg);
        case 'cbrt':
          return cubeRoot(arg);
        case 'abs':
          return abs(arg);
        case 'fact':
          return factorial(arg);
      }
      break;
    }
  }
  throw new CalcError('Syntax ERROR');
}
