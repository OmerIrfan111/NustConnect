/** Money helpers for Bill Splitting. All maths is done in integer paisa ("cents") so shares always add up exactly. */

export const toCents = (amount) => {
  const n = Number(amount);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
};

/** "PKR 2,500" for whole rupees, "PKR 333.34" otherwise. */
export function formatPKR(amount) {
  const n = Number(amount) || 0;
  const whole = Math.abs(n * 100 - Math.round(n) * 100) < 1e-6;
  return `PKR ${n.toLocaleString('en-PK', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

/** Split `totalCents` into `n` shares that sum to exactly `totalCents` (the first shares get the extra paisa). */
export function divideEvenly(totalCents, n) {
  if (!Number.isInteger(totalCents) || totalCents < 0 || !Number.isInteger(n) || n <= 0) return [];
  const base = Math.floor(totalCents / n);
  const rest = totalCents % n;
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}
