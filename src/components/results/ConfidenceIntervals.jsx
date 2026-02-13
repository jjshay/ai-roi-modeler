import { motion } from 'framer-motion';
import { formatCurrency, formatPercent } from '../../utils/formatters';

const metrics = [
  {
    key: 'npv',
    label: 'Net Present Value',
    format: formatCurrency,
  },
  {
    key: 'payback',
    label: 'Payback Period',
    format: (v) => (v > 60 ? '>60 mo' : `${v} mo`),
    invert: true, // lower is better
  },
  {
    key: 'roic',
    label: 'ROIC',
    format: formatPercent,
  },
];

export default function ConfidenceIntervals({ confidenceIntervals, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 md:p-6"
    >
      <h3 className="font-heading font-bold text-navy text-lg uppercase tracking-wide mb-1">
        Confidence Intervals
      </h3>
      <div className="h-0.5 bg-navy/20 mt-1 mb-4" />

      <div className="space-y-3">
        {metrics.map(({ key, label, format }, i) => {
          const data = confidenceIntervals[key];
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.1 + i * 0.12 }}
            >
              <div className="text-gray-600 text-sm font-medium mb-1">{label}</div>
              <div className="flex justify-between items-center py-1 pl-3">
                <span className="text-gray-500 text-xs">P25</span>
                <span className="font-mono font-semibold text-sm text-red-600">{format(data.p25)}</span>
              </div>
              <div className="flex justify-between items-center py-1 pl-3">
                <span className="text-gray-500 text-xs">P50 (Base)</span>
                <span className="font-mono font-semibold text-sm text-navy">{format(data.p50)}</span>
              </div>
              <div className="flex justify-between items-center py-1 pl-3">
                <span className="text-gray-500 text-xs">P75</span>
                <span className="font-mono font-semibold text-sm text-green-600">{format(data.p75)}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="text-gray-400 text-xs mt-3">
        Derived from scenario spread and 6-variable sensitivity analysis
      </p>
    </motion.div>
  );
}
