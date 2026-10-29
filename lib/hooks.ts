// React Hooks Library
import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseCountdownOptions {
  onComplete?: () => void;
  interval?: number;
  autoStart?: boolean;
}

export function useCountdown(unlockTime: number, options: UseCountdownOptions = {}) {
  const { onComplete, interval = 1000, autoStart = true } = options;
  const [timeRemaining, setTimeRemaining] = useState(() => Math.max(0, unlockTime - Date.now()));
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const start = useCallback(() => {
    if (intervalRef.current) return;
    setIsRunning(true);
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      const remaining = Math.max(0, unlockTime - Date.now());
      setTimeRemaining(remaining);

      if (remaining === 0) {
        stop();
        onComplete?.();
      }
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [unlockTime, interval, isRunning, onComplete, stop]);

  const isUnlocked = timeRemaining === 0;

  return {
    timeRemaining,
    isUnlocked,
    isRunning,
    start,
    stop,
  };
}

export interface UseIntervalOptions {
  immediate?: boolean;
}

export function useInterval(callback: () => void, delay: number | null, options: UseIntervalOptions = {}) {
  const { immediate = false } = options;
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    if (immediate) {
      savedCallback.current();
    }

    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay, immediate]);
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef(0);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T) => {
    try {
      setStoredValue(value);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

export function useAsync<T>(asyncFunction: () => Promise<T>, immediate = true) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [value, setValue] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    setStatus('pending');
    setValue(null);
    setError(null);

    try {
      const response = await asyncFunction();
      setValue(response);
      setStatus('success');
      return response;
    } catch (error) {
      setError(error as Error);
      setStatus('error');
      throw error;
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      // Defer to avoid synchronous setState-in-effect
      setTimeout(execute, 0);
    }
  }, [execute, immediate]);

  return { execute, status, value, error };
}

export function useCopyToClipboard(): [(text: string) => Promise<boolean>, boolean] {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    if (!navigator?.clipboard) {
      console.warn('Clipboard not supported');
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch (error) {
      console.error('Failed to copy:', error);
      setCopied(false);
      return false;
    }
  }, []);

  return [copy, copied];
}
