import { forwardRef, useId } from 'react';
import styles from './Input.module.css';

/**
 * Labelled form control with the design board's states: empty, filled, error ("Invalid email", red border).
 * `as` switches between 'input' (default), 'textarea' and 'select' (pass <option> children). The label sits above the field,
 * and the error / hint are wired to it with aria-describedby so screen readers read them.
 */
const Input = forwardRef(function Input({ label, error, hint, as: Tag = 'input', id, className = '', children, ...props }, ref) {
  const auto = useId();
  const fieldId = id || auto;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={fieldId} className={styles.label}>
          {label}
        </label>
      )}
      <Tag
        ref={ref}
        id={fieldId}
        className={[styles.input, error ? styles.error : '', className].filter(Boolean).join(' ')}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...props}
      >
        {children}
      </Tag>
      {error ? (
        <p id={`${fieldId}-error`} className={styles.message}>
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default Input;
