'use client';
import { useEffect, useRef, useState } from 'react';

type Props = {
  /** Nilai akhir yang dituju */
  to: number;
  /** Durasi animasi dalam ms (default 1200) */
  duration?: number;
  /** Delay sebelum animasi mulai (default 0) */
  delay?: number;
  /** Decimal places (default 0) */
  decimals?: number;
  /** Format function — biar bisa pakai fmtNum/fmtBytes dll. */
  format?: (n: number) => string;
  /** Class untuk wrapper span */
  className?: string;
};

// Easing: easeOutCubic — cepat di awal, melambat di akhir (efek "berhitung")
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Number counter animasi 0 → `to` dengan easeOutCubic.
 *  Pakai requestAnimationFrame, defensif terhadap StrictMode + race conditions.
 */
export function CountUp({ to, duration = 1200, delay = 0, decimals = 0, format, className }: Props) {
  const safeTo = Number.isFinite(to) ? to : 0;
  const [val, setVal] = useState<number>(safeTo === 0 ? 0 : 0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Cancel any in-flight animation
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // Kalau target 0, langsung set tanpa animate
    if (safeTo === 0) {
      setVal(0);
      return;
    }

    let cancelled = false;
    let startTime: number | null = null;

    const tick = (ts: number) => {
      if (cancelled) return;
      if (startTime === null) startTime = ts;
      const elapsed = ts - startTime - delay;
      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(progress);
      // Clamp ke [0, safeTo] biar gak ada glitch numerik
      const next = Math.max(0, Math.min(safeTo, safeTo * eased));
      setVal(next);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setVal(safeTo);
        rafRef.current = null;
      }
    };

    setVal(0);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [safeTo, duration, delay]);

  // Final display — clamp lagi defensively
  const safeVal = Math.max(0, Math.min(safeTo, val));

  const display = format
    ? format(safeVal)
    : decimals > 0
      ? safeVal.toFixed(decimals)
      : Math.round(safeVal).toLocaleString('id-ID');

  return <span className={className}>{display}</span>;
}
