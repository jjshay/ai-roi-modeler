import { motion } from 'framer-motion';
import { formatCurrency, formatPercent } from '../../utils/formatters';

function BLRow({ label, value, sub, valueClass = 'text-white' }) {
  return (
    <div className="flex justify-between items-baseline py-1.5">
      <div>
        <span className="text-gray-300 text-sm">{label}</span>
        {sub && <span className="text-gray-500 text-xs ml-2">{sub}</span>}
      </div>
      <span className={`font-mono font-bold text-lg ${valueClass}`}>{value}</span>
    </div>
  );
}

export default function BottomLine({ results, delay = 0 }) {
  const base = results.scenarios.base;
  const lastYear = base.projections[base.projections.length - 1];
  const fiveYearNet = lastYear?.netCumulative || 0;
  const roic = base.roic || 0;
  const ci = results.confidenceIntervals;
  const maxMonths = (results.dcfYears || 5) * 12;

  const paybackDisplay = base.paybackMonths > maxMonths
    ? `>${maxMonths} months (no break-even)`
    : `${base.paybackMonths} months`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5, type: 'spring' }}
      className="bg-navy text-white rounded-xl p-5 md:p-6"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-heading text-gold text-sm uppercase tracking-widest">
          Bottom Line (Base Case)
        </h3>
        <span className="text-gray-400 text-xs">
          {results.dcfYears || 5}-Year DCF @ {formatPercent(results.discountRate || 0.10)} discount rate
        </span>
      </div>

      <div className="space-y-0">
        <BLRow label="Payback" value={paybackDisplay} />
        {ci && (
          <div className="flex justify-end -mt-1 mb-1">
            <span className="text-gray-500 text-xs">Range: {ci.payback.p75 > maxMonths ? `>${maxMonths}` : ci.payback.p75}-{ci.payback.p25 > maxMonths ? `>${maxMonths}` : ci.payback.p25} mo</span>
          </div>
        )}
        <BLRow
          label={`${results.dcfYears || 5}-Year Net Savings`}
          value={formatCurrency(fiveYearNet)}
          valueClass={fiveYearNet >= 0 ? 'text-optimistic' : 'text-conservative'}
        />
        <BLRow
          label="ROIC"
          sub="net profit / total capital"
          value={<>{formatPercent(roic)}{base.roicCapped && <span className="text-amber-400 text-sm ml-1">*</span>}</>}
          valueClass={roic >= 0 ? 'text-gold' : 'text-conservative'}
        />
        {ci && (
          <div className="flex justify-end -mt-1 mb-1">
            <span className="text-gray-500 text-xs">P25-P75: {formatPercent(ci.roic.p25)}-{formatPercent(ci.roic.p75)}</span>
          </div>
        )}
        <BLRow
          label="IRR"
          value={<>{isFinite(base.irr) ? formatPercent(base.irr) : 'N/A'}{base.irrCapped && <span className="text-amber-400 text-sm ml-1">*</span>}</>}
        />
      </div>

      {/* Investment breakdown */}
      <div className="mt-3 pt-3 border-t border-white/10 space-y-0">
        <BLRow label="Upfront investment" value={formatCurrency(results.upfrontInvestment)} />
        <BLRow label="Phased separation" value={formatCurrency(results.oneTimeCosts?.totalSeparationCost || 0)} />
        <div className="flex justify-between items-baseline py-1.5 border-t border-white/10 mt-1 pt-2">
          <span className="text-gray-200 text-sm font-medium">Total capital deployed</span>
          <span className="font-mono font-bold text-lg text-gold">{formatCurrency(results.totalInvestment)}</span>
        </div>
      </div>

      {/* Expected NPV (probability-weighted) */}
      {results.expectedNPV != null && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex justify-between items-baseline">
            <span className="text-gray-400 text-sm">Expected NPV</span>
            <span className={`font-mono font-bold text-lg ${results.expectedNPV >= 0 ? 'text-gold' : 'text-conservative'}`}>
              {formatCurrency(results.expectedNPV)}
            </span>
          </div>
          <div className="flex justify-end -mt-0.5 mb-1">
            <span className="text-gray-500 text-xs">Probability-weighted (25/50/25)</span>
          </div>
        </div>
      )}

      {/* NPV confidence range */}
      {ci && (
        <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-baseline">
          <span className="text-gray-400 text-sm">NPV range (P25-P75)</span>
          <span className="text-gray-300 font-mono text-sm">
            {formatCurrency(ci.npv.p25)} to {formatCurrency(ci.npv.p75)}
          </span>
        </div>
      )}

      {/* Threshold / viability indicator */}
      {results.thresholdAnalysis && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex justify-between items-baseline py-1">
            <span className="text-gray-400 text-sm">Path to positive NPV</span>
            <span className={`font-mono text-sm font-semibold ${results.thresholdAnalysis.isViable ? 'text-emerald-400' : 'text-red-400'}`}>
              {results.thresholdAnalysis.isViable ? 'Viable' : 'At Risk'}
            </span>
          </div>
          {results.thresholdAnalysis.riskMargin !== null && (
            <div className="flex justify-end -mt-0.5 mb-1">
              <span className="text-gray-500 text-xs">
                {results.thresholdAnalysis.riskMargin > 0
                  ? `${(results.thresholdAnalysis.riskMargin * 100).toFixed(0)}pp margin before NPV turns negative`
                  : `Breakeven requires ${(results.thresholdAnalysis.breakevenRiskMultiplier * 100).toFixed(0)}% risk factor (current: ${(results.thresholdAnalysis.currentRiskMultiplier * 100).toFixed(0)}%)`
                }
              </span>
            </div>
          )}
        </div>
      )}

      {/* Negative NPV explanation */}
      {results.expectedNPV < 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="bg-red-900/30 rounded-lg px-4 py-3">
            <p className="text-red-300 text-sm font-medium mb-2">
              Why NPV is negative
            </p>
            <ul className="text-red-200/80 text-xs space-y-1">
              <li>• Implementation costs ({formatCurrency(results.upfrontInvestment)}) exceed projected savings</li>
              <li>• Ongoing AI costs ({formatCurrency(results.aiCostModel?.baseOngoingCost || 0)}/yr) reduce net benefits</li>
              <li>• Risk factors discount savings by {formatPercent(1 - (results.riskAdjustments?.riskMultiplier || 0.7))}</li>
            </ul>
            <p className="text-red-200/60 text-xs mt-2 pt-2 border-t border-red-800/50">
              To improve NPV: increase team size, improve data readiness, secure exec sponsorship, or reduce implementation scope.
            </p>
          </div>
        </div>
      )}

      {(base.roicCapped || base.irrCapped) && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <span className="text-amber-400 text-xs">* Capped at empirical return ceiling (ROIC: 100%, IRR: 75%)</span>
        </div>
      )}
    </motion.div>
  );
}
