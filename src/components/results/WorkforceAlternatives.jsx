import { motion } from 'framer-motion';
import { formatCurrency, formatPercent } from '../../utils/formatters';

const OPTIONS = [
  { key: 'aiInvestment', color: 'bg-emerald-500', borderColor: 'border-emerald-200', bgColor: 'bg-emerald-50' },
  { key: 'hiring', color: 'bg-blue-500', borderColor: 'border-blue-200', bgColor: 'bg-blue-50' },
  { key: 'outsourcing', color: 'bg-purple-500', borderColor: 'border-purple-200', bgColor: 'bg-purple-50' },
  { key: 'statusQuo', color: 'bg-red-500', borderColor: 'border-red-200', bgColor: 'bg-red-50' },
];

export default function WorkforceAlternatives({ workforceAlternatives, delay = 0 }) {
  if (!workforceAlternatives) return null;

  const data = workforceAlternatives;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 md:p-6"
    >
      <h3 className="font-heading font-bold text-navy text-lg uppercase tracking-wide mb-1">
        Capital Allocation Comparison
      </h3>
      <div className="h-0.5 bg-navy/20 mt-1 mb-3" />
      <p className="text-gray-500 text-xs mb-4">
        AI investment vs. practical alternatives for the same business need
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {OPTIONS.map(({ key, color, borderColor, bgColor }, i) => {
          const option = data[key];
          if (!option) return null;
          const isBest = key === 'aiInvestment' && data.aiInvestment.roi > (data.hiring.roi || 0);

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: delay + 0.1 + i * 0.1 }}
              className={`rounded-lg border-2 p-4 ${isBest ? 'border-emerald-400 ring-2 ring-emerald-200' : borderColor} ${bgColor}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-sm font-semibold text-navy">{option.label}</span>
                {isBest && (
                  <span className="text-[10px] font-bold uppercase bg-emerald-500 text-white px-1.5 py-0.5 rounded">Best</span>
                )}
              </div>

              <div className="space-y-1.5 text-xs">
                {key === 'aiInvestment' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Upfront</span>
                      <span className="font-mono font-medium text-navy">{formatCurrency(option.upfrontCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">5-Year Net</span>
                      <span className={`font-mono font-bold ${option.annual5YearNet >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {formatCurrency(option.annual5YearNet)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ROI</span>
                      <span className="font-mono font-medium text-navy">{formatPercent(option.roi)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payback</span>
                      <span className="font-mono font-medium text-navy">{option.paybackMonths} mo</span>
                    </div>
                  </>
                )}

                {key === 'hiring' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">FTEs Needed</span>
                      <span className="font-mono font-medium text-navy">{option.ftesNeeded}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Annual Cost</span>
                      <span className="font-mono font-medium text-navy">{formatCurrency(option.annualCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">5-Year Cost</span>
                      <span className="font-mono font-medium text-red-600">{formatCurrency(option.total5YearCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ramp</span>
                      <span className="font-mono font-medium text-navy">{option.rampMonths} mo</span>
                    </div>
                  </>
                )}

                {key === 'outsourcing' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Annual Cost</span>
                      <span className="font-mono font-medium text-navy">{formatCurrency(option.annualCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Annual Savings</span>
                      <span className={`font-mono font-medium ${option.annualSavings >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {formatCurrency(option.annualSavings)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quality Impact</span>
                      <span className="font-mono font-medium text-amber-600">{option.qualityImpact}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transition</span>
                      <span className="font-mono font-medium text-navy">{option.transitionMonths} mo</span>
                    </div>
                  </>
                )}

                {key === 'statusQuo' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Annual Cost</span>
                      <span className="font-mono font-medium text-navy">{formatCurrency(option.annualCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">5-Year Cost</span>
                      <span className="font-mono font-medium text-red-600">{formatCurrency(option.total5YearCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Opportunity Cost</span>
                      <span className="font-mono font-medium text-red-600">{formatCurrency(option.opportunityCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Competitive Erosion</span>
                      <span className="font-mono font-medium text-red-600">{formatPercent(option.competitiveErosionRate)}/yr</span>
                    </div>
                  </>
                )}

                <div className="pt-1.5 border-t border-gray-200 mt-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Risk Level</span>
                    <span className={`font-medium ${
                      option.riskLevel === 'Low' ? 'text-emerald-600' :
                      option.riskLevel === 'Medium' ? 'text-amber-600' :
                      'text-red-600'
                    }`}>{option.riskLevel}</span>
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
