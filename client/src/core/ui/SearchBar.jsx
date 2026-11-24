import { useId, useState } from 'react';
import { Search } from 'lucide-react';
import styles from './SearchBar.module.css';

/**
 * Search field with the magnifier icon (design board: default and focused with a teal border).
 * Works uncontrolled (`defaultValue`) or controlled (`value` + `onChange`). `onSearch(text)` runs on submit (Enter), with the
 * text trimmed. Empty submits are ignored unless `allowEmpty` is set.
 */
export default function SearchBar({
  value,
  defaultValue = '',
  onChange,
  onSearch,
  placeholder = 'Search services, rides, items…',
  label = 'Search',
  allowEmpty = false,
  className = '',
  ...rest
}) {
  const id = useId();
  const [inner, setInner] = useState(defaultValue);
  const controlled = value !== undefined;
  const text = controlled ? value : inner;

  function submit(e) {
    e.preventDefault();
    const q = text.trim();
    if (q || allowEmpty) onSearch?.(q);
  }

  return (
    <form role="search" className={`${styles.wrap} ${className}`} onSubmit={submit}>
      <Search size={18} className={styles.icon} aria-hidden="true" />
      <label htmlFor={id} className="nc-sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        className={styles.input}
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          if (!controlled) setInner(e.target.value);
          onChange?.(e.target.value);
        }}
        {...rest}
      />
    </form>
  );
}
