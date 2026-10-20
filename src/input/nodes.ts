/**
 * MathI/O input is a tree with a cursor that can sit inside nested templates.
 * Everything here is pure: functions take a tree and return a new tree.
 */

export type Slot = 'num' | 'den' | 'radicand';

export type Node =
  | { kind: 'number'; text: string }
  | { kind: 'atom'; text: string }
  | { kind: 'op'; text: string }
  | { kind: 'frac'; num: Node[]; den: Node[] }
  | { kind: 'sqrt'; radicand: Node[] };

export interface PathStep {
  at: number;
  slot: Slot;
}

export type ListPath = PathStep[];

export interface Cursor {
  path: ListPath;
  index: number;
}

export interface EditResult {
  nodes: Node[];
  cursor: Cursor;
}

export const MAX_DIGITS = 15;

export function createCursor(): Cursor {
  return { path: [], index: 0 };
}

export function isEmpty(nodes: Node[]): boolean {
  return nodes.length === 0;
}

export function getList(nodes: Node[], path: ListPath): Node[] {
  let list = nodes;
  for (const step of path) {
    const node = list[step.at];
    if (!node) throw new Error('cursor path is stale');
    if (node.kind === 'frac') {
      list = step.slot === 'den' ? node.den : node.num;
    } else if (node.kind === 'sqrt') {
      list = node.radicand;
    } else {
      throw new Error('cursor path does not point at a template');
    }
  }
  return list;
}

export function updateList(
  nodes: Node[],
  path: ListPath,
  updater: (list: Node[]) => Node[],
): Node[] {
  if (path.length === 0) return updater(nodes);
  const [step, ...rest] = path;
  return nodes.map((node, index) => {
    if (index !== step.at) return node;
    if (node.kind === 'frac') {
      if (step.slot === 'den') {
        return { ...node, den: updateList(node.den, rest, updater) };
      }
      return { ...node, num: updateList(node.num, rest, updater) };
    }
    if (node.kind === 'sqrt') {
      return { ...node, radicand: updateList(node.radicand, rest, updater) };
    }
    return node;
  });
}

function insertAt(nodes: Node[], path: ListPath, index: number, items: Node[]): Node[] {
  return updateList(nodes, path, (list) => [
    ...list.slice(0, index),
    ...items,
    ...list.slice(index),
  ]);
}

function replaceAt(nodes: Node[], path: ListPath, index: number, item: Node): Node[] {
  return updateList(nodes, path, (list) => list.map((node, i) => (i === index ? item : node)));
}

function removeAt(nodes: Node[], path: ListPath, index: number): Node[] {
  return updateList(nodes, path, (list) => list.filter((_, i) => i !== index));
}

export function insertNumber(nodes: Node[], cursor: Cursor, ch: string): EditResult | null {
  const list = getList(nodes, cursor.path);
  const previous = cursor.index > 0 ? list[cursor.index - 1] : undefined;

  if (ch === '.') {
    if (previous?.kind === 'number') {
      if (previous.text.includes('.')) return null;
      return {
        nodes: replaceAt(nodes, cursor.path, cursor.index - 1, {
          ...previous,
          text: `${previous.text}.`,
        }),
        cursor,
      };
    }
    return {
      nodes: insertAt(nodes, cursor.path, cursor.index, [{ kind: 'number', text: '0.' }]),
      cursor: { path: cursor.path, index: cursor.index + 1 },
    };
  }

  if (previous?.kind === 'number') {
    if (previous.text.replace('.', '').length >= MAX_DIGITS) return null;
    const text = previous.text === '0' ? ch : `${previous.text}${ch}`;
    return {
      nodes: replaceAt(nodes, cursor.path, cursor.index - 1, { ...previous, text }),
      cursor,
    };
  }

  return {
    nodes: insertAt(nodes, cursor.path, cursor.index, [{ kind: 'number', text: ch }]),
    cursor: { path: cursor.path, index: cursor.index + 1 },
  };
}

export function insertAtom(nodes: Node[], cursor: Cursor, text: string): EditResult {
  return {
    nodes: insertAt(nodes, cursor.path, cursor.index, [{ kind: 'atom', text }]),
    cursor: { path: cursor.path, index: cursor.index + 1 },
  };
}

export function insertFunction(nodes: Node[], cursor: Cursor, name: string): EditResult {
  const withName = insertAtom(nodes, cursor, name);
  return insertOp(withName.nodes, withName.cursor, '(');
}

export function insertOp(nodes: Node[], cursor: Cursor, text: string): EditResult {
  return {
    nodes: insertAt(nodes, cursor.path, cursor.index, [{ kind: 'op', text }]),
    cursor: { path: cursor.path, index: cursor.index + 1 },
  };
}

export function insertTemplate(
  nodes: Node[],
  cursor: Cursor,
  kind: 'frac' | 'sqrt',
): EditResult {
  const node: Node =
    kind === 'frac' ? { kind: 'frac', num: [], den: [] } : { kind: 'sqrt', radicand: [] };
  const nodes2 = insertAt(nodes, cursor.path, cursor.index, [node]);
  return {
    nodes: nodes2,
    cursor: {
      path: [...cursor.path, { at: cursor.index, slot: kind === 'frac' ? 'num' : 'radicand' }],
      index: 0,
    },
  };
}

export function backspace(nodes: Node[], cursor: Cursor): EditResult {
  const list = getList(nodes, cursor.path);

  if (cursor.index > 0) {
    const previous = list[cursor.index - 1];
    if (previous.kind === 'number' && previous.text.length > 1) {
      return {
        nodes: replaceAt(nodes, cursor.path, cursor.index - 1, {
          ...previous,
          text: previous.text.slice(0, -1),
        }),
        cursor,
      };
    }
    return {
      nodes: removeAt(nodes, cursor.path, cursor.index - 1),
      cursor: { path: cursor.path, index: cursor.index - 1 },
    };
  }

  if (cursor.path.length > 0) {
    const last = cursor.path[cursor.path.length - 1];
    const parentPath = cursor.path.slice(0, -1);
    return {
      nodes: removeAt(nodes, parentPath, last.at),
      cursor: { path: parentPath, index: last.at },
    };
  }

  return { nodes, cursor };
}

export function move(nodes: Node[], cursor: Cursor, direction: 'left' | 'right' | 'up' | 'down'): Cursor {
  const list = getList(nodes, cursor.path);

  if (direction === 'left') {
    if (cursor.index > 0) return { path: cursor.path, index: cursor.index - 1 };
    if (cursor.path.length > 0) {
      const last = cursor.path[cursor.path.length - 1];
      return { path: cursor.path.slice(0, -1), index: last.at };
    }
    return cursor;
  }

  if (direction === 'right') {
    if (cursor.index < list.length) return { path: cursor.path, index: cursor.index + 1 };
    if (cursor.path.length > 0) {
      const last = cursor.path[cursor.path.length - 1];
      return { path: cursor.path.slice(0, -1), index: last.at + 1 };
    }
    return cursor;
  }

  if (direction === 'down') {
    const last = cursor.path[cursor.path.length - 1];
    if (last?.slot === 'num') {
      return { path: [...cursor.path.slice(0, -1), { ...last, slot: 'den' }], index: 0 };
    }
    return cursor;
  }

  const last = cursor.path[cursor.path.length - 1];
  if (last?.slot === 'den') {
    const numerator = getList(nodes, [...cursor.path.slice(0, -1), { ...last, slot: 'num' }]);
    return { path: [...cursor.path.slice(0, -1), { ...last, slot: 'num' }], index: numerator.length };
  }
  return cursor;
}

export function serialize(nodes: Node[]): string {
  return nodes.map(serializeNode).join('');
}

function serializeNode(node: Node): string {
  switch (node.kind) {
    case 'number':
    case 'atom':
    case 'op':
      return node.text;
    case 'frac':
      return `(${serialize(node.num)})/(${serialize(node.den)})`;
    case 'sqrt':
      return `√(${serialize(node.radicand)})`;
  }
}
