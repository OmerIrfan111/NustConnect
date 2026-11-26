import { Check } from 'lucide-react';
import Logo from '@core/brand/Logo.jsx';
import styles from './AuthLayout.module.css';

/** Split screen from UI-06 / UI-07: navy brand panel on the left, form card on the right (stacked on mobile). */
export default function AuthLayout({ children }) {
  return (
    <div className={styles.page}>
      <aside className={styles.brand}>
        <div className={styles.brandInner}>
          <Logo onDark size={36} />
          <h1 className={styles.headline}>One campus. One community. Everything connected.</h1>
          <p className={styles.sub}>A trusted, verified student community for rides, reviews, marketplace and more.</p>
          <p className={styles.badge}>
            <Check size={16} aria-hidden="true" /> Verified NUST community (prototype — no real verification)
          </p>
        </div>
      </aside>
      <main className={styles.formSide}>
        <div className={styles.card}>{children}</div>
      </main>
    </div>
  );
}
