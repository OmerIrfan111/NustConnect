import styles from './Layout.module.css';

/** PageHeader: the page heading (32px navy), optional subtitle, and an `actions` slot on the right (buttons). Renders the page's only <h1>. */
export function PageHeader({ title, subtitle, actions, className = '' }) {
  return (
    <header className={`${styles.header} ${className}`}>
      <div>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}

/** EmptyState: shown when a list has nothing to show (or a search matches nothing). `icon` is a lucide component, `action` a node. */
export function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={`${styles.empty} ${className}`}>
      {Icon && (
        <span className={styles.emptyIcon}>
          <Icon size={28} aria-hidden="true" />
        </span>
      )}
      <h2 className={styles.emptyTitle}>{title}</h2>
      {description && <p className={styles.emptyText}>{description}</p>}
      {action}
    </div>
  );
}

/** Loading spinner for a list or page. Announced politely to screen readers. */
export function Loading({ label = 'Loading…', className = '' }) {
  return (
    <div role="status" aria-live="polite" className={`${styles.loading} ${className}`}>
      <span className={styles.spinner} aria-hidden="true" />
      <span className="nc-sr-only">{label}</span>
    </div>
  );
}

/** Skeleton rows for content that is about to appear (decorative; wrap the list in aria-busy). */
export function Skeleton({ rows = 3, className = '' }) {
  return (
    <div className={`${styles.skeleton} ${className}`} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className={styles.skeletonRow} />
      ))}
    </div>
  );
}

/** ErrorState: a failed request, with a retry button. */
export function ErrorState({ message = 'Something went wrong.', onRetry, className = '' }) {
  return (
    <div role="alert" className={`${styles.error} ${className}`}>
      <span>{message}</span>
      {onRetry && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

/** The mandatory label for demo content (docs/DESIGN.md section 9: all demo data is clearly labelled as sample data). */
export function SampleDataBanner({ children = 'Sample data: this is demo content, not real activity.', className = '' }) {
  return (
    <p role="note" className={`${styles.sample} ${className}`}>
      {children}
    </p>
  );
}
