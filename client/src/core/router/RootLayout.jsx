import { useEffect } from 'react';
import { Outlet, useLocation, useMatches } from 'react-router-dom';

const APP_NAME = 'NUSTConnect';

/** Sets document.title from route handles and manages scroll on navigation (incl. #hash targets). */
export default function RootLayout() {
  const location = useLocation();
  const matches = useMatches();

  const title = [...matches].reverse().find((m) => m.handle?.title)?.handle.title;

  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : `${APP_NAME} — One campus. One community. Everything connected.`;
  }, [title]);

  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (el) {
        el.scrollIntoView({ block: 'start' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  return <Outlet />;
}
