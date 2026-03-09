import { useEffect, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function AnimatedNumber({ value, duration = 1000, prefix = '', suffix = '', decimals = 0 }: AnimatedNumberProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const start = 0;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(start + (value - start) * eased);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value, duration]);

  return (
    <span className="font-mono font-semibold tabular-nums">
      {prefix}{current.toFixed(decimals)}{suffix}
    </span>
  );
}
