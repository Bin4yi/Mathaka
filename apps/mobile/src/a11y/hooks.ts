import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { clock } from '../services/clock';
import { useAppStore } from '../store/appStore';
import { IDLE_HOME_MS, TAP_GUARD_MS } from './tokens';

/**
 * Wrap a press handler so a second tap within TAP_GUARD_MS is ignored
 * (tremor, and it stops double logging).
 */
export function useTapGuard<A extends unknown[]>(fn: (...args: A) => void | Promise<void>, ms = TAP_GUARD_MS) {
  const last = useRef(0);
  const busy = useRef(false);
  return useCallback(
    (...args: A) => {
      const now = Date.now();
      if (busy.current || now - last.current < ms) return;
      last.current = now;
      busy.current = true;
      Promise.resolve(fn(...args)).finally(() => {
        busy.current = false;
      });
    },
    [fn, ms],
  );
}

/**
 * Elder screens: after IDLE_HOME_MS with no touch, go back home gently.
 * Returns a callback to call on every touch (wire it to onTouchStart of the screen).
 */
export function useIdleHome(enabled = true) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!enabled) return;
    timer.current = setTimeout(() => router.replace('/elder'), IDLE_HOME_MS);
  }, [enabled]);
  useEffect(() => {
    reset();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [reset]);
  return reset;
}

/** "Now" from the app clock (demo time aware), refreshed every `everyMs`. */
export function useNow(everyMs = 15_000): Date {
  useAppStore((s) => s.demoOffsetMs); // re-render when demo time jumps
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return clock.now();
}

/** True when the user asked the system to reduce motion. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}
