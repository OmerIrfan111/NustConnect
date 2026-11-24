import { useState } from 'react';
import styles from './StarRating.module.css';

const STAR = 'M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55L2.48 9.42l6.58-.96z';

/** Fraction (0 to 1) of star number `index` (1-based) that is filled for `value`. Handles halves: 3.5 fills 3 stars and half of the 4th. */
export const fillOf = (value, index) => Math.min(1, Math.max(0, value - (index - 1)));

/** Clamps to 0..max and snaps to the nearest half. */
export const snapToHalf = (v, max = 5) => Math.min(max, Math.max(0, Math.round((Number(v) || 0) * 2) / 2));

/**
 * StarRating (amber stars, 0 to 5, half values).
 * - Read-only by default: one image with the label "Rated 3.5 out of 5".
 * - With `onChange` it becomes a radio group of whole stars (keyboard: arrow keys, plus hover preview).
 */
export default function StarRating({ value = 0, max = 5, size = 18, onChange, label, showValue = false, className = '' }) {
  const v = snapToHalf(value, max);
  const [hover, setHover] = useState(0);
  const interactive = typeof onChange === 'function';
  const shown = interactive && hover ? hover : v;

  const stars = Array.from({ length: max }, (_, i) => {
    const index = i + 1;
    const fill = fillOf(shown, index);
    // Empty star underneath; the filled star on top is clipped to the filled fraction (0, 0.5 or 1), so no SVG ids are needed.
    const svg = (
      <span className={styles.star} style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={styles.layer}>
          <path d={STAR} className={styles.empty} />
        </svg>
        <span className={styles.clip} style={{ width: `${fill * 100}%` }} data-fill={fill}>
          <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={styles.layer}>
            <path d={STAR} className={styles.filled} />
          </svg>
        </span>
      </span>
    );
    if (!interactive) return <span key={index}>{svg}</span>;
    return (
      <button
        key={index}
        type="button"
        role="radio"
        aria-checked={Math.round(v) === index}
        aria-label={`${index} star${index === 1 ? '' : 's'}`}
        className={styles.btn}
        onClick={() => onChange(index)}
        onMouseEnter={() => setHover(index)}
        onMouseLeave={() => setHover(0)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            onChange(Math.min(max, Math.ceil(v) + (Number.isInteger(v) ? 1 : 0)));
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            onChange(Math.max(1, Math.floor(v) - (Number.isInteger(v) ? 1 : 0)));
          }
        }}
      >
        {svg}
      </button>
    );
  });

  const text = label || `Rated ${v} out of ${max}`;
  return (
    <span className={`${styles.wrap} ${className}`}>
      {interactive ? (
        <span role="radiogroup" aria-label={label || 'Your rating'} className={styles.row}>
          {stars}
        </span>
      ) : (
        <span role="img" aria-label={text} className={styles.row}>
          {stars}
        </span>
      )}
      {showValue && (
        <span className={styles.value} aria-hidden="true">
          {v.toFixed(1)}
        </span>
      )}
    </span>
  );
}
