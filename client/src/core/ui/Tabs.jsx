import { useRef } from 'react';
import styles from './Tabs.module.css';

/**
 * Tabs (Review Hub: Teachers / Cafes / Hostels ...). items = [{ value, label, count? }].
 * Keyboard: Left / Right (wraps), Home, End. Selection follows focus, as in the WAI-ARIA tabs pattern.
 */
export function Tabs({ items, value, onChange, label = 'Sections', className = '' }) {
  const refs = useRef([]);

  function onKeyDown(e, i) {
    const last = items.length - 1;
    const to = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    onChange(items[to].value);
    refs.current[to]?.focus();
  }

  return (
    <div role="tablist" aria-label={label} className={`${styles.tabs} ${className}`}>
      {items.map((t, i) => {
        const selected = t.value === value;
        return (
          <button
            key={t.value}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`${styles.tab} ${selected ? styles.active : ''}`}
            onClick={() => onChange(t.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {t.label}
            {t.count !== undefined && <span className={styles.count}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Chips (Marketplace categories: All, Electronics, Books ...). A group of toggle buttons with `aria-pressed`.
 * Single choice by default; with `multiple`, `value` is an array.
 */
export function Chips({ items, value, onChange, multiple = false, label = 'Filter', className = '' }) {
  const isOn = (v) => (multiple ? value.includes(v) : value === v);
  const toggle = (v) => {
    if (!multiple) return onChange(v);
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <div role="group" aria-label={label} className={`${styles.chips} ${className}`}>
      {items.map((c) => (
        <button key={c.value} type="button" aria-pressed={isOn(c.value)} className={`${styles.chip} ${isOn(c.value) ? styles.chipOn : ''}`} onClick={() => toggle(c.value)}>
          {c.label}
        </button>
      ))}
    </div>
  );
}
