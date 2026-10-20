import Decimal from 'decimal.js';
import { toDecimal, type Rational, type Value } from './values';

/** Casio's Norm1 display: 10 significant digits, scientific outside this range. */
const NORM1_UPPER = new Decimal('1e10');
const NORM1_LOWER = new Decimal('1e-9');
const DISPLAY_DIGITS = 10;

function trimZeros(text: string): string {
  if (!text.includes('.')) return text;
  return text.replace(/0+$/, '').replace(/\.$/, '');
}

function formatDecimal(d: Decimal): string {
  if (d.isNaN()) return 'Math ERROR';
  if (!d.isFinite()) return 'Math ERROR';
  if (d.isZero()) return '0';

  const rounded = d.toSignificantDigits(DISPLAY_DIGITS);
  const magnitude = rounded.abs();

  if (magnitude.gte(NORM1_UPPER) || magnitude.lt(NORM1_LOWER)) {
    const exponent = rounded.e;
    const mantissa = rounded.div(new Decimal(10).pow(exponent)).toSignificantDigits(DISPLAY_DIGITS);
    return `${trimZeros(mantissa.toFixed())}×10^${exponent}`;
  }

  return trimZeros(rounded.toFixed());
}

function formatFraction(n: bigint, d: bigint): string {
  return d === 1n ? n.toString() : `${n}/${d}`;
}

function formatSurd(c: Rational, rad: bigint): string {
  const negative = c.n < 0n;
  const sign = negative ? '-' : '';
  const n = negative ? -c.n : c.n;
  const radicand = `√${rad}`;

  if (c.d === 1n) {
    if (n === 1n) return `${sign}${radicand}`;
    return `${sign}${n}${radicand}`;
  }
  if (n === 1n) return `${sign}${radicand}/${c.d}`;
  return `${sign}${n}${radicand}/${c.d}`;
}

function formatPi(c: Rational): string {
  const negative = c.n < 0n;
  const sign = negative ? '-' : '';
  const n = negative ? -c.n : c.n;

  if (c.d === 1n) {
    if (n === 1n) return `${sign}π`;
    return `${sign}${n}π`;
  }
  if (n === 1n) return `${sign}π/${c.d}`;
  return `${sign}${n}π/${c.d}`;
}

export function formatValue(value: Value): string {
  if (value.kind === 'decimal') return formatDecimal(value.dec);

  const exact = value.exact;
  switch (exact.kind) {
    case 'rational': {
      // Norm1 applies to exact integers/fractions too: 10^10 becomes 1×10^10.
      const decimal = toDecimal(value);
      const magnitude = decimal.abs();
      if (magnitude.gte(NORM1_UPPER) || magnitude.lt(NORM1_LOWER)) {
        return formatDecimal(decimal);
      }
      return formatFraction(exact.r.n, exact.r.d);
    }
    case 'surd':
      return formatSurd(exact.c, exact.rad);
    case 'pi':
      return formatPi(exact.c);
  }
}

/** Decimal value of an exact result, used for the S⇔D style toggle later. */
export function decimalText(value: Value): string {
  return formatDecimal(toDecimal(value));
}
