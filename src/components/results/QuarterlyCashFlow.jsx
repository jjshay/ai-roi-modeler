import { formatCurrency, formatCompact } from '../../utils/formatters';

/**
 * QuarterlyCashFlow — Breaks annual projections into quarterly view for CFO budgeting.
 * Shows investment outflows, savings inflows, and cumulative position by quarter.
 */
export default function QuarterlyCashFlow({ results }) {
  const { scenarios, upfrontInvestment, gateStructure } = results;
  const projections = scenarios.base.projections;
  if (!projections || projections.length === 0) return null;

  // Build quarterly breakdown from annual projections + gate structure
  const quarters = [];
  let cumulative = 0;

  for (let yr = 0; yr < projections.length; yr++) {
    const p = projections[yr];
    // Quarter weighting: implementation-heavy early, savings ramp later
    // Q1-Q2 of Year 1: mostly investment outflow; Q3-Q4: savings begin
    const qWeights = yr === 0
      ? [0.10, 0.15, 0.30, 0.45]   // Year 1: slow ramp
      : [0.22, 0.25, 0.27, 0.26];  // Subsequent years: roughly even

    const investWeight = yr === 0
      ? [0.50, 0.30, 0.15, 0.05]   // Upfront costs front-loaded
      : [0.25, 0.25, 0.25, 0.25];

    for (let q = 0; q < 4; q++) {
      const qSavings = p.grossSavings * qWeights[q];
      const qOngoing = p.ongoingCost * 0.25; // Even quarterly
      const qSeparation = p.separationCost * investWeight[q];
      const qUpfront = yr === 0 && q === 0 ? upfrontInvestment : 0;
      const qNet = qSavings - qOngoing - qSeparation - qUpfront;
      cumulative += qNet;

      quarters.push({
        label: `FY${yr + 1} Q${q + 1}`,
        year: yr + 1,
        quarter: q + 1,
        grossSavings: qSavings,
        ongoingCost: qOngoing,
        separationCost: qSeparation,
        upfrontCost: qUpfront,
        totalOutflow: qOngoing + qSeparation + qUpfront,
        netCashFlow: qNet,
        cumulative,
      });
    }
  }

  // Find breakeven quarter
  const breakevenQ = quarters.findIndex(q => q.cumulative >= 0);

  // Find gate boundaries
  const gateBoundaries = (gateStructure || []).map(g => ({
    label: g.label,
    endMonth: g.monthRange[1],
    endQuarter: Math.ceil(g.monthRange[1] / 3),
    investment: g.investment,
  }));

  return (
    <div className="space-y-4">
      {/* Summary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-center">
          <p className="text-[10px] font-medium text-red-600 uppercase tracking-wide">Peak Cash Outlay</p>
          <p className="text-lg font-bold font-mono text-red-700">
            {formatCompact(Math.abs(Math.min(...quarters.map(q => q.cumulative))))}
          </p>
          <p className="text-[10px] text-red-500">Maximum capital at risk</p>
        </div>
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center">
          <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wide">Cash Positive</p>
          <p className="text-lg font-bold font-mono text-emerald-700">
            {breakevenQ >= 0 ? quarters[breakevenQ].label : 'Beyond FY5'}
          </p>
          <p className="text-[10px] text-emerald-500">Quarter cumulative turns positive</p>
        </div>
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-center">
          <p className="text-[10px] font-medium text-blue-600 uppercase tracking-wide">FY1 Net Position</p>
          <p className={`text-lg font-bold font-mono ${quarters[3]?.cumulative >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {formatCompact(quarters[3]?.cumulative || 0)}
          </p>
          <p className="text-[10px] text-blue-500">End of first fiscal year</p>
        </div>
        <div className="rounded-lg bg-navy/5 border border-navy/10 p-3 text-center">
          <p className="text-[10px] font-medium text-navy/60 uppercase tracking-wide">FY5 Cumulative</p>
          <p className="text-lg font-bold font-mono text-navy">
            {formatCompact(quarters[quarters.length - 1]?.cumulative || 0)}
          </p>
          <p className="text-[10px] text-navy/40">Total 5-year net cash flow</p>
        </div>
      </div>

      {/* Quarterly table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-navy/10">
              <th className="text-left py-2 font-medium text-gray-500">Quarter</th>
              <th className="text-right py-2 font-medium text-emerald-600">Savings</th>
              <th className="text-right py-2 font-medium text-red-500">Costs</th>
              <th className="text-right py-2 font-medium text-navy">Net</th>
              <th className="text-right py-2 font-medium text-gray-500">Cumulative</th>
            </tr>
          </thead>
          <tbody>
            {quarters.map((q, i) => {
              const isYearStart = q.quarter === 1;
              const isGateBoundary = gateBoundaries.some(g => g.endQuarter === i + 1);
              const isBreakeven = i === breakevenQ;

              return (
                <tr
                  key={q.label}
                  className={`border-b border-gray-100 ${
                    isYearStart ? 'border-t-2 border-t-navy/10' : ''
                  } ${isBreakeven ? 'bg-emerald-50' : ''} ${isGateBoundary ? 'bg-amber-50' : ''}`}
                >
                  <td className="py-1.5 font-medium text-navy">
                    {q.label}
                    {isBreakeven && <span className="ml-1 text-[9px] text-emerald-600 font-bold">BREAKEVEN</span>}
                    {isGateBoundary && <span className="ml-1 text-[9px] text-amber-600 font-bold">GATE</span>}
                  </td>
                  <td className="py-1.5 text-right font-mono text-emerald-600">
                    {formatCompact(q.grossSavings)}
                  </td>
                  <td className="py-1.5 text-right font-mono text-red-500">
                    ({formatCompact(q.totalOutflow)})
                  </td>
                  <td className={`py-1.5 text-right font-mono font-medium ${q.netCashFlow >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatCompact(q.netCashFlow)}
                  </td>
                  <td className={`py-1.5 text-right font-mono ${q.cumulative >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatCompact(q.cumulative)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-gray-400 pt-2 border-t border-gray-100">
        Quarterly allocation uses weighted phasing: Year 1 savings ramp 10/15/30/45% across quarters; upfront costs front-loaded 50/30/15/5%.
        Ongoing costs distributed evenly. Actuals will vary based on implementation timeline and adoption velocity.
      </p>
    </div>
  );
}
