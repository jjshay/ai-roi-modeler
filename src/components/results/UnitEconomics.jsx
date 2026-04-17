import { motion } from 'framer-motion';
import { formatCompact } from '../../utils/formatters';

function HeatCell({ value, isBase, delay }) {
  const intensity = Math.min(Math.abs(value) / 2000000, 1);
  const bg = isBase
    ? 'bg-gradient-to-br from-gold/30 to-gold/10 ring-2 ring-gold'
    : value >= 0
      ? `bg-emerald-${intensity > 0.6 ? '100' : '50'}`
      : `bg-red-${intensity > 0.6 ? '100' : '50'}`;

  return (
    <motion.td
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay * 0.02, duration: 0.2 }}
      className={`py-2.5 px-1 text-center font-mono text-[11px] font-semibold transition-colors ${bg} ${
        isBase ? 'text-navy' : value >= 0 ? 'text-emerald-800' : 'text-red-700'
      }`}
    >
      {formatCompact(value)}
    </motion.td>
  );
}

export default function UnitEconomics({ results }) {
  const { unitEconomics, costVsHeadcountMatrix } = results;
  if (!unitEconomics || !costVsHeadcountMatrix) return null;

  const { grid, costLabels, teamLabels } = costVsHeadcountMatrix;

  const cards = [
    {
      label: 'Per Person Saved',
      value: formatCompact(unitEconomics.netValuePerPerson),
      sub: '/year net savings',
      gradient: 'from-emerald-500 to-emerald-600',
      icon: '\u2193',
    },
    {
      label: 'Per Person Added',
      value: `-${formatCompact(unitEconomics.costPerAdditionalPerson)}`,
      sub: '/year fully loaded',
      gradient: 'from-red-500 to-red-600',
      icon: '\u2191',
    },
    {
      label: 'Per 1% Efficiency',
      value: formatCompact(unitEconomics.savingsPerEfficiencyPct),
      sub: '/year incremental',
      gradient: 'from-navy to-navy-light',
      icon: '%',
    },
  ];

  return (
    <div className="space-y-6">

      {/* Hero Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-5 text-center shadow-lg`}
          >
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-white text-sm font-bold mb-2">
              {card.icon}
            </div>
            <p className="text-white/70 text-[10px] font-medium uppercase tracking-widest">{card.label}</p>
            <p className="text-white text-2xl font-bold font-mono mt-1">{card.value}</p>
            <p className="text-white/50 text-[10px] mt-0.5">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Break-even callout */}
      {unitEconomics.breakEvenTeamSize && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-3 rounded-xl bg-navy/5 border border-navy/10 px-4 py-3"
        >
          <div className="shrink-0 w-10 h-10 rounded-full bg-navy flex items-center justify-center">
            <span className="text-gold font-bold text-sm">{unitEconomics.breakEvenTeamSize}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-navy">Minimum {unitEconomics.breakEvenTeamSize} people for positive ROI</p>
            <p className="text-xs text-gray-500">Below this team size, AI costs exceed savings</p>
          </div>
        </motion.div>
      )}

      {/* 2D Sensitivity Heatmap */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-navy">NPV Sensitivity Matrix</p>
            <p className="text-[10px] text-gray-500">What happens when AI costs or team size change</p>
          </div>
          <div className="flex items-center gap-2 text-[9px]">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200" /> Profitable</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-200" /> Unprofitable</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gold/30 ring-1 ring-gold" /> Current</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left py-3 px-3 bg-navy text-white text-[10px] font-semibold uppercase tracking-wider rounded-tl-xl">
                  AI Cost
                </th>
                {teamLabels.map((label, j) => (
                  <th key={j} className={`text-center py-3 px-2 bg-navy text-white text-[10px] font-medium ${j === teamLabels.length - 1 ? 'rounded-tr-xl' : ''}`}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, i) => {
                const isBaseRow = costLabels[i] === '100% AI Cost';
                return (
                  <tr key={i} className={isBaseRow ? 'bg-navy/[0.03]' : ''}>
                    <td className={`py-2.5 px-3 text-[11px] font-semibold border-r border-gray-100 ${
                      isBaseRow ? 'text-navy bg-navy/5' : 'text-gray-700'
                    }`}>
                      {costLabels[i]}
                      {isBaseRow && <span className="ml-1 text-[8px] text-gold font-bold">BASE</span>}
                    </td>
                    {row.map((npv, j) => {
                      const isBase = isBaseRow && teamLabels[j].includes('current');
                      return (
                        <HeatCell
                          key={j}
                          value={npv}
                          isBase={isBase}
                          delay={i * teamLabels.length + j}
                        />
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-start gap-4 mt-3 text-[9px] text-gray-400">
          <p className="flex-1">
            <span className="font-semibold text-gray-500">How to read:</span> Find your AI cost scenario (row) and team size scenario (column). The cell shows your 5-year NPV at that combination.
          </p>
          <p className="flex-1">
            <span className="font-semibold text-gray-500">Key insight:</span> {unitEconomics.summary.positive}
          </p>
        </div>
      </div>
    </div>
  );
}
