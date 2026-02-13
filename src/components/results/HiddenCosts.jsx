import { motion } from 'framer-motion';
import { formatCurrency, formatPercent } from '../../utils/formatters';

const hiddenLabels = {
  changeManagement: 'Change management',
  culturalResistance: 'Cultural resistance & adoption friction',
  dataCleanup: 'Data cleanup / preparation',
  integrationTesting: 'Integration / testing',
  productivityDip: 'Productivity dip (3 months at 25% reduced output)',
};

const oneTimeLabels = {
  legalComplianceCost: 'Legal, compliance & employment law',
  securityAuditCost: 'Security, privacy & third-party audit',
  contingencyReserve: 'Contingency reserve (20%)',
  vendorTerminationCost: 'Vendor contract termination',
};

export default function HiddenCosts({ hiddenCosts, oneTimeCosts, vendorLockIn, rdTaxCredit, delay = 0 }) {
  const hiddenItems = Object.entries(hiddenLabels).filter(([key]) => hiddenCosts[key] > 0);
  const oneTimeItems = oneTimeCosts
    ? Object.entries(oneTimeLabels).filter(([key]) => oneTimeCosts[key] > 0)
    : [];

  return (
    <div className="space-y-4">
      {/* SEPARATION COSTS (phased — not upfront) */}
      {oneTimeCosts && oneTimeCosts.totalSeparationCost > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay, duration: 0.5 }}
          className="bg-red-50 border border-red-200 rounded-xl p-5"
        >
          <h4 className="font-heading font-bold text-navy flex items-center gap-2 mb-2">
            Workforce Transition Costs (Phased Over Years 2-5)
          </h4>
          <p className="text-gray-500 text-xs mb-3">
            {oneTimeCosts.displacedFTEs} of {oneTimeCosts.displacedFTEs + oneTimeCosts.retainedFTEs} roles
            phased out over 4 years ({oneTimeCosts.retainedFTEs} retained — {formatPercent(1 - oneTimeCosts.maxHeadcountReduction)} always human).
            Year 1 is enhancement only — no one is let go Day 1. [15][21]
          </p>

          {/* Separation cost breakdown */}
          {oneTimeCosts.separationBreakdown && (
            <div className="space-y-1.5 mb-3">
              {Object.entries(oneTimeCosts.separationBreakdown).map(([key, item], i) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: delay + 0.05 + i * 0.05 }}
                  className="flex justify-between items-center"
                >
                  <span className="text-gray-600 text-sm">{item.label}</span>
                  <span className="font-mono text-sm text-navy">
                    {formatCurrency(item.total)}
                  </span>
                </motion.div>
              ))}
            </div>
          )}

          <div className="border-t border-red-200 pt-2 flex justify-between items-center mb-3">
            <span className="text-gray-600 text-sm font-medium">
              Total separation ({formatCurrency(oneTimeCosts.separationCostPerFTE)}/FTE)
            </span>
            <span className="font-mono font-bold text-navy">
              {formatCurrency(oneTimeCosts.totalSeparationCost)}
            </span>
          </div>

          {/* Phasing schedule */}
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-gray-500 text-xs font-medium mb-2">Phasing Schedule:</p>
            <div className="grid grid-cols-5 gap-1 text-center">
              {oneTimeCosts.separationPhasing.map((pct, i) => (
                <div key={i} className="text-xs">
                  <div className="font-semibold text-navy">Yr {i + 1}</div>
                  <div className="text-gray-500">{pct === 0 ? 'None' : formatPercent(pct)}</div>
                  <div className="font-mono text-navy text-[10px]">
                    {pct > 0 ? formatCurrency(oneTimeCosts.totalSeparationCost * pct) : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ONE-TIME UPFRONT COSTS */}
      {oneTimeItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + 0.2, duration: 0.5 }}
          className="bg-blue-50 border border-blue-200 rounded-xl p-5"
        >
          <h4 className="font-heading font-bold text-navy flex items-center gap-2 mb-4">
            One-Time Upfront Costs
          </h4>

          <div className="space-y-2 mb-4">
            {oneTimeItems.map(([key, label], i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay + 0.3 + i * 0.1 }}
                className="flex justify-between items-center"
              >
                <span className="text-gray-600 text-sm">{label}</span>
                <span className="font-mono font-semibold text-navy">
                  {formatCurrency(oneTimeCosts[key])}
                </span>
              </motion.div>
            ))}
          </div>

          <div className="border-t border-blue-200 pt-3 flex justify-between items-center">
            <span className="text-gray-600 text-sm font-medium">Total One-Time Upfront</span>
            <span className="font-mono font-bold text-lg text-navy">
              {formatCurrency(oneTimeCosts.totalOneTimeCosts)}
            </span>
          </div>
        </motion.div>
      )}

      {/* HIDDEN COSTS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay + 0.4, duration: 0.5 }}
        className="bg-amber-50 border border-amber-200 rounded-xl p-5"
      >
        <h4 className="font-heading font-bold text-navy flex items-center gap-2 mb-4">
          Transition & Friction Costs
        </h4>

        <div className="space-y-2 mb-4">
          {hiddenItems.map(([key, label], i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.5 + i * 0.1 }}
              className="flex justify-between items-center"
            >
              <span className="text-gray-600 text-sm">{label}</span>
              <span className="font-mono font-semibold text-navy">
                {formatCurrency(hiddenCosts[key])}
              </span>
            </motion.div>
          ))}
        </div>

        <div className="border-t border-amber-200 pt-3 flex justify-between items-center">
          <span className="text-gray-600 text-sm font-medium">Total Transition Costs</span>
          <span className="font-mono font-bold text-lg text-navy">
            {formatCurrency(hiddenCosts.totalHidden)}
          </span>
        </div>
      </motion.div>

      {/* VENDOR LOCK-IN (quantified) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay + 0.6, duration: 0.5 }}
        className="bg-purple-50 border border-purple-200 rounded-xl p-5"
      >
        <h4 className="font-heading font-bold text-navy flex items-center gap-2 mb-3">
          Vendor Lock-in & Escalation Risk
        </h4>

        <div className="space-y-2 mb-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Switching cost ({formatPercent(vendorLockIn.switchingRate)} of impl)</span>
            <span className="font-mono font-semibold text-navy">{formatCurrency(vendorLockIn.switchingCost)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Cost escalation (Yr 1-2 / Yr 3-5)</span>
            <span className="font-mono font-semibold text-red-600">12% / 7%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Year 5 ongoing cost</span>
            <span className="font-mono font-semibold text-navy">{formatCurrency(vendorLockIn.year5OngoingCost)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Total 5-year operating cost</span>
            <span className="font-mono font-bold text-navy">{formatCurrency(vendorLockIn.totalOngoing5Year)}</span>
          </div>
        </div>

        <div className="border-t border-purple-200 pt-2 flex justify-between items-center">
          <span className="text-gray-600 text-sm">Lock-in risk level</span>
          <span
            className={`text-sm font-semibold px-3 py-1 rounded-full ${
              vendorLockIn.level === 'High'
                ? 'bg-red-100 text-red-700'
                : vendorLockIn.level === 'Medium'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-green-100 text-green-700'
            }`}
          >
            {vendorLockIn.level}
          </span>
        </div>
        <p className="text-gray-400 text-xs mt-2">
          Vendors ratchet up prices after lock-in. Includes required adjacent product purchases (25% of license). [22]
        </p>
      </motion.div>

      {/* R&D TAX CREDIT — simplified display */}
      {rdTaxCredit && rdTaxCredit.eligible && rdTaxCredit.totalCredit > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + 0.8, duration: 0.5 }}
          className="bg-emerald-50 border border-emerald-200 rounded-xl p-5"
        >
          <h4 className="font-heading font-bold text-navy flex items-center gap-2 mb-3">
            Potential R&D Tax Credit
          </h4>
          <p className="text-gray-500 text-xs mb-3">
            Informational only — not factored into NPV/IRR/ROIC to maintain conservative projections. Consult your tax advisor. [19]
          </p>

          <div className="space-y-2 mb-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm">Federal credit ({formatPercent(rdTaxCredit.federalRate)})</span>
              <span className="font-mono font-semibold text-emerald-700">{formatCurrency(rdTaxCredit.federalCredit)}</span>
            </div>
            {rdTaxCredit.stateRate > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">{rdTaxCredit.companyState} credit ({formatPercent(rdTaxCredit.stateRate)})</span>
                <span className="font-mono font-semibold text-emerald-700">{formatCurrency(rdTaxCredit.stateCredit)}</span>
              </div>
            )}
          </div>

          <div className="border-t border-emerald-200 pt-3 flex justify-between items-center">
            <span className="text-gray-600 text-sm font-medium">Potential Total Credit</span>
            <span className="font-mono font-bold text-lg text-emerald-700">
              {formatCurrency(rdTaxCredit.totalCredit)}
            </span>
          </div>
          <p className="text-gray-400 text-xs mt-1">
            Based on {formatCurrency(rdTaxCredit.qualifiedExpenses)} in qualified R&D expenses (65% of implementation cost)
          </p>
        </motion.div>
      )}
    </div>
  );
}
