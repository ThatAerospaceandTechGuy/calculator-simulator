import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';
import { formatValue } from './format';
import { evaluate } from './evaluator';
import { autoCloseParentheses, parse } from './parser';
import { CalcError } from './errors';
import { ZERO, type AngleUnit } from './values';

function calc(source: string, angleUnit: AngleUnit = 'DEG'): string {
  const expr = parse(source);
  const value = evaluate(expr, { ans: ZERO, preAns: ZERO, angleUnit });
  return formatValue(value);
}

function errorCode(source: string, angleUnit: AngleUnit = 'DEG'): string {
  try {
    calc(source, angleUnit);
    return 'no error';
  } catch (error) {
    return error instanceof CalcError ? error.code : 'unexpected';
  }
}

describe('parser', () => {
  it('respects precedence and right-associative powers', () => {
    expect(calc('2+3*4')).toBe('14');
    expect(calc('2^3^2')).toBe('512');
    expect(calc('-2^2')).toBe('-4');
    expect(calc('2^-3')).toBe('1/8');
  });

  it('supports implicit multiplication', () => {
    expect(calc('2π')).toBe('2π');
    expect(calc('3(4+5)')).toBe('27');
    expect(calc('(2+3)(4)')).toBe('20');
    expect(calc('2√2')).toBe('2√2');
    expect(calc('2sin(30)')).toBe('1');
  });

  it('auto-closes parentheses', () => {
    expect(autoCloseParentheses('sin(30')).toBe('sin(30)');
    expect(calc(autoCloseParentheses('sin(30'))).toBe('1/2');
  });

  it('rejects malformed input', () => {
    expect(errorCode('2+')).toBe('Syntax ERROR');
    expect(errorCode('1.2.3')).toBe('Syntax ERROR');
    expect(errorCode('foo(2)')).toBe('Syntax ERROR');
  });
});

describe('exact arithmetic', () => {
  it('keeps fractions exact', () => {
    expect(calc('1/3')).toBe('1/3');
    expect(calc('1/3+1/6')).toBe('1/2');
    expect(calc('2/4')).toBe('1/2');
    expect(calc('3/2')).toBe('3/2');
  });

  it('normalises surds', () => {
    expect(calc('√2')).toBe('√2');
    expect(calc('√8')).toBe('2√2');
    expect(calc('√50')).toBe('5√2');
    expect(calc('1/√2')).toBe('√2/2');
    expect(calc('√2+√2')).toBe('2√2');
  });

  it('keeps π exact', () => {
    expect(calc('π')).toBe('π');
    expect(calc('2π')).toBe('2π');
    expect(calc('π/2')).toBe('π/2');
    expect(calc('3π/2')).toBe('3π/2');
  });

  it('falls back to decimals for unlike exact forms', () => {
    expect(calc('√2+√3')).toBe('3.14626437');
    expect(calc('π*π')).toBe('9.869604401');
  });
});

describe('angle units and trig', () => {
  it('uses exact standard angles in degrees', () => {
    expect(calc('sin(30)')).toBe('1/2');
    expect(calc('cos(60)')).toBe('1/2');
    expect(calc('tan(45)')).toBe('1');
    expect(calc('sin(45)')).toBe('√2/2');
    expect(calc('sin(90)')).toBe('1');
    expect(calc('sin(180)')).toBe('0');
    expect(calc('cos(180)')).toBe('-1');
  });

  it('converts radians exactly', () => {
    expect(calc('sin(π/6)', 'RAD')).toBe('1/2');
    expect(calc('cos(π/3)', 'RAD')).toBe('1/2');
    expect(calc('tan(π/4)', 'RAD')).toBe('1');
  });

  it('handles inverse trig in the current unit', () => {
    expect(calc('asin(1)')).toBe('90');
    expect(calc('acos(0)')).toBe('90');
    expect(calc('atan(1)')).toBe('45');
  });

  it('throws Math ERROR for undefined values', () => {
    expect(errorCode('tan(90)')).toBe('Math ERROR');
    expect(errorCode('asin(2)')).toBe('Math ERROR');
    expect(errorCode('√(-1)')).toBe('Math ERROR');
    expect(errorCode('1/0')).toBe('Math ERROR');
  });
});

describe('logarithms and formatting', () => {
  it('detects exact powers of ten', () => {
    expect(calc('log(1000)')).toBe('3');
    expect(calc('log(0.01)')).toBe('-2');
    expect(calc('ln(1)')).toBe('0');
  });

  it('formats decimals to 10 significant digits', () => {
    expect(calc('1/3')).toBe('1/3');
    expect(formatValue({ kind: 'decimal', dec: new Decimal(1).div(3) })).toBe('0.3333333333');
  });

  it('switches to scientific notation outside Norm1', () => {
    expect(calc('10000000000')).toBe('1×10^10');
    expect(calc('123456789012')).toBe('1.23456789×10^11');
    expect(calc('1/1000000000')).toBe('1/1000000000');
    expect(calc('1/10000000000')).toBe('1×10^-10');
  });
});
