import { useId, useState, useCallback } from 'react';

export default function CurrencyInput({
  label,
  value,
  onChange,
  presets = [],
  helperText,
  defaultValue,
}) {
  const id = useId();
  const [isCustom, setIsCustom] = useState(
    () => value != null && !presets.includes(value)
  );

  const formatPreset = useCallback((num) => {
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
    return `$${num}`;
  }, []);

  const formatDisplay = useCallback((num) => {
    if (num == null || isNaN(num)) return '';
    return new Intl.NumberFormat('en-US').format(num);
  }, []);

  const handlePresetClick = (preset) => {
    setIsCustom(false);
    onChange(preset);
  };

  const handleCustomClick = () => {
    setIsCustom(true);
  };

  const handleInputChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const parsed = raw === '' ? (defaultValue ?? 0) : parseInt(raw, 10);
    onChange(parsed);
  };

  const isPresetSelected = (preset) => !isCustom && value === preset;

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

      {presets.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Preset amounts">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className={`
                rounded-lg border-2 px-4 py-2 text-sm font-medium
                transition-all duration-150
                focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2
                ${
                  isPresetSelected(preset)
                    ? 'border-gold bg-gold/10 text-navy'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              {formatPreset(preset)}
            </button>
          ))}
          <button
            type="button"
            onClick={handleCustomClick}
            className={`
              rounded-lg border-2 px-4 py-2 text-sm font-medium
              transition-all duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2
              ${
                isCustom
                  ? 'border-gold bg-gold/10 text-navy'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            Custom
          </button>
        </div>
      )}

      {(isCustom || presets.length === 0) && (
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-gray-400">
            $
          </span>
          <input
            id={`${id}-input`}
            type="text"
            inputMode="numeric"
            aria-labelledby={`${id}-label`}
            value={formatDisplay(value)}
            onChange={handleInputChange}
            placeholder={defaultValue != null ? formatDisplay(defaultValue) : '0'}
            className="
              w-full rounded-lg border-2 border-gray-200 bg-white
              py-3 pl-10 pr-4 font-mono text-xl font-semibold text-navy
              transition-colors duration-150
              placeholder:text-gray-300
              focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30
            "
          />
        </div>
      )}

      {helperText && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}
