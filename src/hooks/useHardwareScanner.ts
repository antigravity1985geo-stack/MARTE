import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook that listens for hardware barcode scanner input (e.g., Datalogic).
 * Hardware scanners emulate rapid keyboard input followed by Enter.
 * 
 * @param onScan - callback fired with the scanned barcode string
 * @param enabled - whether the listener is active (default: true)
 * @param options.minLength - minimum barcode length to accept (default: 4)
 * @param options.maxDelay - max ms between keystrokes to consider as scanner input (default: 50)
 */
export function useHardwareScanner(
  onScan: (code: string) => void,
  enabled = true,
  options?: { minLength?: number; maxDelay?: number }
) {
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const minLength = options?.minLength ?? 4;
  const maxDelay = options?.maxDelay ?? 50;

  const resetBuffer = useCallback(() => {
    bufferRef.current = '';
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea (unless it looks like scanner speed)
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // If too much time passed, reset buffer
      if (timeDiff > maxDelay && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      // Clear any pending timeout
      if (timerRef.current) clearTimeout(timerRef.current);

      if (e.key === 'Enter') {
        const code = bufferRef.current.trim();
        if (code.length >= minLength) {
          e.preventDefault();
          e.stopPropagation();
          onScanRef.current(code);
        }
        bufferRef.current = '';
        return;
      }

      // Only accept printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // For scanner input happening in input fields, we still capture if it's fast enough
        if (isInput && timeDiff > maxDelay && bufferRef.current.length === 0) {
          // First character typed normally in input - don't capture
          return;
        }
        bufferRef.current += e.key;

        // Auto-reset buffer after a pause (in case Enter is never pressed)
        timerRef.current = setTimeout(() => {
          bufferRef.current = '';
        }, 200);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, minLength, maxDelay]);

  return { resetBuffer };
}
