export default function PageLoading() {
  return (
    <div role="status" aria-live="polite" style={{ display: 'grid', placeItems: 'center', padding: 'var(--nc-space-16)' }}>
      <span
        aria-hidden="true"
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '3px solid var(--nc-border)',
          borderTopColor: 'var(--nc-teal)',
          animation: 'nc-spin 0.8s linear infinite',
        }}
      />
      <span className="nc-sr-only">Loading…</span>
      <style>{'@keyframes nc-spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}
