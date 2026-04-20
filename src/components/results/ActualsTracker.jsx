import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { formatCompact } from '../../utils/formatters';

export default function ActualsTracker({ results }) {
  const [actuals, setActuals] = useState({});
  const [editingPeriod, setEditingPeriod] = useState(null);

  const projections = results.scenarios.base.projections;
  if (!projections || projections.length === 0) return null;

  const periods = [
    { id: 'h1y1', label: 'H1 Year 1', month: 6, yearIdx: 0, pct: 0.30 },
    { id: 'h2y1', label: 'H2 Year 1', month: 12, yearIdx: 0, pct: 0.70 },
    { id: 'h1y2', label: 'H1 Year 2', month: 18, yearIdx: 1, pct: 0.45 },
    { id: 'h2y2', label: 'H2 Year 2', month: 24, yearIdx: 1, pct: 1.0 },
  ];

  const handleSave = (periodId, data) => {
    setActuals(prev => ({ ...prev, [periodId]: data }));
    setEditingPeriod(null);
  };

  const trackedPeriods = periods.map(p => {
    const projected = projections[p.yearIdx];
    const projectedSavings = Math.round(projected.grossSavings * p.pct);
    const actual = actuals[p.id];
    let status = 'pending';
    if (actual) {
      const variance = (actual.savings - projectedSavings) / projectedSavings;
      status = variance >= -0.1 ? 'on-track' : variance >= -0.25 ? 'behind' : 'at-risk';
    }
    return { ...p, projectedSavings, actual, status };
  });

  const hasActuals = Object.keys(actuals).length > 0;

  const reforecast = useMemo(() => {
    if (!hasActuals) return null;
    const completed = trackedPeriods.filter(p => p.actual);
    if (completed.length === 0) return null;
    const avgVar = completed.reduce((sum, p) =>
      sum + (p.actual.savings - p.projectedSavings) / p.projectedSavings, 0
    ) / completed.length;
    return {
      variancePct: avgVar,
      adjustedNPV: results.scenarios.base.npv * (1 + avgVar),
      adjustedPayback: Math.max(0, Math.min(61, Math.round(results.scenarios.base.paybackMonths * (1 / (1 + avgVar))))),
      direction: avgVar >= 0 ? 'ahead' : 'behind',
    };
  }, [actuals, trackedPeriods, hasActuals, results]);

  const styles = {
    'pending': { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-400', label: 'Not reported' },
    'on-track': { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: 'On Track' },
    'behind': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: 'Behind Plan' },
    'at-risk': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'At Risk' },
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Enter actual results as they come in. The model reforecasts remaining years automatically.
      </p>

      {reforecast && (
        <div className={`rounded-xl p-4 text-center ${
          reforecast.direction === 'ahead' ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
        }`}>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Reforecast Based on Actuals</p>
          <div className="flex items-center justify-center gap-6">
            <div>
              <p className="text-xs text-gray-500">Adjusted NPV</p>
              <p className={`font-mono text-xl font-bold ${reforecast.adjustedNPV >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {formatCompact(reforecast.adjustedNPV)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Variance</p>
              <p className={`font-mono text-xl font-bold ${reforecast.variancePct >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {reforecast.variancePct >= 0 ? '+' : ''}{Math.round(reforecast.variancePct * 100)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Adj. Payback</p>
              <p className="font-mono text-xl font-bold text-navy">{reforecast.adjustedPayback}mo</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {trackedPeriods.map(p => {
          const s = styles[p.status];
          return (
            <div key={p.id} className={`rounded-xl border ${s.border} ${s.bg} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-semibold text-navy text-sm">{p.label}</span>
                  <span className="text-xs text-gray-400 ml-2">Month {p.month}</span>
                </div>
                <span className={`text-xs font-bold ${s.text}`}>{s.label}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-gray-500">Projected</p>
                  <p className="font-mono font-bold text-navy">{formatCompact(p.projectedSavings)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Actual</p>
                  {p.actual ? (
                    <p className={`font-mono font-bold ${p.actual.savings >= p.projectedSavings ? 'text-emerald-700' : 'text-red-600'}`}>
                      {formatCompact(p.actual.savings)}
                    </p>
                  ) : (
                    <p className="text-gray-300 italic">—</p>
                  )}
                </div>
              </div>
              {editingPeriod === p.id ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500">Actual Savings ($)</label>
                    <input
                      type="number"
                      defaultValue={p.actual?.savings || ''}
                      id={`actual-${p.id}`}
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs font-mono focus:ring-1 focus:ring-gold focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const val = Number(document.getElementById(`actual-${p.id}`).value) || 0;
                      handleSave(p.id, { savings: val, costs: 0 });
                    }}
                    className="bg-gold text-navy text-xs font-bold px-3 py-1.5 rounded cursor-pointer hover:bg-gold-light transition-colors"
                  >
                    Save
                  </button>
                  <button onClick={() => setEditingPeriod(null)} className="text-gray-400 text-xs px-2 py-1.5 cursor-pointer">Cancel</button>
                </motion.div>
              ) : (
                <button
                  onClick={() => setEditingPeriod(p.id)}
                  className="mt-2 text-xs text-gold font-medium hover:text-navy transition-colors cursor-pointer"
                >
                  {p.actual ? 'Update' : 'Enter actuals'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
