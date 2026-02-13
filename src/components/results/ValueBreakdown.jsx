import { motion } from 'framer-motion';
import { formatCurrency } from '../../utils/formatters';

const categories = [
  { key: 'headcount', label: 'Headcount Optimization', color: 'bg-blue-500' },
  { key: 'efficiency', label: 'Efficiency Gains', color: 'bg-emerald-500' },
  { key: 'errorReduction', label: 'Error Reduction', color: 'bg-amber-500' },
  { key: 'toolReplacement', label: 'Tool Replacement', color: 'bg-purple-500' },
];

export default function ValueBreakdown({ valueBreakdown, delay = 0 }) {
  const total = valueBreakdown.totalRiskAdjusted || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 md:p-6"
    >
      <h3 className="font-heading font-bold text-navy text-lg uppercase tracking-wide mb-1">
        Value Creation Breakdown
      </h3>
      <div className="h-0.5 bg-navy/20 mt-1 mb-4" />

      {/* Per-employee gain callout */}
      {valueBreakdown.perEmployeeGain > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-700 text-sm font-medium">Year 1: Per-employee productivity gain</span>
            <span className="font-mono font-bold text-emerald-700">{formatCurrency(valueBreakdown.perEmployeeGain)}/person</span>
          </div>
          <p className="text-gray-500 text-xs mt-1">
            Enhancement phase — AI augments each employee before any headcount changes
          </p>
        </div>
      )}

      {/* Stacked bar */}
      <div className="flex h-6 rounded-full overflow-hidden mb-4">
        {categories.map(({ key, color }) => {
          const pct = total > 0 ? (valueBreakdown[key].riskAdjusted / total) * 100 : 0;
          if (pct < 1) return null;
          return (
            <div
              key={key}
              className={`${color} transition-all`}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>

      {/* Category rows */}
      <div className="space-y-3">
        {categories.map(({ key, label, color }, i) => {
          const val = valueBreakdown[key];
          const pct = total > 0 ? (val.riskAdjusted / total) * 100 : 0;
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.1 + i * 0.1 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-sm ${color}`} />
                <span className="text-gray-600 text-sm">{label}</span>
                {key === 'headcount' && (
                  <span className="text-gray-400 text-xs">(phased Yr 2-5)</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-xs">{pct.toFixed(0)}%</span>
                <span className="font-mono font-semibold text-navy min-w-[100px] text-right">
                  {formatCurrency(val.riskAdjusted)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="border-t border-gray-200 mt-4 pt-3 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 text-sm font-medium">Total Gross Value (at full adoption)</span>
          <span className="font-mono font-bold text-lg text-navy">
            {formatCurrency(valueBreakdown.totalRiskAdjusted)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500 text-sm">Less: Year 1 AI operating cost</span>
          <span className="font-mono font-semibold text-red-600">
            -{formatCurrency(valueBreakdown.ongoingAiCostYear1)}
          </span>
        </div>
        <div className="flex justify-between items-center border-t border-gray-100 pt-2">
          <span className="text-gray-700 text-sm font-semibold">Net Annual Value (at full adoption)</span>
          <span className={`font-mono font-bold text-lg ${
            valueBreakdown.totalRiskAdjusted - valueBreakdown.ongoingAiCostYear1 >= 0 ? 'text-emerald-700' : 'text-red-600'
          }`}>
            {formatCurrency(valueBreakdown.totalRiskAdjusted - valueBreakdown.ongoingAiCostYear1)}
          </span>
        </div>
      </div>

      <p className="text-gray-400 text-xs mt-2">
        Risk-adjusted for adoption rate, executive sponsorship, and industry success rate.
        Headcount savings capped at 75% — 25% of roles always require humans.
      </p>
    </motion.div>
  );
}
