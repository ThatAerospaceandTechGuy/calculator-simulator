import type { KeyIcon as KeyIconName } from '../calculators/types';

interface KeyIconProps {
  name: KeyIconName;
}

/**
 * Thin-line keycap icons modelled on the CW+ keypad. They are intentionally
 * drawn rather than sourced from product art, so the replica carries no
 * third-party imagery.
 */
export function KeyIcon({ name }: KeyIconProps) {
  const shared = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'power':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path {...shared} d="M12 3.5v8" />
          <path {...shared} d="M7 6.6a8 8 0 1 0 10 0" />
        </svg>
      );
    case 'home':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path {...shared} d="m4 11.5 8-7 8 7" />
          <path {...shared} d="M6.5 10v9h11v-9" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path {...shared} d="M4 7h16M4 12h16M4 17h16" />
          <circle {...shared} cx="9" cy="7" r="1.7" fill="currentColor" stroke="none" />
          <circle {...shared} cx="15" cy="12" r="1.7" fill="currentColor" stroke="none" />
          <circle {...shared} cx="10" cy="17" r="1.7" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'back':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path {...shared} d="M9 7 4 12l5 5" />
          <path {...shared} d="M4 12h9.5a5.5 5.5 0 0 1 5.5 5.5" />
        </svg>
      );
    case 'variable':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path {...shared} d="M3 12h5.5" />
          <path {...shared} d="m6.5 9 3 3-3 3" />
          <rect {...shared} x="10.5" y="7" width="10" height="10" rx="1.5" />
          <path {...shared} d="m13.5 10 4 4m0-4-4 4" />
        </svg>
      );
    case 'catalog':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            {...shared}
            d="M12 6.5C10 5 7 4.7 4 5.2v12.6c3-.5 6-.2 8 1.2 2-1.4 5-1.7 8-1.2V5.2c-3-.5-6-.2-8 1.3Z"
          />
          <path {...shared} d="M12 6.5V19" />
        </svg>
      );
    case 'tools':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="6" cy="12" r="1.7" fill="currentColor" />
          <circle cx="12" cy="12" r="1.7" fill="currentColor" />
          <circle cx="18" cy="12" r="1.7" fill="currentColor" />
        </svg>
      );
    case 'chevron-up':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path {...shared} strokeWidth={2.2} d="m6 14.5 6-6 6 6" />
        </svg>
      );
    case 'chevron-down':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path {...shared} strokeWidth={2.2} d="m6 9.5 6 6 6-6" />
        </svg>
      );
    case 'chevron-left':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path {...shared} strokeWidth={2.2} d="m14.5 6-6 6 6 6" />
        </svg>
      );
    case 'chevron-right':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path {...shared} strokeWidth={2.2} d="m9.5 6 6 6-6 6" />
        </svg>
      );
    case 'chevrons-up':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path {...shared} strokeWidth={2.2} d="m7 13 5-5 5 5" />
          <path {...shared} strokeWidth={2.2} d="m7 18 5-5 5 5" />
        </svg>
      );
    case 'chevrons-down':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path {...shared} strokeWidth={2.2} d="m7 6 5 5 5-5" />
          <path {...shared} strokeWidth={2.2} d="m7 11 5 5 5-5" />
        </svg>
      );
    case 'shift':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path {...shared} strokeWidth={1.9} d="M12 4 5.5 11H9v6h6v-6h3.5Z" />
          <path {...shared} strokeWidth={1.9} d="M9 20h6" />
        </svg>
      );
    case 'fraction':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect {...shared} x="7" y="4" width="10" height="5" rx="1" />
          <rect {...shared} x="7" y="15" width="10" height="5" rx="1" />
          <path {...shared} d="M5 12h14" />
        </svg>
      );
  }
}
