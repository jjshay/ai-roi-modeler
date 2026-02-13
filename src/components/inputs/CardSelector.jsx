import { useId } from 'react';

export default function CardSelector({
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
                flex flex-col items-center gap-2 rounded-xl border-2 p-4
                text-center transition-all duration-150
                focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2
                ${
                  isSelected
                    ? 'scale-[1.02] border-gold bg-gold/10 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
              `}
            >
              {option.icon && (
                <span className="text-3xl leading-none" aria-hidden="true">
                  {option.icon}
                </span>
              )}
              <span
                className={`text-sm font-semibold ${
                  isSelected ? 'text-navy' : 'text-gray-800'
                }`}
              >
                {option.title}
              </span>
              {option.description && (
                <span
                  className={`text-xs leading-snug ${
                    isSelected ? 'text-navy/60' : 'text-gray-400'
                  }`}
                >
                  {option.description}
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
