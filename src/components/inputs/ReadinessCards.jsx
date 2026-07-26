import { motion } from 'framer-motion';

const COLORS = [
  { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-700', dot: 'bg-red-500', ring: 'ring-red-400' },
  { bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-700', dot: 'bg-orange-500', ring: 'ring-orange-400' },
  { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700', dot: 'bg-amber-500', ring: 'ring-amber-400' },
  { bg: 'bg-lime-50', border: 'border-lime-500', text: 'text-lime-700', dot: 'bg-lime-500', ring: 'ring-lime-500' },
  { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-700', dot: 'bg-emerald-500', ring: 'ring-emerald-500' },
];

const LEVEL_LABELS = ['Very Low', 'Low', 'Moderate', 'High', 'Very High'];

export default function ReadinessCards({ label, value, onChange, descriptions = [] }) {
  return (
    <div className="w-full space-y-3">
      {label && (
        <label className="block text-base font-semibold text-navy sm:text-lg">
          {label}
        </label>
      )}
      <div className="space-y-2">
        {descriptions.map((desc, i) => {
          const level = i + 1;
          const selected = value === level;
          const color = COLORS[i];
          return (
            <motion.button
              key={level}
              type="button"
              onClick={() => onChange(level)}
              whileTap={{ scale: 0.98 }}
              className={`
                w-full text-left rounded-xl border-2 px-4 py-3 transition-all duration-150 cursor-pointer
                ${selected
                  ? `${color.bg} ${color.border} ${color.ring} ring-1`
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selected ? `${color.border}` : 'border-gray-300'
                }`}>
                  {selected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      className={`w-2.5 h-2.5 rounded-full ${color.dot}`}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${selected ? color.text : 'text-gray-700'}`}>
                      {level}. {LEVEL_LABELS[i]}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 leading-relaxed ${selected ? color.text : 'text-gray-500'}`}>
                    {desc}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
