import { useId } from 'react';

/**
 * A compact numeric field for counts, months, and percentages.  Unlike the
 * broad team-size slider, this keeps the unit visible next to the value.
 */
export default function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  suffix,
  helperText,
  prefix,
  placeholder,
  allowEmpty = false,
}) {
  const id = useId();

  const handleChange = (event) => {
    const raw = event.target.value;
    if (raw === '') {
      onChange(allowEmpty ? undefined : 0);
      return;
    }

    const next = Number(raw);
    if (!Number.isFinite(next)) return;
    const bounded = Math.max(min, max == null ? next : Math.min(max, next));
    onChange(bounded);
  };

  return (
    <div className="w-full space-y-2">
      {label && (
        <label htmlFor={`${id}-input`} className="block text-sm font-semibold text-navy sm:text-base">
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-lg font-semibold text-gray-400">
            {prefix}
          </span>
        )}
        <input
          id={`${id}-input`}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={allowEmpty && (value === null || value === undefined) ? '' : (value ?? 0)}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full rounded-lg border-2 border-gray-200 bg-white py-3 font-mono text-lg font-semibold text-navy transition-colors duration-150 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30 ${prefix ? 'pl-9' : 'pl-4'} ${suffix ? 'pr-20' : 'pr-4'}`}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-navy/50">
            {suffix}
          </span>
        )}
      </div>
      {helperText && <p className="text-xs leading-relaxed text-gray-500">{helperText}</p>}
    </div>
  );
}
