import { useId } from 'react';

export default function SliderInput({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  helperText,
  suffix = '',
  liveCalc,
}) {
  const id = useId();

  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="w-full space-y-3">
      {label && (
        <label
          htmlFor={`${id}-slider`}
          className="block text-base font-semibold text-navy sm:text-lg"
        >
          {label}
        </label>
      )}

      <div
        className="text-center text-3xl font-bold text-navy sm:text-4xl"
        aria-live="polite"
      >
        {value}
        {suffix && <span className="ml-1 text-xl font-medium text-navy/60">{suffix}</span>}
      </div>

      <div className="relative px-1">
        <input
          id={`${id}-slider`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="slider-gold w-full cursor-pointer appearance-none bg-transparent focus:outline-none"
          style={{
            '--slider-pct': `${pct}%`,
          }}
        />
        <style>{`
          .slider-gold::-webkit-slider-runnable-track {
            height: 8px;
            border-radius: 4px;
            background: linear-gradient(
              to right,
              #c9a227 0%,
              #c9a227 var(--slider-pct),
              #e5e7eb var(--slider-pct),
              #e5e7eb 100%
            );
          }
          .slider-gold::-moz-range-track {
            height: 8px;
            border-radius: 4px;
            background: #e5e7eb;
          }
          .slider-gold::-moz-range-progress {
            height: 8px;
            border-radius: 4px;
            background: #c9a227;
          }
          .slider-gold::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #c9a227;
            border: 3px solid #ffffff;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
            margin-top: -12px;
            cursor: pointer;
            transition: transform 0.15s ease;
          }
          .slider-gold::-moz-range-thumb {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #c9a227;
            border: 3px solid #ffffff;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
            cursor: pointer;
            transition: transform 0.15s ease;
          }
          @media (min-width: 640px) {
            .slider-gold::-webkit-slider-thumb {
              width: 24px;
              height: 24px;
              margin-top: -8px;
            }
            .slider-gold::-moz-range-thumb {
              width: 24px;
              height: 24px;
            }
          }
          .slider-gold::-webkit-slider-thumb:hover {
            transform: scale(1.15);
          }
          .slider-gold::-moz-range-thumb:hover {
            transform: scale(1.15);
          }
          .slider-gold:focus-visible::-webkit-slider-thumb {
            outline: 2px solid #c9a227;
            outline-offset: 2px;
          }
          .slider-gold:focus-visible::-moz-range-thumb {
            outline: 2px solid #c9a227;
            outline-offset: 2px;
          }
        `}</style>

        <div className="mt-1 flex justify-between text-xs text-gray-400">
          <span>{min}{suffix}</span>
          <span>{max}{suffix}</span>
        </div>
      </div>

      {liveCalc && (
        <div className="rounded-lg bg-navy/5 px-4 py-3 text-sm text-navy">
          {liveCalc}
        </div>
      )}

      {helperText && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}
