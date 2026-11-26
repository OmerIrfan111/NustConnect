import { useCallback, useEffect, useState } from 'react';
import http from '@core/api/http.js';

/** GET `url` with loading / ready / error state and a `reload()`. Pass `params` as a stable (memoised) object. */
export function useLoad(url, params) {
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const key = JSON.stringify(params ?? {});

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await http.get(url, { params: JSON.parse(key) });
      setData(res.data);
      setState('ready');
    } catch (err) {
      setError(err?.message || 'Something went wrong.');
      setState('error');
    }
  }, [url, key]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, state, error, reload: load };
}
