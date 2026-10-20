import { Fragment } from 'react';
import { FONT_HEIGHT, FONT_WIDTH, glyph } from '../ui/font5x7';

interface DotMatrixProps {
  text: string;
  scale?: number;
  className?: string;
  /** Accessible label; the SVG itself is hidden from assistive tech. */
  label?: string;
}

/**
 * Renders text as discrete LCD dots on a 5×7 grid. One unit = one physical
 * display pixel; the parent scales the SVG with container-query units.
 */
export function DotMatrix({ text, scale = 1, className, label }: DotMatrixProps) {
  const characters = [...text];
  const pitch = (FONT_WIDTH + 1) * scale;
  const width = Math.max(pitch, characters.length * pitch);
  const height = (FONT_HEIGHT + 1) * scale;

  return (
    <svg
      className={`dot-matrix${className ? ` ${className}` : ''}`}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {characters.map((character, charIndex) => {
        const rows = glyph(character);
        return (
          <Fragment key={`${character}-${charIndex}`}>
            {rows.map((row, y) =>
              row.map((on, x) =>
                on ? (
                  <rect
                    key={`${charIndex}-${x}-${y}`}
                    x={charIndex * pitch + x * scale + scale * 0.12}
                    y={y * scale + scale * 0.12}
                    width={scale * 0.78}
                    height={scale * 0.78}
                    rx={scale * 0.12}
                  />
                ) : null,
              ),
            )}
          </Fragment>
        );
      })}
    </svg>
  );
}
