import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Load async data for a screen. Runs again when `deps` change or when `reload()` is called.
 * `deps` should be simple values (numbers, strings).
 */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<{ data: T | null; error: Error | null }>({ data: null, error: null });
  const [tick, setTick] = useState(0);
  const loadRef = useRef(load);
  const key = JSON.stringify(deps);

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let alive = true;
    loadRef.current().then(
      (data) => alive && setState({ data, error: null }),
      (e: unknown) => alive && setState((s) => ({ ...s, error: e instanceof Error ? e : new Error(String(e)) })),
    );
    return () => {
      alive = false;
    };
  }, [key, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { data: state.data, error: state.error, reload };
}
