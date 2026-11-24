import { useNavigate, useSearchParams } from 'react-router-dom';
import Placeholder from '@core/pages/Placeholder.jsx';
import { useAuth } from '../useAuth.js';

/** BASE STUB — replaced by the real Login page (UI-06) in A1 Phase 1. */
export default function LoginPlaceholder() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/dashboard';

  return (
    <>
      <Placeholder slug="auth" title="Login" homeHref="/" homeLabel="Back to Home" />
      {import.meta.env.DEV && (
        <p style={{ textAlign: 'center', marginTop: 'calc(-1 * var(--nc-space-8))', paddingBottom: 'var(--nc-space-12)' }}>
          <button
            type="button"
            onClick={async () => {
              await login();
              navigate(next, { replace: true });
            }}
            style={{
              border: '1.5px solid var(--nc-navy)',
              background: 'var(--nc-surface)',
              color: 'var(--nc-navy)',
              borderRadius: 'var(--nc-radius-sm)',
              padding: '10px 18px',
              fontWeight: 'var(--nc-fw-semibold)',
              fontSize: 'var(--nc-fs-small)',
            }}
          >
            Dev only: continue as demo user
          </button>
        </p>
      )}
    </>
  );
}
