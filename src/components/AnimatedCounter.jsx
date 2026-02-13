import { useEffect, useRef, useState } from 'react';
import { formatCurrency } from '../utils/formatters';

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export default function AnimatedCounter({
  value,
  duration = 1500,
  prefix = '$',
  formatFn,
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const rafRef = useRef(null);
  const startTimeRef = useRef(null);
  const startValueRef = useRef(0);

  const formatter = formatFn || ((v) => {
    const formatted = new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(Math.round(v));
    return `${prefix}${formatted}`;
  });

  useEffect(() => {
    const targetValue = typeof value === 'number' ? value : 0;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    startValueRef.current = displayValue;
    startTimeRef.current = null;

    function animate(timestamp) {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const current =
        startValueRef.current +
        (targetValue - startValueRef.current) * easedProgress;

      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    }

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span className="font-mono text-2xl font-bold text-navy">
      {formatter(displayValue)}
    </span>
  );
}
