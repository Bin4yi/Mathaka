import { useEffect } from 'react';
import { AppState } from 'react-native';
import { checkMissed, loadElderView } from '../services/doseService';
import { useAppStore } from '../store/appStore';
import { useLoad } from './useLoad';

/**
 * Elder screen data. Reloads when dose data changes, when demo time jumps,
 * every 30 s (so "due" turns on by itself), and when the app comes back to the front.
 */
export function useElderView() {
  const version = useAppStore((s) => s.dataVersion);
  const offset = useAppStore((s) => s.demoOffsetMs);
  const { data, reload } = useLoad(() => loadElderView(), [version, offset]);

  useEffect(() => {
    const tick = () => void checkMissed().then(() => reload());
    const id = setInterval(tick, 30_000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && tick());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [reload]);

  return { view: data, reload };
}
