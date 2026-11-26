import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import styles from './topbar.module.css';

/** Top-bar search (slot `topbarSearch`). Submitting opens /search?q=…, where results are grouped by module (Phase 2). */
export default function GlobalSearchBar() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  function onSubmit(e) {
    e.preventDefault();
    const term = q.trim();
    if (term) navigate(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <form className={styles.search} role="search" onSubmit={onSubmit}>
      <Search size={16} className={styles.searchIcon} aria-hidden="true" />
      <label htmlFor="global-search" className="nc-sr-only">
        Search
      </label>
      <input
        id="global-search"
        type="search"
        placeholder="Search services, rides, items, reviews…"
        className={styles.searchInput}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        maxLength={100}
      />
    </form>
  );
}
