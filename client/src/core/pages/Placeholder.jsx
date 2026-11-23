import { Link } from 'react-router-dom';
import { Construction } from 'lucide-react';
import styles from './Placeholder.module.css';

/**
 * "Coming soon" page shown for every module route until its owner replaces it.
 * Usage in a module stub: placeholder('rideshare', 'Find a Ride')
 */
export default function Placeholder({ slug, title, homeHref = '/dashboard', homeLabel = 'Back to Dashboard' }) {
  return (
    <section className={styles.wrap} aria-labelledby="placeholder-title">
      <div className={styles.card}>
        <div className={styles.icon} aria-hidden="true">
          <Construction size={28} strokeWidth={2} />
        </div>
        <p className={styles.eyebrow}>Coming soon</p>
        <h1 id="placeholder-title" className={styles.title}>
          {title}
        </h1>
        <p className={styles.body}>
          This page is a placeholder in the base version. It is owned by{' '}
          <code className={styles.code}>module/{slug}</code> and will be built in that module&apos;s Phase 1.
        </p>
        <Link to={homeHref} className={styles.btn}>
          {homeLabel}
        </Link>
      </div>
    </section>
  );
}

/** Helper for module manifests: returns a route component that renders the placeholder. */
export function placeholder(slug, title, options) {
  const Page = () => <Placeholder slug={slug} title={title} {...options} />;
  Page.displayName = `Placeholder(${slug}:${title})`;
  return Page;
}
