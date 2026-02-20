import { useId } from 'react';

export default function SegmentedSelect({
  label,
  options = [],
  value,
  onChange,
  helperText,
}) {
  const id = useId();

  return (
    <fieldset className="w-full space-y-3" role="radiogroup" aria-labelledby={`${id}-label`}>
      {label && (
        <legend
          id={`${id}-label`}
          className="text-base font-semibold text-navy sm:text-lg"
        >
          {label}
        </legend>
      )}

      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(option.value)}
              className={`
                flex-1 min-w-[100px] min-h-[44px] rounded-lg border-2 px-4 py-3
                text-sm font-medium transition-all duration-150
                sm:min-w-[120px]
                focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2
                ${
                  isSelected
                    ? 'border-gold bg-gold/10 text-navy'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <span className="block text-center">{option.label}</span>
              {option.sublabel && (
                <span
                  className={`mt-0.5 block text-center text-xs ${
                    isSelected ? 'text-navy/70' : 'text-gray-400'
                  }`}
                >
                  {option.sublabel}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {helperText && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </fieldset>
  );
}
