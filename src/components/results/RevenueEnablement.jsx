import { motion } from 'framer-motion';
import { formatCurrency } from '../../utils/formatters';

export default function RevenueEnablement({ revenueEnablement, delay = 0 }) {
  if (!revenueEnablement.eligible) return null;

  const items = [
    { label: 'Time-to-market acceleration', value: revenueEnablement.timeToMarket },
    { label: 'Customer experience uplift', value: revenueEnablement.customerExperience },
    { label: 'New capability revenue', value: revenueEnablement.newCapability },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 md:p-6"
    >
      <h3 className="font-heading font-bold text-navy text-lg uppercase tracking-wide mb-1">
        Revenue Enablement
      </h3>
      <div className="h-0.5 bg-emerald-300/40 mt-1 mb-4" />

      <div className="space-y-2 mb-4">
        {items.map(({ label, value }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + 0.1 + i * 0.1 }}
            className="flex justify-between items-center"
          >
            <span className="text-gray-600 text-sm">{label}</span>
            <span className="font-mono font-semibold text-navy">
              {formatCurrency(value)}
            </span>
          </motion.div>
        ))}
      </div>

      <div className="border-t border-emerald-200 pt-3 flex justify-between items-center">
        <span className="text-gray-600 text-sm font-medium">Total Annual Revenue Uplift</span>
        <span className="font-mono font-bold text-lg text-emerald-700">
          {formatCurrency(revenueEnablement.totalAnnualRevenue)}
        </span>
      </div>

      <p className="text-gray-400 text-xs mt-2">
        Conservative estimate with 50% risk discount applied. Not included in NPV/IRR to stay conservative. [18]
      </p>
    </motion.div>
  );
}
