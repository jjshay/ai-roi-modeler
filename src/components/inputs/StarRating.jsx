import { useId, useState } from 'react';

export default function StarRating({
  label,
  value,
  onChange,
  descriptions = [],
  helperText,
}) {
  const id = useId();
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const activeIndex = hoveredIndex ?? (value ? value - 1 : null);
  const activeDescription =
    activeIndex != null && descriptions[activeIndex]
      ? descriptions[activeIndex]
      : null;

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
        className="flex items-center gap-1 sm:gap-2"
        role="radiogroup"
        aria-labelledby={`${id}-label`}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = hoveredIndex != null ? star <= hoveredIndex + 1 : star <= value;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} star${star > 1 ? 's' : ''}${
                descriptions[star - 1] ? ` - ${descriptions[star - 1]}` : ''
              }`}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHoveredIndex(star - 1)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`
                rounded-md p-1 text-3xl transition-all duration-150
                focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2
                sm:text-4xl
                ${isFilled ? 'text-gold drop-shadow-sm' : 'text-gray-300 hover:text-gold/50'}
              `}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-8 w-8 sm:h-10 sm:w-10"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          );
        })}
      </div>

      {activeDescription && (
        <p
          className="min-h-[1.5rem] text-sm font-medium text-navy/70"
          aria-live="polite"
        >
          {activeDescription}
        </p>
      )}

      {helperText && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}
