import { useMemo, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { runCalculations } from '../../logic/calculations';
import { getRecommendation } from '../../logic/recommendations';
import { AI_MATURITY_PREMIUM } from '../../logic/benchmarks';
import { formatCurrency, formatPercent, formatCompact } from '../../utils/formatters';
import { getOutputTier, tierShows, AUTO_EXPAND } from '../../utils/outputTier';

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

function CollapsibleSection({ title, subtitle, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-3xl shadow-xl mb-8 overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-6 cursor-pointer text-left hover:bg-gray-50 transition-colors"
      >
        <div>
          <h3 className="text-navy font-bold text-lg">{title}</h3>
          {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
        </div>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="h-5 w-5 text-gray-400 shrink-0 ml-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MonteCarloHistogram({ npvDistribution }) {
  if (!npvDistribution || npvDistribution.length < 10) return null;

  const bins = 20;
  const min = npvDistribution[0];
  const max = npvDistribution[npvDistribution.length - 1];
  const range = max - min || 1;
  const binWidth = range / bins;

  const counts = new Array(bins).fill(0);
  for (const val of npvDistribution) {
    const idx = Math.min(Math.floor((val - min) / binWidth), bins - 1);
    counts[idx]++;
  }
  const maxCount = Math.max(...counts);

  return (
    <div className="mt-4">
      <div className="flex items-end gap-px h-32">
        {counts.map((count, i) => {
          const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
          const binStart = min + i * binWidth;
          const isPositive = binStart >= 0;
          return (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${pct}%` }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              className={`flex-1 rounded-t ${isPositive ? 'bg-emerald-400' : 'bg-red-400'}`}
              title={`${formatCompact(binStart)} to ${formatCompact(binStart + binWidth)}: ${count} runs`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{formatCompact(min)}</span>
        <span>NPV Distribution</span>
        <span>{formatCompact(max)}</span>
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

const API_URL = import.meta.env.VITE_API_URL || '';

function EmailGateModal({ onSubmit, onClose, formData }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    localStorage.setItem('roi_lead_email', email);
    if (name) localStorage.setItem('roi_lead_name', name);

    // Fire-and-forget API call to capture lead
    if (API_URL) {
      try {
        await fetch(`${API_URL}/api/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            name: name || undefined,
            industry: formData?.industry || undefined,
            companySize: formData?.companySize || undefined,
            source: 'report_download',
          }),
        });
      } catch {
        // Lead capture failure should not block download
      }
    }
    setSubmitting(false);
    onSubmit();
  };

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
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          className="w-full bg-gold text-navy font-bold py-3 rounded-xl text-sm cursor-pointer transition-all hover:bg-gold-light disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting...' : 'Download Report'}
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

  // Derive output tier from role
  const tier = useMemo(() => getOutputTier(formData.role), [formData.role]);
  const show = useCallback((section) => tierShows(tier, section), [tier]);
  const autoExpand = AUTO_EXPAND[tier] || [];

  // "View Full Analysis" toggle for executive tier
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const effectiveTier = (tier === 'executive' && showFullAnalysis) ? 'detailed' : tier;
  const effectiveShow = useCallback(
    (section) => tierShows(effectiveTier, section),
    [effectiveTier],
  );
  const effectiveAutoExpand = AUTO_EXPAND[effectiveTier] || [];

  const recommendation = useMemo(() => getRecommendation(results, tier), [results, tier]);

  // Monte Carlo simulation (async dynamic import to avoid blocking initial render)
  const [mcResults, setMcResults] = useState(null);
  useEffect(() => {
    let cancelled = false;
    import('../../logic/monteCarlo').then(({ runMonteCarlo }) => {
      if (!cancelled) {
        setMcResults(runMonteCarlo(formData, 500));
      }
    });
    return () => { cancelled = true; };
  }, [formData]);

  // Scenario toggle
  const [activeScenario, setActiveScenario] = useState('base');
  const scenario = results.scenarios[activeScenario];
  const totalGrossSavings = scenario.projections.reduce((sum, yr) => sum + yr.grossSavings, 0);
  const totalNetCashFlows = scenario.projections.reduce((sum, yr) => sum + yr.netCashFlow, 0);
  // Capital deployed = upfront + separation (what the CFO actually writes checks for)
  const capitalDeployed = results.investment?.totalInvestment || results.totalInvestment || 0;
  // Total cost of ownership = capital + 5-year operating costs (for the overview bar)
  const totalCostOfOwnership = capitalDeployed + results.aiCostModel.totalOngoing5Year;

  // Use scenario ROIC directly — same number shown in Financial Detail
  const scenarioROI = scenario.roic;

  // Calculate ROI percentage for ring (based on TCO for visual comparison)
  const roiPercent = totalCostOfOwnership > 0
    ? Math.min(((totalGrossSavings - totalCostOfOwnership) / totalCostOfOwnership + 1) * 50, 100)
    : 50;

  // Simplified to 2 states: positive ROI (green) or negative (red)
  const isPositiveROI = scenarioROI >= 0;

  // Top levers count based on tier
  const leverCount = typeof effectiveShow('topLevers') === 'number' ? effectiveShow('topLevers') : 3;

  // Download loading states + email gate
  const [pdfLoading, setPdfLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [emailGateAction, setEmailGateAction] = useState(null); // null | 'pdf' | 'excel'
  const [shareCopied, setShareCopied] = useState(false);

  const hasEmail = () => !!localStorage.getItem('roi_lead_email');

  const executePdfDownload = useCallback(async () => {
    setPdfLoading(true);
    try {
      await Promise.resolve(onDownload(results, recommendation, mcResults));
    } finally {
      setTimeout(() => setPdfLoading(false), 500);
    }
  }, [onDownload, results, recommendation, mcResults]);

  const executeExcelDownload = useCallback(async () => {
    setExcelLoading(true);
    try {
      await Promise.resolve(onDownloadExcel(mcResults));
    } finally {
      setTimeout(() => setExcelLoading(false), 500);
    }
  }, [onDownloadExcel, mcResults]);

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

  // Compute totals row for executive year-by-year
  const totalsRow = useMemo(() => {
    const p = scenario.projections;
    return {
      grossSavings: p.reduce((s, yr) => s + yr.grossSavings, 0),
      costs: p.reduce((s, yr) => s + yr.ongoingCost + yr.separationCost, 0),
      netCashFlow: p.reduce((s, yr) => s + yr.netCashFlow, 0),
      netCumulative: p[p.length - 1]?.netCumulative ?? 0,
    };
  }, [scenario.projections]);

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
              ? `Expected ${formatCurrency(totalNetCashFlows - capitalDeployed)} net return over 5 years`
              : `Current scenario shows ${formatCurrency(capitalDeployed - totalNetCashFlows)} shortfall. See suggestions below.`
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

        {/* ============================================ */}
        {/* ZONE A — Executive Scorecard (above the fold) */}
        {/* ============================================ */}

        {/* Executive Scorecard — 3 Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <MetricCard
            label="5-Year ROIC"
            value={formatPercent(scenarioROI)}
            subtext={`${formatCompact(capitalDeployed)} capital deployed`}
            color={scenarioROI >= 0 ? 'green' : 'red'}
            delay={0.2}
          />
          <MetricCard
            label="Payback"
            value={scenario.paybackMonths > 60 ? '>5 yrs' : `${Math.round(scenario.paybackMonths / 12 * 10) / 10} yrs`}
            subtext={scenario.paybackMonths <= 60 ? `${scenario.paybackMonths} months` : 'No break-even'}
            delay={0.3}
          />
          <MetricCard
            label="5-Year Net Return"
            value={formatCompact(totalNetCashFlows - capitalDeployed)}
            subtext={`Net cash flows minus ${formatCompact(capitalDeployed)} capital`}
            color={totalNetCashFlows > capitalDeployed ? 'green' : 'red'}
            delay={0.4}
          />
        </div>

        {/* Year-by-Year Table */}
        {effectiveShow('yearByYear') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="bg-white rounded-3xl shadow-xl p-6 mb-8"
          >
            <h3 className="text-navy font-bold text-lg mb-4">
              {effectiveShow('yearByYear') === 'totals-only' ? '5-Year Summary' : 'Year-by-Year Breakdown'}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-navy/10">
                    <th className="text-left py-2 text-gray-500 font-medium">{effectiveShow('yearByYear') === 'totals-only' ? '' : 'Year'}</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Gross Savings</th>
                    <th className="text-right py-2 text-gray-500 font-medium">AI Costs</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Net Savings</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Cumulative</th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveShow('yearByYear') === 'totals-only' ? (
                    <tr className="border-b border-gray-100 font-semibold">
                      <td className="py-2 font-medium text-navy">5-Year Total</td>
                      <td className="py-2 text-right font-mono text-emerald-600">{formatCompact(totalsRow.grossSavings)}</td>
                      <td className="py-2 text-right font-mono text-red-500">{formatCompact(totalsRow.costs)}</td>
                      <td className={`py-2 text-right font-mono ${totalsRow.netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {formatCompact(totalsRow.netCashFlow)}
                      </td>
                      <td className={`py-2 text-right font-mono ${totalsRow.netCumulative >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {formatCompact(totalsRow.netCumulative)}
                      </td>
                    </tr>
                  ) : (
                    scenario.projections.map((yr) => (
                      <tr key={yr.year} className="border-b border-gray-100">
                        <td className="py-2 font-medium text-navy">Year {yr.year}</td>
                        <td className="py-2 text-right font-mono text-emerald-600">{formatCompact(yr.grossSavings)}</td>
                        <td className="py-2 text-right font-mono text-red-500">{formatCompact(yr.ongoingCost + yr.separationCost)}</td>
                        <td className={`py-2 text-right font-mono font-semibold ${yr.netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {formatCompact(yr.netCashFlow)}
                        </td>
                        <td className={`py-2 text-right font-mono ${yr.netCumulative >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {formatCompact(yr.netCumulative)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {effectiveShow('yearByYear') !== 'totals-only' && (
              <div className="mt-4">
                <SimpleBarChart projections={scenario.projections} delay={0.6} />
              </div>
            )}
          </motion.div>
        )}

        {/* Top Levers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="bg-white rounded-3xl shadow-xl p-6 mb-8"
        >
          <h3 className="text-navy font-bold text-lg mb-1">What Drives This Result?</h3>
          <p className="text-gray-500 text-xs mb-4">
            {leverCount === 1 ? 'Top variable with the largest impact on NPV' : `Top ${leverCount} variables with the largest impact on NPV`}
          </p>
          <div className="space-y-3">
            {results.executiveSummary.topLevers.slice(0, leverCount).map((lever, i) => (
              <motion.div
                key={lever.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.3 }}
                className="flex items-center justify-between bg-gray-50 rounded-xl p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-navy text-white text-xs font-bold">{i + 1}</span>
                  <span className="text-navy font-medium text-sm">{lever.label}</span>
                </div>
                <span className="font-mono font-bold text-navy text-sm">{formatCompact(lever.npvSwing)} swing</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Key Assumptions — 2x2 + timeline */}
        {effectiveShow('keyAssumptions') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="bg-white rounded-3xl shadow-xl p-6 mb-8"
          >
            <h3 className="text-navy font-bold text-lg mb-4">Key Assumptions</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-gray-500 text-xs mb-1">Automation Potential</p>
                <p className="font-mono text-xl font-bold text-navy">{formatPercent(results.executiveSummary.keyAssumptions.automationPotential)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-gray-500 text-xs mb-1">Adoption Rate</p>
                <p className="font-mono text-xl font-bold text-navy">{formatPercent(results.executiveSummary.keyAssumptions.adoptionRate)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-gray-500 text-xs mb-1">Risk Multiplier</p>
                <p className="font-mono text-xl font-bold text-navy">{formatPercent(results.executiveSummary.keyAssumptions.riskMultiplier)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-gray-500 text-xs mb-1">Discount Rate</p>
                <p className="font-mono text-xl font-bold text-navy">{formatPercent(results.executiveSummary.keyAssumptions.discountRate)}</p>
              </div>
            </div>
            <div className="mt-3 bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-gray-500 text-xs mb-1">Implementation Timeline</p>
              <p className="font-mono text-xl font-bold text-navy">{results.executiveSummary.keyAssumptions.timelineMonths} months</p>
            </div>
          </motion.div>
        )}

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="text-center space-y-4 mb-8"
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

        {/* "View Full Analysis" toggle for executive tier */}
        {tier === 'executive' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 0.5 }}
            className="text-center mb-8"
          >
            <button
              onClick={() => setShowFullAnalysis(!showFullAnalysis)}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-navy/20 px-6 py-3 text-sm font-semibold text-navy transition-all hover:border-navy hover:bg-navy/5 cursor-pointer"
            >
              <svg
                className={`h-4 w-4 transition-transform ${showFullAnalysis ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              {showFullAnalysis ? 'Hide Full Analysis' : 'View Full Analysis'}
            </button>
          </motion.div>
        )}

        {/* What Would Make This Work - shown only for negative ROI */}
        {effectiveShow('whatWouldMakeItWork') && totalNetCashFlows < capitalDeployed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 mb-8"
          >
            <h3 className="text-amber-800 font-bold text-lg mb-3 flex items-center gap-2">
              What Would Make This Work?
            </h3>
            <ul className="space-y-2 text-amber-900 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">&rarr;</span>
                <span><strong>Larger team scope:</strong> AI savings scale with team size. Consider expanding to {Math.max(formData.teamSize * 2, 30)}+ people.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">&rarr;</span>
                <span><strong>Higher-value processes:</strong> Focus on processes with more manual hours or higher error costs.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">&rarr;</span>
                <span><strong>Improve data readiness:</strong> Clean, accessible data reduces implementation time by 30-50%.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">&rarr;</span>
                <span><strong>Secure executive sponsorship:</strong> Projects with C-level support succeed 2x more often.</span>
              </li>
            </ul>
            <p className="text-amber-700 text-xs mt-4 pt-3 border-t border-amber-200">
              Download the full report to see detailed breakeven analysis and scenario modeling.
            </p>
          </motion.div>
        )}

        {/* ============================================ */}
        {/* ZONE B — Detail Sections (below the fold)   */}
        {/* ============================================ */}

        {/* Financial Detail (old 3-card grid, now collapsible) */}
        {effectiveShow('financialDetail') && (
          <CollapsibleSection title="Financial Detail" subtitle="NPV, IRR, and ROIC metrics" defaultOpen={effectiveAutoExpand.includes('financialDetail')}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-gray-500 text-xs mb-1">5-Year NPV</p>
                <p className={`font-mono text-2xl font-bold ${scenario.npv >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {formatCurrency(scenario.npv)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-gray-500 text-xs mb-1">IRR</p>
                <p className="font-mono text-2xl font-bold text-navy">
                  {isFinite(scenario.irr) ? formatPercent(scenario.irr) : 'N/A'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-gray-500 text-xs mb-1">ROIC</p>
                <p className={`font-mono text-2xl font-bold ${scenario.roic > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                  {formatPercent(scenario.roic)}
                </p>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Investment Overview (ring + bar) */}
        {effectiveShow('investmentOverview') && (
          <CollapsibleSection title="Investment Overview" subtitle="Capital deployed vs 5-year gross savings" defaultOpen={effectiveAutoExpand.includes('investmentOverview')}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 mb-6">
              <div className="relative">
                <ProgressRing
                  percent={roiPercent}
                  color={totalNetCashFlows > capitalDeployed ? '#10B981' : '#EF4444'}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-gray-500 text-xs">Net Return</span>
                  <span className={`font-mono text-xl font-bold ${
                    totalNetCashFlows > capitalDeployed ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    {formatCurrency(totalNetCashFlows - capitalDeployed)}
                  </span>
                </div>
              </div>

              <div className="flex sm:flex-col gap-6 sm:gap-4">
                <div className="text-center sm:text-left">
                  <p className="text-gray-500 text-xs">Capital Deployed</p>
                  <p className="font-mono text-xl font-bold text-red-500">{formatCurrency(capitalDeployed)}</p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-gray-500 text-xs">5-Year Operating Costs</p>
                  <p className="font-mono text-lg font-bold text-red-400">{formatCurrency(results.aiCostModel.totalOngoing5Year)}</p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-gray-500 text-xs">5-Year Gross Savings</p>
                  <p className="font-mono text-xl font-bold text-emerald-600">{formatCurrency(totalGrossSavings)}</p>
                </div>
              </div>
            </div>

            <CostVsSavingsBar
              totalCost={totalCostOfOwnership}
              totalSavings={totalGrossSavings}
              delay={0}
            />
          </CollapsibleSection>
        )}

        {/* Sensitivity Tornado Chart */}
        {effectiveShow('sensitivityAnalysis') && (
          <CollapsibleSection title="Sensitivity Analysis" subtitle="How each variable affects 5-Year NPV" defaultOpen={effectiveAutoExpand.includes('sensitivityAnalysis')}>
            <TornadoChart extendedSensitivity={results.extendedSensitivity} baseNPV={results.scenarios.base.npv} />
          </CollapsibleSection>
        )}

        {/* Monte Carlo Analysis */}
        {effectiveShow('monteCarloAnalysis') && mcResults && (
          <CollapsibleSection title="Monte Carlo Analysis" subtitle={`Probabilistic analysis based on ${mcResults.sampleSize} simulated scenarios`}>
            {/* Hero: Probability of Positive NPV */}
            <div className={`rounded-xl p-4 mb-4 text-center ${
              mcResults.probabilityPositiveNPV >= 0.70
                ? 'bg-emerald-50 border border-emerald-200'
                : mcResults.probabilityPositiveNPV >= 0.40
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-red-50 border border-red-200'
            }`}>
              <p className="text-gray-500 text-xs mb-1">Probability of Positive NPV</p>
              <p className={`font-mono text-4xl font-bold ${
                mcResults.probabilityPositiveNPV >= 0.70 ? 'text-emerald-600' :
                mcResults.probabilityPositiveNPV >= 0.40 ? 'text-amber-600' : 'text-red-500'
              }`}>
                {Math.round(mcResults.probabilityPositiveNPV * 100)}%
              </p>
            </div>

            {/* P10 / P50 / P90 */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-gray-500 text-[10px] mb-0.5">P10 (Downside)</p>
                <p className="font-mono text-sm font-bold text-red-500">{formatCompact(mcResults.npv.p10)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-gray-500 text-[10px] mb-0.5">P50 (Median)</p>
                <p className={`font-mono text-sm font-bold ${mcResults.npv.p50 >= 0 ? 'text-navy' : 'text-red-500'}`}>
                  {formatCompact(mcResults.npv.p50)}
                </p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-gray-500 text-[10px] mb-0.5">P90 (Upside)</p>
                <p className="font-mono text-sm font-bold text-emerald-600">{formatCompact(mcResults.npv.p90)}</p>
              </div>
            </div>

            {/* Histogram */}
            <MonteCarloHistogram npvDistribution={mcResults.npvDistribution} />

            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Mean NPV</span>
                <span className="font-mono text-navy">{formatCompact(mcResults.npv.mean)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Std Dev</span>
                <span className="font-mono text-navy">{formatCompact(mcResults.npv.stdDev)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">IRR (P50)</span>
                <span className="font-mono text-navy">{formatPercent(mcResults.irr.p50)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Payback (P50)</span>
                <span className="font-mono text-navy">{Math.round(mcResults.payback.p50)} mo</span>
              </div>
            </div>

            {/* VaR / Tail Risk */}
            {mcResults.tailRisk && (
              <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-gray-500 text-[10px] mb-0.5">P5 Worst Case</p>
                  <p className="font-mono text-xs font-bold text-red-500">{formatCompact(mcResults.tailRisk.p5Npv)}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-[10px] mb-0.5">P(Capital Loss &gt;50%)</p>
                  <p className="font-mono text-xs font-bold text-red-500">{Math.round(mcResults.tailRisk.probCapitalLoss50 * 100)}%</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-[10px] mb-0.5">P(Payback &gt;60mo)</p>
                  <p className="font-mono text-xs font-bold text-amber-600">{Math.round(mcResults.tailRisk.probPaybackOver60 * 100)}%</p>
                </div>
              </div>
            )}

            <p className="text-[10px] text-gray-400 mt-3 pt-2 border-t border-gray-100">
              Based on {mcResults.sampleSize} correlated simulations varying automation potential, readiness, costs, error rates, and cash realization.
            </p>
          </CollapsibleSection>
        )}

        {/* Quick Facts */}
        {effectiveShow('quickFacts') && (
          <CollapsibleSection title="Quick Facts" subtitle="Key input parameters and results">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Team Size</span>
                <span className="text-navy font-mono">{formData.teamSize} people</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Implementation</span>
                <span className="text-navy font-mono">{results.riskAdjustments.adjustedTimeline} months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Upfront Cost</span>
                <span className="text-navy font-mono">{formatCurrency(results.upfrontInvestment)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Annual AI Cost</span>
                <span className="text-navy font-mono">{formatCurrency(results.aiCostModel.baseOngoingCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Adoption Rate</span>
                <span className="text-navy font-mono">{formatPercent(results.riskAdjustments.adoptionRate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">IRR</span>
                <span className="text-navy font-mono">{isFinite(scenario.irr) ? formatPercent(scenario.irr) : 'N/A'}</span>
              </div>
              {results.breakEvenAdoptionRate != null && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Break-Even Adoption</span>
                  <span className="text-navy font-mono">{formatPercent(results.breakEvenAdoptionRate)}</span>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* V3: Value Pathways */}
        {effectiveShow('valueCreationPathways') && (
          <CollapsibleSection title="Value Creation Pathways" subtitle="Three lenses on how AI creates value">
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
          </CollapsibleSection>
        )}

        {/* V3: Capital Efficiency */}
        {effectiveShow('capitalEfficiency') && (
          <CollapsibleSection title="Capital Efficiency" subtitle="EVA, cash-on-cash, and ROIC metrics">
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
          </CollapsibleSection>
        )}

        {/* Industry Peer Comparison */}
        {effectiveShow('peerComparison') && results.peerComparison && (
          <CollapsibleSection title="Industry Peer Comparison" subtitle={`Your projected ROIC vs ${formData.industry || 'industry'} peers (${formData.companySize || 'your size'})`}>
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
                transition={{ duration: 0.8, ease: 'easeOut' }}
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
          </CollapsibleSection>
        )}

        {/* AI Maturity Premium */}
        {effectiveShow('aiMaturityPremium') && (
          <CollapsibleSection title="AI Maturity Premium" subtitle="Compounding benefits of successive AI deployments">
            <p className="text-sm text-gray-600 mb-4">
              Organizations that successfully deploy their first AI project see compounding returns on subsequent deployments
              through reusable infrastructure, institutional knowledge, and data asset leverage.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-navy/10">
                    <th className="text-left py-2 text-gray-500 font-medium">Metric</th>
                    <th className="text-center py-2 text-gray-500 font-medium">2nd Deploy</th>
                    <th className="text-center py-2 text-gray-500 font-medium">3rd Deploy</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-navy">Cost Reduction</td>
                    <td className="py-2 text-center font-mono text-emerald-600">{formatPercent(AI_MATURITY_PREMIUM.secondDeploymentCostReduction)}</td>
                    <td className="py-2 text-center font-mono text-emerald-600">{formatPercent(AI_MATURITY_PREMIUM.thirdDeploymentCostReduction)}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-navy">Time Compression</td>
                    <td className="py-2 text-center font-mono text-emerald-600">{formatPercent(AI_MATURITY_PREMIUM.secondDeploymentTimeCompression)}</td>
                    <td className="py-2 text-center font-mono text-emerald-600">{formatPercent(AI_MATURITY_PREMIUM.thirdDeploymentTimeCompression)}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-navy">Model Reusability</td>
                    <td className="py-2 text-center font-mono text-navy" colSpan={2}>{formatPercent(AI_MATURITY_PREMIUM.modelReusabilityRate)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-navy">Data Asset Multiplier</td>
                    <td className="py-2 text-center font-mono text-navy" colSpan={2}>{AI_MATURITY_PREMIUM.dataAssetValueMultiplier}x</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-400 mt-3 pt-2 border-t border-gray-100">
              Maturity premiums are strategic projections based on BCG/McKinsey research and are not included in the DCF model.
              Actual improvements depend on infrastructure reuse, data pipeline maturity, and organizational AI capability.
            </p>
          </CollapsibleSection>
        )}

        {/* V3: Gate Structure */}
        {effectiveShow('phasedDeploymentGates') && (
          <CollapsibleSection title="Phased Deployment Gates" subtitle="Go/no-go thresholds at each stage">
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
          </CollapsibleSection>
        )}

      </div>

      {/* Email Gate Modal */}
      <AnimatePresence>
        {emailGateAction && (
          <EmailGateModal
            onSubmit={handleEmailSubmit}
            onClose={() => setEmailGateAction(null)}
            formData={formData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
