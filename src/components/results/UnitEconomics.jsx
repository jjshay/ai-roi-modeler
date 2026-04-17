import { formatCompact } from '../../utils/formatters';

export default function UnitEconomics({ results }) {
  const { unitEconomics, costVsHeadcountMatrix } = results;
  if (!unitEconomics || !costVsHeadcountMatrix) return null;

  const { grid, costLabels, teamLabels, baseNPV } = costVsHeadcountMatrix;

  return (
    <div className="space-y-6">
      {/* Unit Economics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-center">
          <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wide">Per Person Saved</p>
          <p className="text-xl font-bold font-mono text-emerald-700">{formatCompact(unitEconomics.netValuePerPerson)}</p>
          <p className="text-[10px] text-emerald-500">/year net (after AI costs)</p>
        </div>
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-center">
          <p className="text-[10px] font-medium text-red-600 uppercase tracking-wide">Per Person Added</p>
          <p className="text-xl font-bold font-mono text-red-700">-{formatCompact(unitEconomics.costPerAdditionalPerson)}</p>
          <p className="text-[10px] text-red-500">/year cost (fully loaded)</p>
        </div>
        <div className="rounded-lg bg-navy/5 border border-navy/10 p-4 text-center">
          <p className="text-[10px] font-medium text-navy/60 uppercase tracking-wide">Per 1% Efficiency</p>
          <p className="text-xl font-bold font-mono text-navy">{formatCompact(unitEconomics.savingsPerEfficiencyPct)}</p>
          <p className="text-[10px] text-navy/40">/year incremental savings</p>
        </div>
      </div>

      {/* Plain English */}
      <div className="rounded-lg bg-gray-50 p-4 space-y-1 text-xs text-gray-700">
        <p>{unitEconomics.summary.positive}</p>
        <p>{unitEconomics.summary.negative}</p>
        <p>{unitEconomics.summary.efficiency}</p>
        {unitEconomics.breakEvenTeamSize && (
          <p className="font-semibold text-navy">Minimum team size for positive ROI: {unitEconomics.breakEvenTeamSize} people</p>
        )}
      </div>

      {/* 2D Sensitivity Matrix */}
      <div>
        <p className="text-xs font-bold text-navy mb-2 uppercase tracking-wide">
          NPV Sensitivity: AI Cost vs Team Size
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr>
                <th className="text-left py-2 px-2 bg-navy text-white font-medium rounded-tl-lg">AI Cost ↓ / Team →</th>
                {teamLabels.map((label, j) => (
                  <th key={j} className="text-center py-2 px-2 bg-navy text-white font-medium last:rounded-tr-lg">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="py-1.5 px-2 font-medium text-navy border-r border-gray-200">{costLabels[i]}</td>
                  {row.map((npv, j) => {
                    const isBase = costLabels[i] === '100% AI Cost' && teamLabels[j].includes('current');
                    return (
                      <td
                        key={j}
                        className={`py-1.5 px-2 text-center font-mono ${
                          isBase
                            ? 'bg-gold/20 font-bold text-navy border-2 border-gold'
                            : npv >= 0
                              ? 'text-emerald-700'
                              : 'text-red-600'
                        }`}
                      >
                        {formatCompact(npv)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[9px] text-gray-400 mt-2">
          Gold cell = current scenario. Green = positive NPV. Red = negative NPV.
          Each cell shows 5-year NPV at that AI cost level and team size combination.
        </p>
      </div>
    </div>
  );
}
