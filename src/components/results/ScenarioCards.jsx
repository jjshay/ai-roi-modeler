import { motion } from 'framer-motion';
import { formatCurrency, formatPercent } from '../../utils/formatters';

const scenarioColors = {
  conservative: { bg: 'bg-red-50', border: 'border-conservative', text: 'text-conservative', bar: 'bg-red-400', label: 'Conservative (-30%)' },
  base: { bg: 'bg-amber-50', border: 'border-base-case', text: 'text-base-case', bar: 'bg-amber-400', label: 'Base Case (Expected)' },
  optimistic: { bg: 'bg-green-50', border: 'border-optimistic', text: 'text-optimistic', bar: 'bg-emerald-400', label: 'Optimistic (+20%)' },
};

export default function ScenarioCards({ scenarios, delay = 0 }) {
  // Find max gross savings across all scenarios/years for bar scaling
  const allSavings = Object.values(scenarios).flatMap(s => s.projections.map(yr => yr.grossSavings));
  const maxSavings = Math.max(...allSavings, 1);

  return (
    <div className="space-y-4">
      {Object.entries(scenarios).map(([key, scenario], i) => {
        const color = scenarioColors[key];
        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay + i * 0.2, duration: 0.5 }}
            className={`${color.bg} border-2 ${color.border} rounded-xl p-5`}
          >
            <h4 className={`font-heading font-bold text-sm uppercase tracking-wide ${color.text} mb-4`}>
              {color.label}
            </h4>

            {/* Year-by-year bar chart */}
            <div className="space-y-2 mb-4">
              {scenario.projections.map((yr) => {
                const barPct = maxSavings > 0 ? (yr.grossSavings / maxSavings) * 100 : 0;
                return (
                  <div key={yr.year} className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs w-8 shrink-0">Yr {yr.year}</span>
                    <div className="flex-1 h-5 bg-white/60 rounded overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barPct}%` }}
                        transition={{ delay: delay + i * 0.2 + yr.year * 0.08, duration: 0.5, ease: 'easeOut' }}
                        className={`h-full ${color.bar} rounded opacity-70`}
                      />
                    </div>
                    <span className="font-mono font-semibold text-navy text-xs w-20 text-right">
                      {formatCurrency(yr.grossSavings)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-gray-200 pt-3 grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-500 text-xs block">NPV</span>
                <span className={`font-mono font-bold text-sm ${scenario.npv >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(scenario.npv)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 text-xs block">Payback</span>
                <span className="font-mono font-bold text-sm text-navy">
                  {scenario.paybackMonths > 60 ? '>60 mo' : `${scenario.paybackMonths} mo`}
                </span>
              </div>
              <div>
                <span className="text-gray-500 text-xs block">ROIC</span>
                <span className="font-mono font-bold text-sm text-navy">
                  {formatPercent(scenario.roic)}
                  {scenario.roicCapped && <span className="text-amber-500 text-[10px] ml-0.5">*</span>}
                </span>
              </div>
              <div>
                <span className="text-gray-500 text-xs block">IRR</span>
                <span className="font-mono font-bold text-sm text-navy">
                  {isFinite(scenario.irr) ? formatPercent(scenario.irr) : 'N/A'}
                  {scenario.irrCapped && <span className="text-amber-500 text-[10px] ml-0.5">*</span>}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
