import Decimal from 'decimal.js';
import { toDecimal, type Rational, type Value } from './values';

/** Casio's Norm display: 10 significant digits, scientific outside the range. */
const NORM_UPPER = new Decimal('1e10');
const NORM1_LOWER = new Decimal('1e-2');
const NORM2_LOWER = new Decimal('1e-9');
const DISPLAY_DIGITS = 10;

export interface FormatOptions {
  decimalMark?: 'dot' | 'comma';
  digitSeparator?: boolean;
  fractionResult?: 'improper' | 'mixed';
  numberFormat?: 'norm1' | 'norm2';
}

function groupingSeparator(options: FormatOptions): string {
  return options.decimalMark === 'comma' ? '.' : ',';
}

function decimalSeparator(options: FormatOptions): string {
  return options.decimalMark === 'comma' ? ',' : '.';
}

function groupInteger(text: string, separator: string): string {
  const negative = text.startsWith('-');
  const digits = negative ? text.slice(1) : text;
  return `${negative ? '-' : ''}${digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator)}`;
}

function formatIntegerText(n: bigint, options: FormatOptions): string {
  const text = n.toString();
  return options.digitSeparator ? groupInteger(text, groupingSeparator(options)) : text;
}

function finishDecimal(text: string, options: FormatOptions): string {
  const negative = text.startsWith('-');
  const unsigned = negative ? text.slice(1) : text;
  const [integer, fraction] = unsigned.split('.');
  const grouped = options.digitSeparator ? groupInteger(integer, groupingSeparator(options)) : integer;
  const sign = negative ? '-' : '';
  if (fraction === undefined) return `${sign}${grouped}`;
  return `${sign}${grouped}${decimalSeparator(options)}${fraction}`;
}

function trimZeros(text: string): string {
  if (!text.includes('.')) return text;
  return text.replace(/0+$/, '').replace(/\.$/, '');
}

function formatDecimal(d: Decimal, options: FormatOptions = {}): string {
  if (d.isNaN()) return 'Math ERROR';
  if (!d.isFinite()) return 'Math ERROR';
  if (d.isZero()) return '0';

  const rounded = d.toSignificantDigits(DISPLAY_DIGITS);
  const magnitude = rounded.abs();
  const lower = options.numberFormat === 'norm1' ? NORM1_LOWER : NORM2_LOWER;

  if (magnitude.gte(NORM_UPPER) || magnitude.lt(lower)) {
    const exponent = rounded.e;
    const mantissa = rounded
      .div(new Decimal(10).pow(exponent))
      .toSignificantDigits(DISPLAY_DIGITS);
    const mantissaText = trimZeros(mantissa.toFixed()).replace('.', decimalSeparator(options));
    return `${mantissaText}×10^${exponent}`;
  }

  return finishDecimal(trimZeros(rounded.toFixed()), options);
}

function formatFraction(n: bigint, d: bigint, options: FormatOptions = {}): string {
  if (d === 1n) return formatIntegerText(n, options);

  if (options.fractionResult === 'mixed' && (n > d || -n > d)) {
    const quotient = n / d;
    const remainder = n % d;
    const absRemainder = remainder < 0n ? -remainder : remainder;
    const sign = quotient < 0n ? '-' : '';
    const whole = quotient < 0n ? -quotient : quotient;
    return `${sign}${formatIntegerText(whole, options)} ${formatIntegerText(absRemainder, options)}/${formatIntegerText(d, options)}`;
  }

  return `${formatIntegerText(n, options)}/${formatIntegerText(d, options)}`;
}

function formatSurd(c: Rational, rad: bigint, options: FormatOptions = {}): string {
  const negative = c.n < 0n;
  const sign = negative ? '-' : '';
  const n = negative ? -c.n : c.n;
  const radicand = `√${rad}`;

  if (c.d === 1n) {
    if (n === 1n) return `${sign}${radicand}`;
    return `${sign}${formatIntegerText(n, options)}${radicand}`;
  }
  if (n === 1n) return `${sign}${radicand}/${formatIntegerText(c.d, options)}`;
  return `${sign}${formatIntegerText(n, options)}${radicand}/${formatIntegerText(c.d, options)}`;
}

function formatPi(c: Rational, options: FormatOptions = {}): string {
  const negative = c.n < 0n;
  const sign = negative ? '-' : '';
  const n = negative ? -c.n : c.n;

  if (c.d === 1n) {
    if (n === 1n) return `${sign}π`;
    return `${sign}${formatIntegerText(n, options)}π`;
  }
  if (n === 1n) return `${sign}π/${formatIntegerText(c.d, options)}`;
  return `${sign}${formatIntegerText(n, options)}π/${formatIntegerText(c.d, options)}`;
}

export function formatValue(value: Value, options: FormatOptions = {}): string {
  if (value.kind === 'decimal') return formatDecimal(value.dec, options);

  const exact = value.exact;
  switch (exact.kind) {
    case 'rational': {
      // Norm applies to exact integers/fractions too: 10^10 becomes 1×10^10.
      const decimal = toDecimal(value);
      const magnitude = decimal.abs();
      const lower = options.numberFormat === 'norm1' ? NORM1_LOWER : NORM2_LOWER;
      if (magnitude.gte(NORM_UPPER) || magnitude.lt(lower)) {
        return formatDecimal(decimal, options);
      }
      return formatFraction(exact.r.n, exact.r.d, options);
    }
    case 'surd':
      return formatSurd(exact.c, exact.rad, options);
    case 'pi':
      return formatPi(exact.c, options);
  }
}

/** Decimal value of an exact result, used for the S⇔D style toggle. */
export function decimalText(value: Value, options: FormatOptions = {}): string {
  return formatDecimal(toDecimal(value), options);
}
