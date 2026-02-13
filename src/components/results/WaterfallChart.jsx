import { motion } from 'framer-motion';
import { formatCurrency } from '../../utils/formatters';

function WaterfallBar({ label, value, runningTotal, maxAbsVal, isTotal, delay, color }) {
  // Calculate bar positioning relative to zero line
  const scale = maxAbsVal > 0 ? 40 / maxAbsVal : 0; // 40% of container width per max value
  const barWidthPct = Math.abs(value) * scale;
  const isPositive = value >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="flex items-center gap-2 py-1.5"
    >
      <span className={`text-xs w-28 shrink-0 text-right ${isTotal ? 'font-bold text-navy' : 'text-gray-600'}`}>
        {label}
      </span>

      <div className="flex-1 h-6 relative">
        {/* Center zero line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-300" />

        {/* Bar */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(barWidthPct, 1)}%` }}
          transition={{ delay: delay + 0.1, duration: 0.5, ease: 'easeOut' }}
          className={`absolute top-0.5 h-5 rounded ${color || (isPositive ? 'bg-emerald-400' : 'bg-red-400')} ${isTotal ? 'opacity-90' : 'opacity-70'}`}
          style={{
            [isPositive ? 'left' : 'right']: '50%',
          }}
        />
      </div>

      <span className={`font-mono text-xs font-semibold w-24 text-right ${
        isTotal ? 'text-navy' : isPositive ? 'text-emerald-700' : 'text-red-600'
      }`}>
        {isPositive && !isTotal ? '+' : ''}{formatCurrency(value)}
      </span>
    </motion.div>
  );
}

export default function WaterfallChart({ results, delay = 0 }) {
  const base = results.scenarios.base;
  const yr1 = base.projections[0];
  const yr5 = base.projections[4];

  // Waterfall steps: what builds up to NPV
  const steps = [
    { label: '5-Yr Gross Savings', value: base.projections.reduce((s, f) => s + f.grossSavings, 0), isTotal: false },
    { label: 'AI Operating Cost', value: -base.projections.reduce((s, f) => s + f.ongoingCost, 0), isTotal: false },
    { label: 'Separation Cost', value: -base.projections.reduce((s, f) => s + f.separationCost, 0), isTotal: false },
    { label: 'Upfront Investment', value: -results.upfrontInvestment, isTotal: false },
    { label: 'Net Present Value', value: base.npv, isTotal: true, color: base.npv >= 0 ? 'bg-navy' : 'bg-red-600' },
  ];

  const maxAbsVal = Math.max(...steps.map(s => Math.abs(s.value)));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 md:p-6"
    >
      <h3 className="font-heading font-bold text-navy text-lg uppercase tracking-wide mb-1">
        Value Waterfall
      </h3>
      <div className="h-0.5 bg-navy/20 mt-1 mb-4" />

      <p className="text-gray-500 text-sm mb-4">
        How savings flow through costs to arrive at NPV
      </p>

      <div className="space-y-0">
        {steps.map((step, i) => (
          <WaterfallBar
            key={step.label}
            label={step.label}
            value={step.value}
            maxAbsVal={maxAbsVal}
            isTotal={step.isTotal}
            color={step.color}
            delay={delay + 0.1 + i * 0.12}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-400 opacity-70" />
          <span className="text-gray-500 text-xs">Positive</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-400 opacity-70" />
          <span className="text-gray-500 text-xs">Cost / Outflow</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-navy opacity-90" />
          <span className="text-gray-500 text-xs">NPV (net result)</span>
        </div>
      </div>
    </motion.div>
  );
}
