import { CalcError } from './errors';
import { exactRational, rationalFromLiteral, type Value } from './values';

export type Expr =
  | { type: 'number'; value: Value }
  | { type: 'const'; name: 'π' | 'e' | 'Ans' | 'PreAns' }
  | { type: 'binary'; op: '+' | '-' | '*' | '/' | '^'; left: Expr; right: Expr }
  | { type: 'unary'; op: '-' | '+' | '%'; arg: Expr }
  | { type: 'call'; name: string; arg: Expr };

const FUNCTIONS = new Set([
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'log',
  'ln',
  'exp',
  'sqrt',
  'cbrt',
  'abs',
]);

const CONSTANTS = new Set(['e', 'Ans', 'PreAns']);

type Token =
  | { kind: 'num'; text: string }
  | { kind: 'name'; text: string }
  | { kind: 'sym'; text: string };

function normaliseSource(source: string): string {
  return source
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/·/g, '*');
}

function tokenize(source: string): Token[] {
  const s = normaliseSource(source);
  const tokens: Token[] = [];
  let i = 0;

  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i + 1;
      while (j < s.length && /[0-9.]/.test(s[j])) j += 1;
      const text = s.slice(i, j);
      if (text === '.' || (text.match(/\./g)?.length ?? 0) > 1) {
        throw new CalcError('Syntax ERROR');
      }
      tokens.push({ kind: 'num', text });
      i = j;
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      let j = i + 1;
      while (j < s.length && /[A-Za-z]/.test(s[j])) j += 1;
      tokens.push({ kind: 'name', text: s.slice(i, j) });
      i = j;
      continue;
    }
    if ('+-*/^(),√π%'.includes(ch)) {
      tokens.push({ kind: 'sym', text: ch });
      i += 1;
      continue;
    }
    throw new CalcError('Syntax ERROR');
  }

  return insertImplicitMultiplication(tokens);
}

function isValueEnd(token: Token): boolean {
  if (token.kind === 'num') return true;
  if (token.kind === 'name') return !FUNCTIONS.has(token.text);
  return token.text === ')' || token.text === 'π' || token.text === '%';
}

function isValueStart(token: Token): boolean {
  if (token.kind === 'num') return true;
  if (token.kind === 'name') return true;
  return token.text === '(' || token.text === '√' || token.text === 'π';
}

function insertImplicitMultiplication(tokens: Token[]): Token[] {
  const out: Token[] = [];
  for (const token of tokens) {
    const previous = out[out.length - 1];
    if (previous && isValueEnd(previous) && isValueStart(token)) {
      out.push({ kind: 'sym', text: '*' });
    }
    out.push(token);
  }
  return out;
}

class Parser {
  private pos = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): Expr {
    if (this.tokens.length === 0) throw new CalcError('Syntax ERROR');
    const expr = this.parseAdditive();
    if (this.pos !== this.tokens.length) throw new CalcError('Syntax ERROR');
    return expr;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private next(): Token {
    const token = this.tokens[this.pos];
    if (!token) throw new CalcError('Syntax ERROR');
    this.pos += 1;
    return token;
  }

  private expectSymbol(text: string): void {
    const token = this.next();
    if (token.kind !== 'sym' || token.text !== text) throw new CalcError('Syntax ERROR');
  }

  private parseAdditive(): Expr {
    let left = this.parseMultiplicative();
    for (;;) {
      const token = this.peek();
      if (token?.kind !== 'sym' || (token.text !== '+' && token.text !== '-')) return left;
      this.next();
      const op = token.text as '+' | '-';
      left = { type: 'binary', op, left, right: this.parseMultiplicative() };
    }
  }

  private parseMultiplicative(): Expr {
    let left = this.parseUnary();
    for (;;) {
      const token = this.peek();
      if (token?.kind !== 'sym' || (token.text !== '*' && token.text !== '/')) return left;
      this.next();
      const op = token.text as '*' | '/';
      left = { type: 'binary', op, left, right: this.parseUnary() };
    }
  }

  private parseUnary(): Expr {
    const token = this.peek();
    if (token?.kind === 'sym' && (token.text === '-' || token.text === '+')) {
      this.next();
      const arg = this.parseUnary();
      return token.text === '-' ? { type: 'unary', op: '-', arg } : arg;
    }
    return this.parsePower();
  }

  private parsePower(): Expr {
    const base = this.parsePostfix();
    const token = this.peek();
    if (token?.kind === 'sym' && token.text === '^') {
      this.next();
      // Right-associative, and unary minus binds to the exponent: 2^-3.
      return { type: 'binary', op: '^', left: base, right: this.parseUnary() };
    }
    return base;
  }
  private parsePostfix(): Expr {
    let node = this.parsePrimary();
    for (;;) {
      const token = this.peek();
      if (token?.kind !== 'sym' || token.text !== '%') return node;
      this.next();
      node = { type: 'unary', op: '%', arg: node };
    }
  }

  private parsePrimary(): Expr {
    const token = this.next();

    if (token.kind === 'num') {
      const r = rationalFromLiteral(token.text);
      return { type: 'number', value: exactRational(r.n, r.d) };
    }

    if (token.kind === 'name') {
      if (FUNCTIONS.has(token.text)) {
        let arg: Expr;
        const nextToken = this.peek();
        if (nextToken?.kind === 'sym' && nextToken.text === '(') {
          this.next();
          arg = this.parseAdditive();
          this.expectSymbol(')');
        } else {
          arg = this.parseUnary();
        }
        return { type: 'call', name: token.text, arg };
      }
      if (CONSTANTS.has(token.text)) {
        return { type: 'const', name: token.text as 'e' | 'Ans' | 'PreAns' };
      }
      throw new CalcError('Syntax ERROR');
    }

    if (token.text === '(') {
      const expr = this.parseAdditive();
      this.expectSymbol(')');
      return expr;
    }

    if (token.text === '√') {
      return { type: 'call', name: 'sqrt', arg: this.parseUnary() };
    }

    if (token.text === 'π') {
      return { type: 'const', name: 'π' };
    }

    throw new CalcError('Syntax ERROR');
  }
}

export function parse(source: string): Expr {
  return new Parser(tokenize(source)).parse();
}

/** Casio closes unmatched parentheses when `=` is pressed. */
export function autoCloseParentheses(source: string): string {
  let depth = 0;
  for (const ch of source) {
    if (ch === '(') depth += 1;
    if (ch === ')') {
      depth -= 1;
      if (depth < 0) throw new CalcError('Syntax ERROR');
    }
  }
  return depth > 0 ? source + ')'.repeat(depth) : source;
}
