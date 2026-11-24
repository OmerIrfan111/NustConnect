/** Whole-number progress, clamped to 0..100. A missing or non-positive goal is 0 (never NaN or Infinity). */
function progressPercent(raised, goal) {
  const r = Number(raised);
  const g = Number(goal);
  if (!Number.isFinite(r) || !Number.isFinite(g) || g <= 0 || r <= 0) return 0;
  return Math.min(100, Math.round((r / g) * 100));
}

module.exports = { progressPercent };
