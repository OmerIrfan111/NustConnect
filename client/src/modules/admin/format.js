/** "PKR 2,500" */
export const pkr = (n) => `PKR ${Number(n || 0).toLocaleString('en-US')}`;

/** Whole-number progress clamped to 0..100 (same rule as the server). */
export function progressPercent(raised, goal) {
  const r = Number(raised);
  const g = Number(goal);
  if (!Number.isFinite(r) || !Number.isFinite(g) || g <= 0 || r <= 0) return 0;
  return Math.min(100, Math.round((r / g) * 100));
}

export const shortDate = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
