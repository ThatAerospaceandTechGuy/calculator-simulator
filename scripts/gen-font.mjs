import fs from 'node:fs';

const res = await fetch(
  'https://raw.githubusercontent.com/adafruit/Adafruit-GFX-Library/master/glcdfont.c',
);
const text = await res.text();
const body = text.match(/font\[\]\s*PROGMEM\s*=\s*\{([\s\S]*?)\};/)[1];
const bytes = [...body.matchAll(/0x([0-9A-Fa-f]{2})/g)].map((m) => parseInt(m[1], 16));
if (bytes.length < 128 * 5) throw new Error(`short font: ${bytes.length}`);

const hex = bytes
  .slice(32 * 5, 127 * 5)
  .map((b) => b.toString(16).padStart(2, '0'))
  .join('');

const wrapped = hex.match(/.{1,100}/g).map((line) => `  '${line}'`).join(' +\n');

const out = `// Generated from the classic Adafruit GFX 5x7 bitmap font (BSD-2-Clause).
// Covers ASCII 0x20-0x7E, 5 bytes per glyph, column-major, LSB = top row.
const HEX =
${wrapped};

export const FONT_FIRST = 0x20;
export const FONT_WIDTH = 5;
export const FONT_HEIGHT = 7;

const BYTES: number[] = [];
for (let i = 0; i < HEX.length; i += 2) BYTES.push(parseInt(HEX.slice(i, i + 2), 16));

/** Glyphs that are not in the ASCII font. */
const EXTRA: Record<string, string[]> = {
  'π': ['.....', '.....', '#####', '.#.#.', '.#.#.', '.#.#.', '.#.#.'],
  '√': ['....#', '...#.', '...#.', '..#..', '#.#..', '.#...', '.....'],
  '×': ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  '÷': ['.....', '..#..', '.....', '#####', '.....', '..#..', '.....'],
  '−': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '²': ['.###.', '...#.', '..#..', '.#...', '.###.', '.....', '.....'],
  '³': ['.###.', '...#.', '..##.', '...#.', '.###.', '.....', '.....'],
  '¹': ['..#..', '.##..', '..#..', '..#..', '.###.', '.....', '.....'],
  '⁻': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  '°': ['.##..', '#..#.', '.##..', '.....', '.....', '.....', '.....'],
  '⁄': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
  '·': ['.....', '.....', '.....', '..#..', '.....', '.....', '.....'],
};

/** Returns 7 rows of 5 booleans for a character. Unknown glyphs render blank. */
export function glyph(ch: string): boolean[][] {
  const extra = EXTRA[ch];
  if (extra) return extra.map((row) => [...row].map((cell) => cell === '#'));

  const code = ch.charCodeAt(0);
  const idx = code - FONT_FIRST;
  const rows: boolean[][] = Array.from({ length: FONT_HEIGHT }, () => Array(FONT_WIDTH).fill(false));
  if (idx < 0 || idx >= BYTES.length / FONT_WIDTH) return rows;
  for (let col = 0; col < FONT_WIDTH; col++) {
    const bits = BYTES[idx * FONT_WIDTH + col];
    for (let row = 0; row < FONT_HEIGHT; row++) rows[row][col] = (bits & (1 << row)) !== 0;
  }
  return rows;
}
`;

fs.mkdirSync('src/ui', { recursive: true });
fs.writeFileSync('src/ui/font5x7.ts', out);
console.log(`font bytes: ${bytes.length}, hex chars: ${hex.length}`);
