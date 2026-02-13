import { motion } from 'framer-motion';
import { formatCurrency, formatPercent } from '../../utils/formatters';

function ComparisonBar({ label, traditional, ai, savingsPct, delay }) {
  const maxVal = traditional; // traditional is always larger
  const tradPct = 100;
  const aiPct = maxVal > 0 ? (ai / maxVal) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="space-y-2"
    >
      <div className="flex justify-between items-baseline">
        <span className="text-navy font-bold text-sm">{label} Volume</span>
        <span className="bg-emerald-100 text-emerald-700 font-mono font-bold text-xs px-2 py-0.5 rounded-full">
          Save {formatPercent(savingsPct)}
        </span>
      </div>

      {/* Traditional bar */}
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs w-20 shrink-0">Traditional</span>
          <div className="flex-1 h-7 bg-gray-100 rounded-md overflow-hidden relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${tradPct}%` }}
              transition={{ delay: delay + 0.2, duration: 0.6, ease: 'easeOut' }}
              className="h-full bg-red-400/80 rounded-md"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-xs font-semibold text-red-800">
              {formatCurrency(traditional)}
            </span>
          </div>
        </div>
      </div>

      {/* AI bar */}
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs w-20 shrink-0">With AI</span>
          <div className="flex-1 h-7 bg-gray-100 rounded-md overflow-hidden relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(aiPct, 3)}%` }}
              transition={{ delay: delay + 0.3, duration: 0.6, ease: 'easeOut' }}
              className="h-full bg-emerald-400/80 rounded-md"
            />
            <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-xs font-semibold text-emerald-800">
              {formatCurrency(ai)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ScalabilityPremium({ scalabilityPremium, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 md:p-6"
    >
      <h3 className="font-heading font-bold text-navy text-lg uppercase tracking-wide mb-1">
        Scalability Premium
      </h3>
      <div className="h-0.5 bg-navy/20 mt-1 mb-4" />

      <p className="text-gray-500 text-sm mb-5">
        AI costs scale sub-linearly — doubling volume doesn't double cost.
      </p>

      <div className="space-y-6">
        {scalabilityPremium.scenarios.map((scenario, i) => (
          <ComparisonBar
            key={scenario.label}
            label={scenario.label}
            traditional={scenario.traditionalCost}
            ai={scenario.aiCost}
            savingsPct={scenario.savingsPercent}
            delay={delay + 0.1 + i * 0.2}
          />
        ))}
      </div>

      <p className="text-gray-400 text-xs mt-4">
        AI marginal cost scales at 25% (2x) and 40% (3x) vs linear scaling for traditional ops [20]
      </p>
    </motion.div>
  );
}
