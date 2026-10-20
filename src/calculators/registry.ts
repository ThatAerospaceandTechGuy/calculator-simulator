import { SPECS } from './specs';
import type { CalculatorSpec } from './types';

export { SPECS };

export function getSpec(id: string | null): CalculatorSpec | undefined {
  if (!id) return undefined;
  return SPECS.find((spec) => spec.id === id);
}

export interface UpcomingModel {
  id: string;
  model: string;
  label: string;
  exam: string;
  note: string;
}

export const UPCOMING: UpcomingModel[] = [
  {
    id: 'casio-fx-991cw-plus',
    model: 'fx-991CW+',
    label: 'ClassWiz fx-991CW+',
    exam: 'GCSE + A-level',
    note: 'Engine ready — complex, matrix, vector and distribution apps still to build.',
  },
  {
    id: 'casio-fx-cg50',
    model: 'fx-CG50',
    label: 'fx-CG50',
    exam: 'A-level',
    note: 'Graphing core not started. Scope roughly triples the project.',
  },
  {
    id: 'casio-fx-cg100',
    model: 'fx-CG100',
    label: 'fx-CG100',
    exam: 'A-level',
    note: 'Shares the graphing core with the CG50.',
  },
];
