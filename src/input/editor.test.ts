import { describe, expect, it } from 'vitest';
import {
  backspace,
  createCursor,
  insertAtom,
  insertNumber,
  insertTemplate,
  move,
  serialize,
  type Cursor,
  type Node,
} from './nodes';

function typeInto(nodes: Node[], cursor: Cursor, text: string): { nodes: Node[]; cursor: Cursor } {
  let current = { nodes, cursor };
  for (const ch of text) {
    const next = insertNumber(current.nodes, current.cursor, ch);
    if (!next) throw new Error(`could not type ${ch}`);
    current = next;
  }
  return current;
}

describe('input editor', () => {
  it('merges digits into a number literal', () => {
    const result = typeInto([], createCursor(), '12');
    expect(serialize(result.nodes)).toBe('12');
    expect(result.cursor).toEqual({ path: [], index: 1 });
  });

  it('builds a fraction template and moves into the denominator', () => {
    let result = insertTemplate([], createCursor(), 'frac');
    result = typeInto(result.nodes, result.cursor, '1');
    const moved = { nodes: result.nodes, cursor: move(result.nodes, result.cursor, 'down') };
    result = typeInto(moved.nodes, moved.cursor, '2');

    expect(serialize(result.nodes)).toBe('(1)/(2)');
    expect(result.cursor.path).toEqual([{ at: 0, slot: 'den' }]);
    expect(result.cursor.index).toBe(1);
  });

  it('builds a radical template', () => {
    let result = insertTemplate([], createCursor(), 'sqrt');
    result = typeInto(result.nodes, result.cursor, '2');
    expect(serialize(result.nodes)).toBe('√(2)');
  });

  it('deletes a template from the start of its numerator', () => {
    const result = insertTemplate([], createCursor(), 'frac');
    const after = backspace(result.nodes, result.cursor);
    expect(after.nodes).toEqual([]);
    expect(after.cursor).toEqual({ path: [], index: 0 });
  });

  it('deletes one character from a number before removing the node', () => {
    const typed = typeInto([], createCursor(), '12');
    const once = backspace(typed.nodes, typed.cursor);
    expect(serialize(once.nodes)).toBe('1');
    const twice = backspace(once.nodes, once.cursor);
    expect(serialize(twice.nodes)).toBe('');
  });

  it('walks out of a template with the arrow keys', () => {
    let result = insertTemplate([], createCursor(), 'frac');
    result = typeInto(result.nodes, result.cursor, '1');
    const moved = { nodes: result.nodes, cursor: move(result.nodes, result.cursor, 'down') };
    result = typeInto(moved.nodes, moved.cursor, '2');

    // At the end of the denominator, right exits after the fraction.
    const afterRight = move(result.nodes, result.cursor, 'right');
    expect(afterRight).toEqual({ path: [], index: 1 });

    // Left from outside goes before the fraction.
    expect(move(result.nodes, afterRight, 'left')).toEqual({ path: [], index: 0 });
  });

  it('inserts atoms and merges following digits as a new literal', () => {
    const pi = insertAtom([], createCursor(), 'π');
    const result = typeInto(pi.nodes, pi.cursor, '2');
    expect(serialize(result.nodes)).toBe('π2');
  });
});
