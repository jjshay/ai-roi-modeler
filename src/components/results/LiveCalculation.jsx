import { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { runCalculations } from '../../logic/calculations';
import { getRecommendation } from '../../logic/recommendations';
import { formatCurrency, formatPercent, formatCompact } from '../../utils/formatters';

function MetricCard({ label, value, subtext, color = 'navy', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-white rounded-2xl shadow-lg p-6 text-center"
    >
      <p className="text-gray-500 text-sm mb-1">{label}</p>
      <p className={`font-mono text-3xl font-bold ${
        color === 'green' ? 'text-emerald-600' :
        color === 'red' ? 'text-red-500' :
        color === 'gold' ? 'text-amber-500' : 'text-navy'
      }`}>
        {value}
      </p>
      {subtext && <p className="text-gray-400 text-xs mt-1">{subtext}</p>}
    </motion.div>
  );
}

function ProgressRing({ percent, size = 180, strokeWidth = 16, color = '#D4A84B' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(Math.max(percent, 0), 100) / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#E5E7EB"
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
      />
    </svg>
  );
}

function SimpleBarChart({ projections, delay = 0 }) {
  const maxSavings = Math.max(...projections.map(p => p.grossSavings), 1);

  return (
    <div className="space-y-3">
      {projections.map((yr, i) => {
        const pct = (yr.grossSavings / maxSavings) * 100;
        return (
          <motion.div
            key={yr.year}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + i * 0.1, duration: 0.4 }}
            className="flex items-center gap-3"
          >
            <span className="text-gray-500 text-sm w-12 shrink-0">Year {yr.year}</span>
            <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ delay: delay + i * 0.1 + 0.2, duration: 0.6, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-gold to-amber-400 rounded-full"
              />
            </div>
            <span className="font-mono font-semibold text-navy text-sm w-24 text-right">
              {formatCurrency(yr.grossSavings)}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

function TornadoChart({ extendedSensitivity, baseNPV }) {
  // Sort by impact range (largest swing first)
  const sorted = [...extendedSensitivity].sort((a, b) => {
    const rangeA = Math.abs(a.npvHigh - a.npvLow);
    const rangeB = Math.abs(b.npvHigh - b.npvLow);
    return rangeB - rangeA;
  });

  const allValues = sorted.flatMap((r) => [r.npvLow, r.npvHigh]);
  const minVal = Math.min(...allValues, baseNPV);
  const maxVal = Math.max(...allValues, baseNPV);
  const range = maxVal - minVal || 1;

  function pct(val) {
    return ((val - minVal) / range) * 100;
  }

  const basePct = pct(baseNPV);

  return (
    <div className="space-y-2">
      {sorted.map((row, i) => {
        const lowPct = pct(row.npvLow);
        const highPct = pct(row.npvHigh);
        const leftPct = Math.min(lowPct, highPct);
        const widthPct = Math.abs(highPct - lowPct);

        return (
          <motion.div
            key={row.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs text-gray-600 w-32 sm:w-40 shrink-0 truncate">{row.label}</span>
              <div className="flex-1 relative h-5 bg-gray-100 rounded">
                {/* Base NPV line */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-navy/40 z-10"
                  style={{ left: `${basePct}%` }}
                />
                {/* Bar */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPct}%` }}
                  transition={{ delay: i * 0.08 + 0.2, duration: 0.4, ease: 'easeOut' }}
                  className="absolute top-0.5 bottom-0.5 rounded bg-gradient-to-r from-red-400 via-amber-400 to-emerald-400"
                  style={{ left: `${leftPct}%` }}
                />
              </div>
              <span className="text-xs font-mono text-gray-500 w-20 text-right shrink-0">
                {formatCompact(row.npvHigh - row.npvLow)}
              </span>
            </div>
          </motion.div>
        );
      })}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
        <span className="text-[10px] text-gray-400 w-32 sm:w-40 shrink-0">Base NPV: {formatCompact(baseNPV)}</span>
        <div className="flex-1 flex justify-between text-[10px] text-gray-400">
          <span>{formatCompact(minVal)}</span>
          <span>{formatCompact(maxVal)}</span>
        </div>
        <span className="text-[10px] text-gray-400 w-20 text-right shrink-0">Swing</span>
      </div>
    </div>
  );
}

function CostVsSavingsBar({ totalCost, totalSavings, delay = 0 }) {
  const total = totalCost + totalSavings;
  const costPct = total > 0 ? (totalCost / total) * 100 : 50;
  const savingsPct = total > 0 ? (totalSavings / total) * 100 : 50;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.5 }}
      className="space-y-2"
    >
      <div className="flex h-12 rounded-xl overflow-hidden shadow-inner">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${costPct}%` }}
          transition={{ delay: delay + 0.2, duration: 0.8, ease: 'easeOut' }}
          className="bg-gradient-to-r from-red-400 to-red-500 flex items-center justify-center"
        >
          <span className="text-white text-xs font-semibold px-2 truncate">
            {formatCurrency(totalCost)}
          </span>
        </motion.div>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${savingsPct}%` }}
          transition={{ delay: delay + 0.4, duration: 0.8, ease: 'easeOut' }}
          className="bg-gradient-to-r from-emerald-400 to-emerald-500 flex items-center justify-center"
        >
          <span className="text-white text-xs font-semibold px-2 truncate">
            {formatCurrency(totalSavings)}
          </span>
        </motion.div>
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Total Investment</span>
        <span>5-Year Gross Savings</span>
      </div>
    </motion.div>
  );
}

function EmailGateModal({ onSubmit, onClose }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-navy font-bold text-lg mb-1">Get Your Report</h3>
        <p className="text-gray-500 text-sm mb-6">Enter your email to download the full analysis.</p>
        <div className="space-y-3 mb-6">
          <input
            type="text"
            placeholder="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
          />
          <input
            type="email"
            placeholder="Work email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
            autoFocus
          />
        </div>
        <button
          onClick={() => {
            if (isValid) {
              localStorage.setItem('roi_lead_email', email);
              if (name) localStorage.setItem('roi_lead_name', name);
              onSubmit();
            }
          }}
          disabled={!isValid}
          className="w-full bg-gold text-navy font-bold py-3 rounded-xl text-sm cursor-pointer transition-all hover:bg-gold-light disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Download Report
        </button>
        <button
          onClick={onClose}
          className="w-full mt-2 text-gray-400 text-xs hover:text-gray-600 cursor-pointer transition-colors"
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function LiveCalculation({ formData, onDownload, onDownloadExcel, onStartOver, onEditInputs, onShare }) {
  const results = useMemo(() => runCalculations(formData), [formData]);
  const recommendation = useMemo(() => getRecommendation(results), [results]);

  // Scenario toggle
  const [activeScenario, setActiveScenario] = useState('base');
  const scenario = results.scenarios[activeScenario];
  const totalGrossSavings = scenario.projections.reduce((sum, yr) => sum + yr.grossSavings, 0);
  const totalInvestment = results.totalInvestment + results.aiCostModel.totalOngoing5Year;

  // Calculate ROI percentage for ring
  const roiPercent = totalInvestment > 0
    ? Math.min(((totalGrossSavings - totalInvestment) / totalInvestment + 1) * 50, 100)
    : 50;

  // Simplified to 2 states: positive ROI (green) or negative (red)
  const isPositiveROI = totalGrossSavings > totalInvestment;
  const verdictColor = isPositiveROI ? 'emerald' : 'red';

  // Download loading states + email gate
  const [pdfLoading, setPdfLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [emailGateAction, setEmailGateAction] = useState(null); // null | 'pdf' | 'excel'
  const [shareCopied, setShareCopied] = useState(false);

  const hasEmail = () => !!localStorage.getItem('roi_lead_email');

  const executePdfDownload = useCallback(async () => {
    setPdfLoading(true);
    try {
      await Promise.resolve(onDownload(results, recommendation));
    } finally {
      setTimeout(() => setPdfLoading(false), 500);
    }
  }, [onDownload, results, recommendation]);

  const executeExcelDownload = useCallback(async () => {
    setExcelLoading(true);
    try {
      await Promise.resolve(onDownloadExcel());
    } finally {
      setTimeout(() => setExcelLoading(false), 500);
    }
  }, [onDownloadExcel]);

  const handlePdfDownload = useCallback(() => {
    if (hasEmail()) { executePdfDownload(); }
    else { setEmailGateAction('pdf'); }
  }, [executePdfDownload]);

  const handleExcelDownload = useCallback(() => {
    if (hasEmail()) { executeExcelDownload(); }
    else { setEmailGateAction('excel'); }
  }, [executeExcelDownload]);

  const handleEmailSubmit = useCallback(() => {
    setEmailGateAction(null);
    if (emailGateAction === 'pdf') executePdfDownload();
    else if (emailGateAction === 'excel') executeExcelDownload();
  }, [emailGateAction, executePdfDownload, executeExcelDownload]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Hero Verdict */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className={`text-center mb-8 p-8 rounded-3xl shadow-xl ${
            isPositiveROI
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
              : 'bg-gradient-to-br from-red-500 to-red-600'
          }`}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="text-6xl mb-4"
          >
            {isPositiveROI ? '✓' : '✗'}
          </motion.div>
          <h1 className="text-white text-2xl md:text-3xl font-bold mb-2">
            {isPositiveROI ? 'This Investment Makes Sense' : 'Not Yet Profitable'}
          </h1>
          <p className="text-white/80 text-sm max-w-md mx-auto">
            {isPositiveROI
              ? `Expected ${formatCurrency(totalGrossSavings - totalInvestment)} net return over 5 years`
              : `Current scenario shows ${formatCurrency(totalInvestment - totalGrossSavings)} shortfall. See suggestions below.`
            }
          </p>
        </motion.div>

        {/* Scenario Toggle */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-white rounded-xl shadow-md p-1 gap-1">
            {[
              { key: 'conservative', label: 'Conservative', color: 'text-red-500' },
              { key: 'base', label: 'Base Case', color: 'text-amber-600' },
              { key: 'optimistic', label: 'Optimistic', color: 'text-emerald-600' },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => setActiveScenario(s.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  activeScenario === s.key
                    ? `bg-navy text-white shadow-sm`
                    : `text-gray-500 hover:text-navy hover:bg-gray-50`
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics - 3 Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <MetricCard
            label="5-Year NPV"
            value={formatCurrency(scenario.npv)}
            color={scenario.npv >= 0 ? 'green' : 'red'}
            delay={0.2}
          />
          <MetricCard
            label="Payback"
            value={scenario.paybackMonths > 60 ? '>5 yrs' : `${Math.round(scenario.paybackMonths / 12 * 10) / 10} yrs`}
            subtext={scenario.paybackMonths <= 60 ? `${scenario.paybackMonths} months` : 'No break-even'}
            delay={0.3}
          />
          <MetricCard
            label="ROIC"
            value={formatPercent(scenario.roic)}
            color={scenario.roic > 0 ? 'gold' : 'red'}
            delay={0.4}
          />
        </div>

        {/* ROI Ring + Investment Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="bg-white rounded-3xl shadow-xl p-6 mb-8"
        >
          <h3 className="text-navy font-bold text-lg mb-6 text-center">Investment Overview</h3>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 mb-6">
            <div className="relative">
              <ProgressRing
                percent={roiPercent}
                color={totalGrossSavings > totalInvestment ? '#10B981' : '#EF4444'}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-gray-500 text-xs">Net Return</span>
                <span className={`font-mono text-xl font-bold ${
                  totalGrossSavings > totalInvestment ? 'text-emerald-600' : 'text-red-500'
                }`}>
                  {formatCurrency(totalGrossSavings - totalInvestment)}
                </span>
              </div>
            </div>

            <div className="flex sm:flex-col gap-6 sm:gap-4">
              <div className="text-center sm:text-left">
                <p className="text-gray-500 text-xs">Total Investment</p>
                <p className="font-mono text-xl font-bold text-red-500">{formatCurrency(totalInvestment)}</p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-gray-500 text-xs">5-Year Savings</p>
                <p className="font-mono text-xl font-bold text-emerald-600">{formatCurrency(totalGrossSavings)}</p>
              </div>
            </div>
          </div>

          <CostVsSavingsBar
            totalCost={totalInvestment}
            totalSavings={totalGrossSavings}
            delay={0.6}
          />
        </motion.div>

        {/* 5-Year Projection Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="bg-white rounded-3xl shadow-xl p-6 mb-8"
        >
          <h3 className="text-navy font-bold text-lg mb-4">5-Year Savings Projection</h3>
          <p className="text-gray-500 text-sm mb-4">{activeScenario === 'conservative' ? 'Conservative' : activeScenario === 'optimistic' ? 'Optimistic' : 'Base case'} scenario</p>
          <SimpleBarChart projections={scenario.projections} delay={0.8} />
        </motion.div>

        {/* Sensitivity Tornado Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.5 }}
          className="bg-white rounded-3xl shadow-xl p-6 mb-8"
        >
          <h3 className="text-navy font-bold text-lg mb-1">Sensitivity Analysis</h3>
          <p className="text-gray-500 text-xs mb-4">How each variable affects 5-Year NPV</p>
          <TornadoChart extendedSensitivity={results.extendedSensitivity} baseNPV={results.scenarios.base.npv} />
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="bg-navy rounded-3xl shadow-xl p-6 mb-8"
        >
          <h3 className="text-gold font-bold text-lg mb-4">Quick Facts</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Team Size</span>
              <span className="text-white font-mono">{formData.teamSize} people</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Implementation</span>
              <span className="text-white font-mono">{results.riskAdjustments.adjustedTimeline} months</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Upfront Cost</span>
              <span className="text-white font-mono">{formatCurrency(results.upfrontInvestment)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Annual AI Cost</span>
              <span className="text-white font-mono">{formatCurrency(results.aiCostModel.baseOngoingCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Adoption Rate</span>
              <span className="text-white font-mono">{formatPercent(results.riskAdjustments.adoptionRate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">IRR</span>
              <span className="text-white font-mono">{isFinite(scenario.irr) ? formatPercent(scenario.irr) : 'N/A'}</span>
            </div>
          </div>
        </motion.div>

        {/* V3: Value Pathways */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05, duration: 0.5 }}
          className="bg-white rounded-3xl shadow-xl p-6 mb-8"
        >
          <h3 className="text-navy font-bold text-lg mb-1">Value Creation Pathways</h3>
          <p className="text-gray-500 text-xs mb-4">Three lenses on how AI creates value</p>

          <div className="space-y-4">
            {/* Path A: Cost Efficiency */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold text-navy text-sm">A. Cost Efficiency</p>
                  <p className="text-xs text-gray-500">Direct cash savings from automation</p>
                </div>
                <span className="font-mono font-bold text-emerald-600 text-lg">
                  {formatCompact(results.valuePathways.costEfficiency.annualRiskAdjusted)}
                  <span className="text-xs text-gray-500 font-normal">/yr</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                <span>Cash realized: {formatPercent(results.valuePathways.costEfficiency.cashRealizationPct)}</span>
                <span>= {formatCompact(results.valuePathways.costEfficiency.annualCashRealized)} cash</span>
              </div>
            </div>

            {/* Path B: Capacity Creation */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold text-navy text-sm">B. Capacity Creation</p>
                  <p className="text-xs text-gray-500">Freed time + revenue acceleration</p>
                </div>
                <span className="font-mono font-bold text-blue-600 text-lg">
                  {formatCompact(results.valuePathways.capacityCreation.totalAnnualValue)}
                  <span className="text-xs text-gray-500 font-normal">/yr</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                <span>{Math.round(results.valuePathways.capacityCreation.hoursFreed).toLocaleString()} hrs freed</span>
                <span>{results.valuePathways.capacityCreation.fteEquivalent.toFixed(1)} FTE equiv</span>
                {results.valuePathways.capacityCreation.revenueAcceleration > 0 && (
                  <span>Rev accel: {formatCompact(results.valuePathways.capacityCreation.revenueAcceleration)}</span>
                )}
              </div>
              {!results.valuePathways.capacityCreation.includeInNPV && (
                <p className="text-[10px] text-gray-400 mt-1 italic">Not included in NPV</p>
              )}
            </div>

            {/* Path C: Risk Reduction */}
            <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold text-navy text-sm">C. Risk Reduction</p>
                  <p className="text-xs text-gray-500">Regulatory/compliance protection</p>
                </div>
                <span className="font-mono font-bold text-purple-600 text-lg">
                  {formatCompact(results.valuePathways.riskReduction.annualValueAvoided)}
                  <span className="text-xs text-gray-500 font-normal">/yr</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                <span>Event prob: {formatPercent(results.valuePathways.riskReduction.eventProbability)}</span>
                <span>Impact: {formatCompact(results.valuePathways.riskReduction.eventImpact)}</span>
                <span>AI reduces: {formatPercent(results.valuePathways.riskReduction.aiReductionPct)}</span>
              </div>
              {!results.valuePathways.riskReduction.includeInNPV && (
                <p className="text-[10px] text-gray-400 mt-1 italic">Not included in NPV</p>
              )}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="text-sm font-semibold text-navy">Total annual value</span>
              <span className="font-mono font-bold text-navy text-xl">
                {formatCompact(results.valuePathways.totalAnnualValue)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* V3: Capital Efficiency */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          className="bg-white rounded-3xl shadow-xl p-6 mb-8"
        >
          <h3 className="text-navy font-bold text-lg mb-4">Capital Efficiency</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-gray-50 p-3 text-center">
              <p className="text-gray-500 text-xs mb-1">EVA</p>
              <p className={`font-mono text-xl font-bold ${
                results.capitalEfficiency.eva >= 0 ? 'text-emerald-600' : 'text-red-500'
              }`}>
                {formatCompact(results.capitalEfficiency.eva)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Annual economic profit</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 text-center">
              <p className="text-gray-500 text-xs mb-1">Cash-on-Cash</p>
              <p className={`font-mono text-xl font-bold ${
                results.capitalEfficiency.cashOnCash >= 0 ? 'text-emerald-600' : 'text-red-500'
              }`}>
                {formatPercent(results.capitalEfficiency.cashOnCash)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Yr 3 return on capital</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 text-center">
              <p className="text-gray-500 text-xs mb-1">ROIC</p>
              <p className="font-mono text-xl font-bold text-navy">
                {formatPercent(results.capitalEfficiency.roic)}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 text-center">
              <p className="text-gray-500 text-xs mb-1">ROIC vs WACC</p>
              <p className={`font-mono text-xl font-bold ${
                results.capitalEfficiency.createsValue ? 'text-emerald-600' : 'text-red-500'
              }`}>
                {results.capitalEfficiency.roicWaccSpread >= 0 ? '+' : ''}
                {formatPercent(results.capitalEfficiency.roicWaccSpread)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {results.capitalEfficiency.createsValue ? 'Value creating' : 'Value destroying'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Industry Peer Comparison */}
        {results.peerComparison && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.12, duration: 0.5 }}
            className="bg-white rounded-3xl shadow-xl p-6 mb-8"
          >
            <h3 className="text-navy font-bold text-lg mb-1">Industry Peer Comparison</h3>
            <p className="text-gray-500 text-xs mb-5">Your projected ROIC vs {formData.industry || 'industry'} peers ({formData.companySize || 'your size'})</p>

            {/* Percentile gauge */}
            <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden mb-3">
              {/* P25 marker */}
              <div className="absolute top-0 bottom-0 w-px bg-gray-300 z-10" style={{ left: '25%' }} />
              {/* Median marker */}
              <div className="absolute top-0 bottom-0 w-px bg-navy/30 z-10" style={{ left: '50%' }} />
              {/* P75 marker */}
              <div className="absolute top-0 bottom-0 w-px bg-gray-300 z-10" style={{ left: '75%' }} />
              {/* User position */}
              <motion.div
                initial={{ left: '0%' }}
                animate={{ left: `${Math.min(Math.max(results.peerComparison.percentileRank, 2), 98)}%` }}
                transition={{ delay: 1.2, duration: 0.8, ease: 'easeOut' }}
                className="absolute top-0 bottom-0 w-3 -ml-1.5 z-20"
              >
                <div className={`w-full h-full rounded-full ${
                  results.peerComparison.percentileRank >= 50 ? 'bg-emerald-500' : 'bg-amber-500'
                } shadow-md`} />
              </motion.div>
            </div>

            {/* Legend */}
            <div className="flex justify-between text-[10px] text-gray-400 mb-4">
              <span>P25: {formatPercent(results.peerComparison.peerP25)}</span>
              <span>Median: {formatPercent(results.peerComparison.peerMedian)}</span>
              <span>P75: {formatPercent(results.peerComparison.peerP75)}</span>
            </div>

            {/* Summary */}
            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
              <div>
                <p className="text-xs text-gray-500">Your Projected ROIC</p>
                <p className="font-mono text-lg font-bold text-navy">{formatPercent(results.peerComparison.userROIC)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Percentile Rank</p>
                <p className={`font-mono text-lg font-bold ${
                  results.peerComparison.percentileRank >= 50 ? 'text-emerald-600' : 'text-amber-600'
                }`}>
                  {results.peerComparison.percentileRank}th
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">vs Median</p>
                <p className={`font-mono text-lg font-bold ${
                  results.peerComparison.vsMedian >= 0 ? 'text-emerald-600' : 'text-red-500'
                }`}>
                  {results.peerComparison.vsMedian >= 0 ? '+' : ''}{formatPercent(results.peerComparison.vsMedian)}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* V3: Gate Structure */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.15, duration: 0.5 }}
          className="bg-white rounded-3xl shadow-xl p-6 mb-8"
        >
          <h3 className="text-navy font-bold text-lg mb-1">Phased Deployment Gates</h3>
          <p className="text-gray-500 text-xs mb-4">Go/no-go thresholds at each stage</p>

          <div className="space-y-3">
            {results.gateStructure.map((gate, i) => {
              const allMet = Object.values(gate.meetsThresholds).every(Boolean);
              return (
                <div
                  key={gate.gate}
                  className={`rounded-xl border p-4 ${
                    allMet ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${
                        allMet ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'
                      }`}>
                        {gate.gate}
                      </span>
                      <span className="font-semibold text-navy text-sm">{gate.label}</span>
                      <span className="text-xs text-gray-500">
                        Months {gate.monthRange[0]}-{gate.monthRange[1]}
                      </span>
                    </div>
                    <span className="font-mono text-sm font-medium text-navy">
                      {formatCompact(gate.investment)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span className={gate.meetsThresholds.automation ? 'text-emerald-700' : 'text-amber-700'}>
                      {gate.meetsThresholds.automation ? '\u2713' : '\u2717'} Automation {formatPercent(gate.requiredMetrics.minAutomationValidated)}
                    </span>
                    <span className={gate.meetsThresholds.adoption ? 'text-emerald-700' : 'text-amber-700'}>
                      {gate.meetsThresholds.adoption ? '\u2713' : '\u2717'} Adoption {formatPercent(gate.requiredMetrics.minAdoptionRate)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* What Would Make This Work - shown only for negative ROI */}
        {totalGrossSavings < totalInvestment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 mb-8"
          >
            <h3 className="text-amber-800 font-bold text-lg mb-3 flex items-center gap-2">
              <span className="text-2xl">💡</span> What Would Make This Work?
            </h3>
            <ul className="space-y-2 text-amber-900 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">→</span>
                <span><strong>Larger team scope:</strong> AI savings scale with team size. Consider expanding to {Math.max(formData.teamSize * 2, 30)}+ people.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">→</span>
                <span><strong>Higher-value processes:</strong> Focus on processes with more manual hours or higher error costs.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">→</span>
                <span><strong>Improve data readiness:</strong> Clean, accessible data reduces implementation time by 30-50%.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">→</span>
                <span><strong>Secure executive sponsorship:</strong> Projects with C-level support succeed 2x more often.</span>
              </li>
            </ul>
            <p className="text-amber-700 text-xs mt-4 pt-3 border-t border-amber-200">
              Download the full report to see detailed breakeven analysis and scenario modeling.
            </p>
          </motion.div>
        )}

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="text-center space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handlePdfDownload}
              disabled={pdfLoading}
              className="bg-gold text-navy font-bold py-4 px-8 rounded-2xl text-lg shadow-lg shadow-gold/30 cursor-pointer transition-all hover:bg-gold-light hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait"
            >
              {pdfLoading ? (
                <span className="flex items-center gap-2 justify-center">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating PDF...
                </span>
              ) : 'Download PDF Report'}
            </button>
            <button
              onClick={handleExcelDownload}
              disabled={excelLoading}
              className="bg-white text-navy font-bold py-4 px-8 rounded-2xl text-lg shadow-lg border-2 border-navy/20 cursor-pointer transition-all hover:border-navy hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait"
            >
              {excelLoading ? (
                <span className="flex items-center gap-2 justify-center">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating Excel...
                </span>
              ) : 'Download Excel Model'}
            </button>
          </div>

          <div className="flex items-center justify-center gap-4">
            {onShare && (
              <button
                onClick={() => {
                  onShare();
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 2000);
                }}
                className="text-navy hover:text-gold text-sm font-medium underline underline-offset-2 cursor-pointer transition-colors"
              >
                {shareCopied ? 'Link Copied!' : 'Share Link'}
              </button>
            )}
            {onEditInputs && (
              <button
                onClick={onEditInputs}
                className="text-navy hover:text-gold text-sm font-medium underline underline-offset-2 cursor-pointer transition-colors"
              >
                Edit Inputs
              </button>
            )}
            {onStartOver && (
              <button
                onClick={onStartOver}
                className="text-gray-400 hover:text-navy text-sm underline underline-offset-2 cursor-pointer transition-colors"
              >
                Start Over
              </button>
            )}
          </div>
        </motion.div>

        {/* Consultation CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.5 }}
          className="bg-gradient-to-br from-navy to-navy/90 rounded-3xl shadow-xl p-6 sm:p-8 text-center mb-8"
        >
          <p className="text-gold font-bold text-lg mb-2">Want expert guidance on your AI strategy?</p>
          <p className="text-white/70 text-sm mb-5 max-w-md mx-auto">
            Our team can help you validate these projections, identify quick wins, and build a phased implementation roadmap.
          </p>
          <a
            href="https://calendly.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gold text-navy font-bold py-3 px-8 rounded-xl text-sm shadow-lg shadow-gold/20 transition-all hover:bg-gold-light hover:scale-[1.02] active:scale-[0.98]"
          >
            Schedule a Free Consultation
          </a>
        </motion.div>

      </div>

      {/* Email Gate Modal */}
      <AnimatePresence>
        {emailGateAction && (
          <EmailGateModal
            onSubmit={handleEmailSubmit}
            onClose={() => setEmailGateAction(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
