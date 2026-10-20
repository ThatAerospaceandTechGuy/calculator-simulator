import Decimal from 'decimal.js';
import { CalcError } from './errors';

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type AngleUnit = 'DEG' | 'RAD' | 'GRA';

export interface Rational {
  /** Numerator. Negative values carry the sign. */
  n: bigint;
  /** Denominator. Always > 0. */
  d: bigint;
}

export type Exact =
  | { kind: 'rational'; r: Rational }
  /** c·√rad, where rad is square-free and > 1. */
  | { kind: 'surd'; c: Rational; rad: bigint }
  /** c·π. */
  | { kind: 'pi'; c: Rational };

export type Value =
  | { kind: 'exact'; exact: Exact }
  | { kind: 'decimal'; dec: Decimal };

/** π to 50 digits; more than enough for 40-digit working precision. */
export const PI = new Decimal(
  '3.1415926535897932384626433832795028841971693993751',
);

export const ZERO: Value = { kind: 'exact', exact: { kind: 'rational', r: { n: 0n, d: 1n } } };
export const ONE: Value = { kind: 'exact', exact: { kind: 'rational', r: { n: 1n, d: 1n } } };

function absBig(x: bigint): bigint {
  return x < 0n ? -x : x;
}

export function gcd(a: bigint, b: bigint): bigint {
  let x = absBig(a);
  let y = absBig(b);
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

export function rational(n: bigint, d: bigint = 1n): Rational {
  if (d === 0n) throw new CalcError('Math ERROR');
  let num = n;
  let den = d;
  if (den < 0n) {
    num = -num;
    den = -den;
  }
  const g = gcd(num, den);
  if (g > 1n) {
    num /= g;
    den /= g;
  }
  return { n: num, d: den };
}

export function rat(n: number | bigint, d: number | bigint = 1n): Rational {
  return rational(BigInt(n), BigInt(d));
}

function radd(a: Rational, b: Rational): Rational {
  return rational(a.n * b.d + b.n * a.d, a.d * b.d);
}

function rmul(a: Rational, b: Rational): Rational {
  return rational(a.n * b.n, a.d * b.d);
}

function rdiv(a: Rational, b: Rational): Rational {
  if (b.n === 0n) throw new CalcError('Math ERROR');
  return rational(a.n * b.d, a.d * b.n);
}

function rpow(a: Rational, k: bigint): Rational {
  if (k === 0n) return rational(1n);
  if (k < 0n) return rpow(rational(a.d, a.n), -k);
  return rational(a.n ** k, a.d ** k);
}

function isqrt(n: bigint): bigint {
  if (n < 2n) return n;
  let x = n;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + n / x) / 2n;
  }
  return x;
}

function decimalOfRat(r: Rational): Decimal {
  return new Decimal(r.n.toString()).div(r.d.toString());
}

function decimalOfValue(v: Value): Decimal {
  if (v.kind === 'decimal') return v.dec;
  const e = v.exact;
  switch (e.kind) {
    case 'rational':
      return decimalOfRat(e.r);
    case 'surd':
      return decimalOfRat(e.c).times(new Decimal(e.rad.toString()).sqrt());
    case 'pi':
      return decimalOfRat(e.c).times(PI);
  }
}

export function exactRational(n: bigint | number, d: bigint | number = 1n): Value {
  return { kind: 'exact', exact: { kind: 'rational', r: rational(BigInt(n), BigInt(d)) } };
}

export function exactPi(c: Rational): Value {
  if (c.n === 0n) return ZERO;
  return { kind: 'exact', exact: { kind: 'pi', c } };
}

/**
 * c·√rad with the radicand reduced. Square factors up to 1000² are pulled out;
 * a remaining perfect square is detected with an integer square root.
 */
export function exactSurd(c: Rational, rad: bigint): Value {
  if (c.n === 0n) return ZERO;
  if (rad <= 0n) throw new CalcError('Math ERROR');
  if (rad === 1n) return exactRational(c.n, c.d);

  let r = rad;
  let outside = 1n;
  for (let p = 2n; p <= 1000n && p * p <= r; p += 1n) {
    while (r % (p * p) === 0n) {
      r /= p * p;
      outside *= p;
    }
  }
  const s = isqrt(r);
  if (s * s === r) {
    outside *= s;
    r = 1n;
  }

  const coef = rmul(c, rational(outside));
  if (r === 1n) return exactRational(coef.n, coef.d);
  return { kind: 'exact', exact: { kind: 'surd', c: coef, rad: r } };
}

export function decimalValue(d: Decimal | number | string): Value {
  const value = d instanceof Decimal ? d : new Decimal(d);
  if (value.isZero()) return ZERO;
  return { kind: 'decimal', dec: value };
}

/** Parses a decimal literal without losing exactness: "0.25" → 1/4. */
export function rationalFromLiteral(text: string): Rational {
  if (!text.includes('.')) return rational(BigInt(text || '0'));
  const [whole, fraction = ''] = text.split('.');
  const digits = `${whole || '0'}${fraction}`;
  return rational(BigInt(digits || '0'), 10n ** BigInt(fraction.length));
}

export function toDecimal(v: Value): Decimal {
  return decimalOfValue(v);
}

export function asExact(v: Value): Exact | null {
  return v.kind === 'exact' ? v.exact : null;
}

export function isZero(v: Value): boolean {
  return v.kind === 'exact'
    ? v.exact.kind === 'rational'
      ? v.exact.r.n === 0n
      : v.exact.c.n === 0n
    : v.dec.isZero();
}

export function neg(v: Value): Value {
  if (v.kind === 'decimal') return decimalValue(v.dec.neg());
  const e = v.exact;
  switch (e.kind) {
    case 'rational':
      return exactRational(-e.r.n, e.r.d);
    case 'surd':
      return exactSurd(rational(-e.c.n, e.c.d), e.rad);
    case 'pi':
      return exactPi(rational(-e.c.n, e.c.d));
  }
}

export function add(a: Value, b: Value): Value {
  const ea = asExact(a);
  const eb = asExact(b);
  if (!ea || !eb) return decimalValue(toDecimal(a).plus(toDecimal(b)));

  if (ea.kind === 'rational' && eb.kind === 'rational') {
    const r = radd(ea.r, eb.r);
    return exactRational(r.n, r.d);
  }
  if (ea.kind === 'surd' && eb.kind === 'surd' && ea.rad === eb.rad) {
    const c = radd(ea.c, eb.c);
    return exactSurd(c, ea.rad);
  }
  if (ea.kind === 'pi' && eb.kind === 'pi') {
    return exactPi(radd(ea.c, eb.c));
  }
  return decimalValue(toDecimal(a).plus(toDecimal(b)));
}

export function sub(a: Value, b: Value): Value {
  return add(a, neg(b));
}

export function mul(a: Value, b: Value): Value {
  const ea = asExact(a);
  const eb = asExact(b);
  if (!ea || !eb) return decimalValue(toDecimal(a).times(toDecimal(b)));

  if (ea.kind === 'rational' && eb.kind === 'rational') {
    return exactRational(rmul(ea.r, eb.r).n, rmul(ea.r, eb.r).d);
  }
  if (ea.kind === 'rational' && eb.kind === 'surd') {
    return exactSurd(rmul(ea.r, eb.c), eb.rad);
  }
  if (ea.kind === 'surd' && eb.kind === 'rational') {
    return exactSurd(rmul(ea.c, eb.r), ea.rad);
  }
  if (ea.kind === 'surd' && eb.kind === 'surd') {
    return exactSurd(rmul(ea.c, eb.c), ea.rad * eb.rad);
  }
  if (ea.kind === 'rational' && eb.kind === 'pi') {
    return exactPi(rmul(ea.r, eb.c));
  }
  if (ea.kind === 'pi' && eb.kind === 'rational') {
    return exactPi(rmul(ea.c, eb.r));
  }
  return decimalValue(toDecimal(a).times(toDecimal(b)));
}

export function div(a: Value, b: Value): Value {
  if (isZero(b)) throw new CalcError('Math ERROR');
  const ea = asExact(a);
  const eb = asExact(b);
  if (!ea || !eb) return decimalValue(toDecimal(a).div(toDecimal(b)));

  if (ea.kind === 'rational' && eb.kind === 'rational') {
    const r = rdiv(ea.r, eb.r);
    return exactRational(r.n, r.d);
  }
  if (ea.kind === 'rational' && eb.kind === 'surd') {
    // c / (c₂√r) = c / (c₂·r) · √r
    const coef = rdiv(ea.r, rmul(eb.c, rational(eb.rad)));
    return exactSurd(coef, eb.rad);
  }
  if (ea.kind === 'surd' && eb.kind === 'rational') {
    return exactSurd(rdiv(ea.c, eb.r), ea.rad);
  }
  if (ea.kind === 'surd' && eb.kind === 'surd') {
    // (c₁√r₁)/(c₂√r₂) = c₁/(c₂·r₂) · √(r₁·r₂)
    const coef = rdiv(ea.c, rmul(eb.c, rational(eb.rad)));
    return exactSurd(coef, ea.rad * eb.rad);
  }
  if (ea.kind === 'pi' && eb.kind === 'rational') {
    return exactPi(rdiv(ea.c, eb.r));
  }
  if (ea.kind === 'pi' && eb.kind === 'pi') {
    const r = rdiv(ea.c, eb.c);
    return exactRational(r.n, r.d);
  }
  return decimalValue(toDecimal(a).div(toDecimal(b)));
}

export function pow(a: Value, b: Value): Value {
  const eb = asExact(b);
  if (eb && eb.kind === 'rational' && eb.r.d === 1n) {
    const k = eb.r.n;
    if (k > 1000n || k < -1000n) throw new CalcError('Math ERROR');
    if (isZero(a)) {
      if (k === 0n) throw new CalcError('Math ERROR');
      if (k < 0n) throw new CalcError('Math ERROR');
      return ZERO;
    }
    const ea = asExact(a);
    if (ea) {
      if (ea.kind === 'rational') {
        const r = rpow(ea.r, k);
        return exactRational(r.n, r.d);
      }
      if (ea.kind === 'surd') {
        if (k === 0n) return ONE;
        const c = rpow(ea.c, k);
        if (k % 2n === 0n) {
          const outside = ea.rad ** (k / 2n);
          return exactRational(c.n * outside, c.d);
        }
        const coef = rmul(c, rational(ea.rad ** ((k - 1n) / 2n)));
        return exactSurd(coef, ea.rad);
      }
      if (ea.kind === 'pi') {
        if (k === 0n) return ONE;
        if (k === 1n) return a;
        return decimalValue(toDecimal(a).pow(toDecimal(b)));
      }
    }
  }
  if (eb && eb.kind === 'rational' && eb.r.n === 1n && eb.r.d === 2n) {
    return sqrt(a);
  }

  const base = toDecimal(a);
  const result = base.pow(toDecimal(b));
  if (result.isNaN() || !result.isFinite()) throw new CalcError('Math ERROR');
  return decimalValue(result);
}

export function sqrt(v: Value): Value {
  if (v.kind === 'decimal') {
    if (v.dec.isNegative()) throw new CalcError('Math ERROR');
    return decimalValue(v.dec.sqrt());
  }
  const e = v.exact;
  if (e.kind === 'rational') {
    if (e.r.n < 0n) throw new CalcError('Math ERROR');
    // √(n/d) = √(n·d)/d
    return exactSurd(rational(1n, e.r.d), e.r.n * e.r.d);
  }
  if (e.kind === 'surd' && e.c.n < 0n) throw new CalcError('Math ERROR');
  // √(c√r) is not representable in this value layer.
  return decimalValue(decimalOfValue(v).sqrt());
}

export function abs(v: Value): Value {
  if (v.kind === 'decimal') return decimalValue(v.dec.abs());
  const e = v.exact;
  const negative = e.kind === 'rational' ? e.r.n < 0n : e.c.n < 0n;
  return negative ? neg(v) : v;
}

export function factorial(v: Value): Value {
  const e = asExact(v);
  if (!e || e.kind !== 'rational' || e.r.d !== 1n || e.r.n < 0n) {
    throw new CalcError('Math ERROR');
  }
  const n = e.r.n;
  if (n > 69n) throw new CalcError('Math ERROR');
  let result = 1n;
  for (let i = 2n; i <= n; i += 1n) result *= i;
  return exactRational(result);
}

export function isInteger(v: Value): boolean {
  return asInteger(v) !== null;
}

export function asInteger(v: Value): bigint | null {
  if (v.kind !== 'exact') return null;
  const e = v.exact;
  return e.kind === 'rational' && e.r.d === 1n ? e.r.n : null;
}

/** Normalises arbitrary radians/degrees input into the current angle unit. */
export function fromRadians(radians: Decimal, unit: AngleUnit): Decimal {
  switch (unit) {
    case 'DEG':
      return radians.times(180).div(PI);
    case 'GRA':
      return radians.times(200).div(PI);
    case 'RAD':
      return radians;
  }
}

export function toRadians(value: Decimal, unit: AngleUnit): Decimal {
  switch (unit) {
    case 'DEG':
      return value.times(PI).div(180);
    case 'GRA':
      return value.times(PI).div(200);
    case 'RAD':
      return value;
  }
}
