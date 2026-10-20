/** Error codes shown on the calculator display, matching Casio's wording. */
export type CalcErrorCode =
  | 'Math ERROR'
  | 'Syntax ERROR'
  | 'Argument ERROR'
  | 'Range ERROR'
  | 'Stack ERROR';

export class CalcError extends Error {
  constructor(public readonly code: CalcErrorCode) {
    super(code);
    this.name = 'CalcError';
  }
}
