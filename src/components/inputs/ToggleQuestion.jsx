import { useId } from 'react';

export default function ToggleQuestion({
  label,
  value,
  onChange,
  yesLabel = 'Yes',
  noLabel = 'No',
  note,
}) {
  const id = useId();

  return (
    <div className="w-full space-y-3">
      {label && (
        <label
          id={`${id}-label`}
          className="block text-base font-semibold text-navy sm:text-lg"
        >
          {label}
        </label>
      )}

      <div
        className="flex gap-3"
        role="radiogroup"
        aria-labelledby={`${id}-label`}
      >
        <button
          type="button"
          role="radio"
          aria-checked={value === true}
          onClick={() => onChange(true)}
          className={`
            flex-1 min-h-[44px] rounded-lg border-2 px-6 py-3.5 text-base font-semibold
            transition-all duration-150
            focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2
            sm:py-4 sm:text-lg
            ${
              value === true
                ? 'border-gold bg-gold/10 text-navy'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
            }
          `}
        >
          {yesLabel}
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={value === false}
          onClick={() => onChange(false)}
          className={`
            flex-1 min-h-[44px] rounded-lg border-2 px-6 py-3.5 text-base font-semibold
            transition-all duration-150
            focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2
            sm:py-4 sm:text-lg
            ${
              value === false
                ? 'border-gold bg-gold/10 text-navy'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
            }
          `}
        >
          {noLabel}
        </button>
      </div>

      {value === false && note && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {note}
        </p>
      )}
    </div>
  );
}
