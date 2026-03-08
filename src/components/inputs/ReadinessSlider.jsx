import { useId } from 'react';

const COLORS = [
  { bg: '#DC2626', text: '#DC2626' }, // 1 - red
  { bg: '#EA580C', text: '#EA580C' }, // 2 - orange
  { bg: '#CA8A04', text: '#CA8A04' }, // 3 - amber (middle)
  { bg: '#65A30D', text: '#65A30D' }, // 4 - light green
  { bg: '#16A34A', text: '#16A34A' }, // 5 - dark green
];

function trackGradient() {
  return 'linear-gradient(to right, #DC2626 0%, #EA580C 25%, #CA8A04 50%, #65A30D 75%, #16A34A 100%)';
}

export default function ReadinessSlider({
  label,
  value,
  onChange,
  descriptions = [],
}) {
  const id = useId();
  const idx = Math.max(0, Math.min(4, (value || 3) - 1));
  const color = COLORS[idx];
  const pct = ((value - 1) / 4) * 100;

  return (
    <div className="w-full space-y-4">
      {label && (
        <label
          htmlFor={`${id}-slider`}
          className="block text-base font-semibold text-navy sm:text-lg"
        >
          {label}
        </label>
      )}

      <div className="relative px-1">
        <input
          id={`${id}-slider`}
          type="range"
          min={1}
          max={5}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="readiness-slider w-full cursor-pointer appearance-none bg-transparent focus:outline-none"
          style={{
            '--slider-pct': `${pct}%`,
            '--thumb-color': color.bg,
          }}
        />
        <style>{`
          .readiness-slider::-webkit-slider-runnable-track {
            height: 10px;
            border-radius: 5px;
            background: ${trackGradient()};
          }
          .readiness-slider::-moz-range-track {
            height: 10px;
            border-radius: 5px;
            background: ${trackGradient()};
          }
          .readiness-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background: var(--thumb-color);
            border: 4px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
            margin-top: -12px;
            cursor: pointer;
            transition: background 0.2s ease, transform 0.15s ease;
          }
          .readiness-slider::-moz-range-thumb {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background: var(--thumb-color);
            border: 4px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
            cursor: pointer;
            transition: background 0.2s ease, transform 0.15s ease;
          }
          .readiness-slider::-webkit-slider-thumb:hover {
            transform: scale(1.15);
          }
          .readiness-slider::-moz-range-thumb:hover {
            transform: scale(1.15);
          }
          .readiness-slider:focus-visible::-webkit-slider-thumb {
            outline: 2px solid var(--thumb-color);
            outline-offset: 2px;
          }
          .readiness-slider:focus-visible::-moz-range-thumb {
            outline: 2px solid var(--thumb-color);
            outline-offset: 2px;
          }
        `}</style>

        <div className="mt-2 flex justify-between text-xs font-medium text-gray-400">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>

      {descriptions[idx] && (
        <p
          className="min-h-[2rem] text-lg font-bold transition-colors duration-200 sm:text-xl"
          style={{ color: color.text }}
          aria-live="polite"
        >
          {descriptions[idx]}
        </p>
      )}
    </div>
  );
}
