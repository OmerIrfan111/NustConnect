import { useId } from 'react';
import styles from './form.module.css';

/**
 * Labelled input / select with an inline error (UI kit "Input" pattern: label above, red border + message on error).
 * Pass `as="select"` with <option> children for a dropdown.
 */
export default function Field({ label, error, as: Tag = 'input', hint, children, ...props }) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <Tag
        id={id}
        className={`${styles.input} ${error ? styles.inputError : ''}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...props}
      >
        {children}
      </Tag>
      {error ? (
        <p id={`${id}-err`} className={styles.error}>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
