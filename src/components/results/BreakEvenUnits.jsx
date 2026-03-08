import { motion } from 'framer-motion';

function formatValue(val, type) {
  if (type === 'percent') return `${(val * 100).toFixed(1)}%`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return val.toLocaleString();
  return val.toString();
}

export default function BreakEvenUnits({ breakEvenUnits, delay = 0 }) {
  if (!breakEvenUnits || breakEvenUnits.length === 0) return null;

  const isFloor = breakEvenUnits[0]?.direction === 'floor';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 md:p-6"
    >
      <h3 className="font-heading font-bold text-navy text-lg uppercase tracking-wide mb-1">
        Break-Even Unit Economics
      </h3>
      <div className="h-0.5 bg-navy/20 mt-1 mb-3" />
      <p className="text-gray-500 text-xs mb-4">
        {isFloor
          ? 'Minimum input values before NPV turns negative (safety margin from current values)'
          : 'Target input values needed for NPV to turn positive'}
      </p>

      <div className="space-y-3">
        {breakEvenUnits.map((item, i) => {
          const pct = item.marginPct;
          const isHealthy = isFloor ? pct > 20 : pct <= 0;
          const barWidth = Math.min(Math.abs(pct), 100);

          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.05 + i * 0.05 }}
              className="rounded-lg border border-gray-100 p-3"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-gray-700 text-sm font-medium truncate mr-2">{item.label}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isFloor
                    ? pct > 30 ? 'bg-emerald-100 text-emerald-700'
                      : pct > 10 ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {isFloor
                    ? `${pct > 0 ? '+' : ''}${pct}% margin`
                    : `${pct < 0 ? '' : '+'}${pct}% needed`}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Break-even: <strong className="text-navy">{formatValue(item.breakEvenValue, item.type)}</strong></span>
                    <span>Current: <strong className="text-navy">{formatValue(item.currentValue, item.type)}</strong></span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isFloor
                          ? pct > 30 ? 'bg-emerald-400' : pct > 10 ? 'bg-amber-400' : 'bg-red-400'
                          : 'bg-blue-400'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
