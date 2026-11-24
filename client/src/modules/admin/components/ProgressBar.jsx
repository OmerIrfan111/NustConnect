import { progressPercent } from '../format.js';
import styles from './ProgressBar.module.css';

/** Donation progress bar. Accessible as a progressbar; the width is clamped to 0..100 %. */
export default function ProgressBar({ raised, goal, label = 'Campaign progress' }) {
  const pct = progressPercent(raised, goal);
  return (
    <div className={styles.track} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className={styles.fill} style={{ width: `${pct}%` }} />
    </div>
  );
}
