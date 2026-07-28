import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { runCalculations } from '../../logic/calculations';
import { getRecommendation } from '../../logic/recommendations';
import { AI_MATURITY_PREMIUM } from '../../logic/benchmarks';
import { formatCurrency, formatPercent, formatCompact } from '../../utils/formatters';
import { getOutputTier, tierShows, AUTO_EXPAND } from '../../utils/outputTier';
import { getValueBreakdownCategories, getValueBreakdownTotals } from './ValueBreakdown';
import {
  buildTwoDriverSensitivityMatrix,
  getCaseSensitivityConfig,
  getSensitivityLeverLabel,
} from './sensitivityMatrix';

// ---------------------------------------------------------------------------
// Interactive driver configuration — maps lever labels → formData fields
// ---------------------------------------------------------------------------
const LEVER_FIELD_MAP = {
  'Team Size':          { path: 'teamSize', type: 'number', min: 1, max: 100000, step: 1 },
  'Avg Cost per Person':{ path: 'avgSalary', type: 'currency', min: 10000, max: 10000000, step: 5000 },
  'Error / Rework Rate':{ path: 'errorRate', type: 'percent', min: 0, max: 0.50, step: 0.01 },
  'Automation Potential':{ path: 'assumptions.automationPotential', type: 'percent', min: 0.10, max: 0.95, step: 0.01 },
  'Implementation Cost': { path: 'implementationBudget', type: 'currency', min: 0, max: 50000000, step: 10000 },
  'Ongoing Annual Cost': { path: 'ongoingAnnualCost', type: 'currency', min: 0, max: 10000000, step: 5000 },
};

// The wizard now collects the employee / contractor mix directly. Keep the
// result page honest: these legacy aggregate levers are shown as calculated
// context, not editable substitutes for the source-of-truth workforce inputs.
const WORKFORCE_LEVER_LABELS = {
  'Team Size': 'Current process workforce',
  'Avg Cost per Person': 'Blended annual workforce cost',
};

function getNestedValue(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function setNestedValue(obj, path, value) {
  const clone = { ...obj };
  const keys = path.split('.');
  if (keys.length === 1) {
    clone[keys[0]] = value;
  } else {
    clone[keys[0]] = { ...clone[keys[0]], [keys[1]]: value };
  }
  return clone;
}

const WATERFALL_COLORS = {
  efficiency: 'bg-emerald-500',
  errorReduction: 'bg-teal-400',
  headcount: 'bg-blue-500',
  toolReplacement: 'bg-violet-400',
  contractExit: 'bg-indigo-400',
  caseDirectSavings: 'bg-cyan-600',
};

/**
 * Build the visible savings waterfall from cash/cost value streams only.
 * Legacy `archetypeRevenue` is deliberately excluded because it was a
 * forecast, not a verified operating savings category.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function buildSavingsBuckets(valueBreakdown = {}, scale = 1) {
  const safeScale = Number.isFinite(Number(scale)) ? Number(scale) : 1;
  return getValueBreakdownCategories(valueBreakdown)
    .map(({ key, label }) => ({
      label,
      value: Math.max(0, Number(valueBreakdown[key]?.riskAdjusted) || 0) * safeScale,
      color: WATERFALL_COLORS[key] || 'bg-slate-400',
    }))
    .filter((bucket) => bucket.value > 0);
}

// ---------------------------------------------------------------------------
// Tooltip: cost buildup for each driver
// ---------------------------------------------------------------------------
function LeverTooltip({ lever, displayLabel, results, formData }) {
  const vb = results.valueBreakdown;
  const ai = results.aiCostModel;
  const assumptions = results.executiveSummary?.keyAssumptions;
  const workforce = results.currentState?.workforceMix;
  const usesWorkforceMix = Boolean(workforce?.hasWorkforceMix);

  const buildupLines = useMemo(() => {
    const lines = [];
    switch (lever.label) {
      case 'Automation Potential':
        lines.push(`Efficiency savings: ${formatCompact(vb?.efficiency?.riskAdjusted || 0)}/yr`);
        lines.push(`Error reduction: ${formatCompact(vb?.errorReduction?.riskAdjusted || 0)}/yr`);
        lines.push(`Headcount savings: ${formatCompact(vb?.headcount?.gross || 0)}/yr (phased)`);
        lines.push(`Total gross: ${formatCompact(vb?.totalGross || 0)}/yr`);
        break;
      case 'Implementation Cost':
        lines.push(`Upfront investment: ${formatCompact(results.upfrontInvestment || 0)}`);
        lines.push(`Software + integration: ${formatCompact(ai?.platformAndTools || 0)}`);
        lines.push(`Change mgmt + training: ${formatCompact(ai?.changeMgmtTraining || 0)}`);
        lines.push(`5-yr ongoing: ${formatCompact(ai?.totalOngoing5Year || 0)}`);
        break;
      case 'Avg Cost per Person':
        if (usesWorkforceMix) {
          lines.push(`Direct employees: ${workforce.directEmployeeCount} × ${formatCurrency(workforce.employeeFullyBurdenedCost || 0)}`);
          lines.push(`Contractors: ${workforce.offshoreContractorCount} × ${formatCurrency(workforce.contractorFullyBurdenedCost || 0)}`);
          lines.push(`Annual headcount cost: ${formatCompact(workforce.totalAnnualHeadcountCost || 0)}`);
        } else {
          lines.push(`Team: ${formData.teamSize} × ${formatCurrency(formData.avgSalary || 0)}`);
          lines.push(`Annual labor: ${formatCompact((formData.teamSize || 0) * (formData.avgSalary || 0))}`);
          lines.push(`Rework cost: ${formatCompact((formData.teamSize || 0) * (formData.avgSalary || 0) * (formData.errorRate || 0.10))}/yr`);
        }
        break;
      case 'Team Size':
        lines.push(`People doing this work: ${results.currentState?.totalHeadcount ?? formData.teamSize}`);
        lines.push(`Annual headcount cost: ${formatCompact(workforce?.totalAnnualHeadcountCost ?? ((formData.teamSize || 0) * (formData.avgSalary || 0)))}`);
        lines.push(`Measured workload: ${formatCompact(results.caseEconomics?.caseWorkloadHoursPerWeek || 0)} hours/week`);
        lines.push(`Automatable: ${formatPercent(assumptions?.automationPotential || 0)}`);
        lines.push(`Potential capacity: ${Math.round(((results.currentState?.totalHeadcount ?? formData.teamSize ?? 0) * (assumptions?.automationPotential || 0)))} FTEs`);
        break;
      case 'Ongoing Annual Cost':
        lines.push(`Base ongoing: ${formatCompact(ai?.baseAnnualOngoing || 0)}/yr`);
        lines.push(`LLM/API costs: ${formatCompact(ai?.llmApiCost || ai?.tokenCost || 0)}/yr`);
        lines.push(`5-yr total: ${formatCompact(ai?.totalOngoing5Year || 0)}`);
        break;
      case 'Error / Rework Rate':
        lines.push(`Rework cost: ${formatCompact(vb?.errorReduction?.gross || 0)}/yr`);
        lines.push(`Error savings from AI: ${formatCompact(vb?.errorReduction?.riskAdjusted || 0)}/yr`);
        break;
      default:
        lines.push(`NPV range: ${formatCompact(lever.npvLow)} to ${formatCompact(lever.npvHigh)}`);
    }
    lines.push(`Swing: ${formatCompact(lever.npvSwing)}`);
    return lines;
  }, [lever, vb, ai, formData, results, assumptions, workforce, usesWorkforceMix]);

  return (
    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-900/95 backdrop-blur-xl text-white text-xs rounded-2xl shadow-2xl shadow-black/10 px-4 py-3 pointer-events-none">
      <p className="font-medium mb-1.5 text-white/60 tracking-wide uppercase text-[10px]">{displayLabel || lever.label}</p>
      {buildupLines.map((line, i) => (
        <p key={i} className="text-white/80 leading-relaxed">{line}</p>
      ))}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/95" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline editable driver input
// ---------------------------------------------------------------------------
function DriverInput({ lever: _lever, config, currentValue, onChange }) {
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState('');
  const inputRef = useRef(null);

  const displayValue = config.type === 'percent'
    ? `${(currentValue * 100).toFixed(0)}%`
    : config.type === 'currency'
      ? formatCompact(currentValue)
      : currentValue.toLocaleString();

  const handleStartEdit = () => {
    const rawDisplay = config.type === 'percent'
      ? (currentValue * 100).toFixed(0)
      : config.type === 'currency'
        ? Math.round(currentValue).toString()
        : currentValue.toString();
    setLocalVal(rawDisplay);
    setEditing(true);
  };

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const handleCommit = () => {
    setEditing(false);
    const raw = parseFloat(localVal.replace(/[^0-9.-]/g, ''));
    if (isNaN(raw)) return;
    const final = config.type === 'percent'
      ? Math.max(config.min, Math.min(config.max, raw / 100))
      : Math.max(config.min, Math.min(config.max, raw));
    onChange(final);
  };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-0.5">
        {config.type === 'currency' && <span className="text-gray-400 text-xs">$</span>}
        <input
          ref={inputRef}
          type="text"
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCommit(); if (e.key === 'Escape') setEditing(false); }}
          className="w-24 px-2 py-1 rounded-lg border border-gray-300 bg-white text-navy font-mono text-xs font-medium focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition-shadow"
        />
        {config.type === 'percent' && <span className="text-gray-400 text-xs">%</span>}
      </span>
    );
  }

  return (
    <button
      onClick={handleStartEdit}
      className="inline-flex items-center gap-1 font-mono font-medium text-navy text-xs hover:text-gold transition-colors cursor-pointer group"
      title="Click to edit"
    >
      {displayValue}
      <svg className="w-3 h-3 text-gray-300 group-hover:text-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    </button>
  );
}

function DriverCard({ index, lever, displayLabel, config, currentValue, results, formData, leverInputDisplay, onValueChange }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      key={lever.label}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6 + index * 0.1, duration: 0.3 }}
      className="rounded-2xl bg-white/60 backdrop-blur-sm border border-gray-200/60 p-4 relative transition-all duration-200 hover:bg-white/80"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-900 text-white text-[10px] font-semibold">{index + 1}</span>
          <span className="text-gray-900 font-medium text-sm tracking-tight">{displayLabel || lever.label}</span>
        </div>
        <span className="font-mono text-gray-500 text-xs">{formatCompact(lever.npvSwing)} swing</span>
      </div>
      <div className="ml-9 flex items-center gap-2">
        <span className="text-[11px] text-gray-400">Current:</span>
        {config && currentValue != null ? (
          <DriverInput
            lever={lever}
            config={config}
            currentValue={currentValue}
            onChange={onValueChange}
          />
        ) : (
          leverInputDisplay && (
            <span className="font-mono font-medium text-navy text-xs">{leverInputDisplay}</span>
          )
        )}
      </div>
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
          >
            <LeverTooltip lever={lever} displayLabel={displayLabel} results={results} formData={formData} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MetricCard({ label, value, subtext, color = 'navy', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-6 text-center"
    >
      <p className="text-gray-400 text-[11px] font-medium uppercase tracking-widest mb-2">{label}</p>
      <p className={`font-mono text-3xl font-bold tracking-tight ${
        color === 'green' ? 'text-emerald-600' :
        color === 'red' ? 'text-red-500' :
        color === 'gold' ? 'text-amber-500' : 'text-gray-900'
      }`}>
        {value}
      </p>
      {subtext && <p className="text-gray-400 text-[11px] mt-2 leading-relaxed">{subtext}</p>}
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
    <div className="space-y-2.5">
      {projections.map((yr, i) => {
        const pct = (yr.grossSavings / maxSavings) * 100;
        return (
          <motion.div
            key={yr.year}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + i * 0.08, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex items-center gap-3"
          >
            <span className="text-gray-400 text-xs w-10 shrink-0 font-medium">FY {yr.year}</span>
            <div className="flex-1 h-5 bg-gray-100/80 rounded-lg overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ delay: delay + i * 0.08 + 0.15, duration: 0.6, ease: 'easeOut' }}
                className="h-full bg-gray-900 rounded-lg"
              />
            </div>
            <span className="font-mono text-gray-900 text-xs w-24 text-right">
              {formatCurrency(yr.grossSavings)}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

function TornadoChart({ extendedSensitivity, baseNPV, sensitivityConfig }) {
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
        const label = getSensitivityLeverLabel(row.label, sensitivityConfig);
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
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] text-gray-500 w-32 sm:w-40 shrink-0 truncate" title={label}>{label}</span>
              <div className="flex-1 relative h-4 bg-gray-100/80 rounded-lg">
                <div
                  className="absolute top-0 bottom-0 w-px bg-gray-400/40 z-10"
                  style={{ left: `${basePct}%` }}
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPct}%` }}
                  transition={{ delay: i * 0.08 + 0.2, duration: 0.4, ease: 'easeOut' }}
                  className="absolute top-0.5 bottom-0.5 rounded-md bg-gradient-to-r from-red-300 via-amber-300 to-emerald-300"
                  style={{ left: `${leftPct}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-gray-400 w-20 text-right shrink-0">
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

function formatSensitivityInput(value, input, unit = '') {
  if (!Number.isFinite(Number(value))) return '—';
  const numeric = Number(value);
  if (input?.format?.startsWith('$') || unit.startsWith('$')) return formatCurrency(numeric);
  if (input?.type === 'percent') return formatPercent(numeric);
  const decimals = input?.step && input.step < 1 ? 1 : 0;
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(numeric);
  return unit ? `${formatted} ${unit}` : formatted;
}

function sensitivityCellStyle(value, allValues) {
  if (!Number.isFinite(value)) {
    return { className: 'bg-gray-50 text-gray-400 border-gray-100', style: undefined };
  }
  const maxMagnitude = Math.max(...allValues.map((candidate) => Math.abs(candidate)).filter(Number.isFinite), 1);
  const intensity = Math.min(0.88, 0.16 + (Math.abs(value) / maxMagnitude) * 0.62);
  const positive = value >= 0;
  return {
    className: `${positive ? 'border-emerald-200/50' : 'border-red-200/50'} ${intensity > 0.58 ? 'text-white' : positive ? 'text-emerald-950' : 'text-red-950'}`,
    style: {
      backgroundColor: positive
        ? `rgba(16, 185, 129, ${intensity})`
        : `rgba(248, 113, 113, ${intensity})`,
    },
  };
}

function TwoDriverSensitivityMatrix({ matrix, metric, onMetricChange }) {
  if (!matrix) return null;

  const isNpv = metric === 'npv';
  // Capacity bumpers are not financial outcomes. Exclude them from the
  // heat-map scale so a blocked scenario cannot distort the defensible range.
  const allValues = matrix.rows
    .flatMap((row) => row.cells)
    .filter((cell) => !cell.blocked)
    .map((cell) => cell[metric]);
  const planningPoints = [
    { key: 'p25', label: 'P25', description: 'Lower planning point', tone: 'border-amber-200 bg-amber-50/70 text-amber-900' },
    { key: 'p50', label: 'Median', description: 'Current planning point', tone: 'border-gray-300 bg-gray-900 text-white' },
    { key: 'p75', label: 'P75', description: 'Upper planning point', tone: 'border-emerald-200 bg-emerald-50/70 text-emerald-900' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-6 mb-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-1">
        <div>
          <h3 className="text-gray-900 font-semibold text-base tracking-tight">Two-Driver Sensitivity</h3>
          <p className="text-gray-400 text-[11px] mt-1">
            10 × 10 case-specific planning square: {matrix.config.volumeLabel.toLowerCase()} × {matrix.config.economicLabel.toLowerCase()}
          </p>
        </div>
        <div className="inline-flex self-start rounded-lg bg-gray-100/80 p-0.5 border border-gray-200/60" aria-label="Sensitivity metric">
          <button
            type="button"
            onClick={() => onMetricChange('npv')}
            aria-pressed={isNpv}
            className={`rounded-md px-2.5 py-1.5 text-[10px] font-medium transition-colors cursor-pointer ${
              isNpv ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            5-Yr NPV
          </button>
          <button
            type="button"
            onClick={() => onMetricChange('annualCashSavings')}
            aria-pressed={!isNpv}
            className={`rounded-md px-2.5 py-1.5 text-[10px] font-medium transition-colors cursor-pointer ${
              !isNpv ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            FY5 cash savings
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 mb-5">
        {planningPoints.map(({ key, label, description, tone }) => {
          const point = matrix.planningPoints[key];
          const value = point?.[metric];
          const pointIsBlocked = point?.blocked;
          return (
            <div key={key} className={`rounded-xl border px-3.5 py-3 ${tone}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
                <span className="text-[10px] opacity-70">{description}</span>
              </div>
              <p className="font-mono text-lg font-bold mt-1">{pointIsBlocked ? 'Guardrail' : formatCompact(value)}</p>
              <p className="text-[10px] mt-1 opacity-80">
                {pointIsBlocked
                  ? 'Reconcile workload capacity'
                  : isNpv
                    ? `FY5 cash: ${formatCompact(point?.annualCashSavings)}`
                    : `NPV: ${formatCompact(point?.npv)}`}
              </p>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="min-w-[690px]" role="grid" aria-label={`${matrix.config.volumeLabel} by ${matrix.config.economicLabel} sensitivity matrix`}>
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 text-right pr-1 mb-1">
            {matrix.config.volumeLabel} →
          </p>
          <div className="grid grid-cols-[minmax(150px,1.5fr)_repeat(10,minmax(50px,1fr))] gap-1.5 mb-1.5">
            <div className="flex items-end pb-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">
              {matrix.config.economicLabel} ↓
            </div>
            {matrix.volumeLevels.map((value, index) => (
              <div
                key={`${value}-${index}`}
                className={`text-center rounded-md px-1 py-1.5 text-[10px] font-mono ${index === 5 ? 'bg-gray-900 text-white font-semibold' : 'bg-gray-50 text-gray-500'}`}
                title={`${matrix.config.volumeLabel}: ${formatSensitivityInput(value, matrix.volumeInput, matrix.config.volumeUnit)}`}
              >
                {formatSensitivityInput(value, matrix.volumeInput)}
              </div>
            ))}
          </div>
          {matrix.rows.map((row, rowIndex) => (
            <div key={`${row.economicValue}-${rowIndex}`} className="grid grid-cols-[minmax(150px,1.5fr)_repeat(10,minmax(50px,1fr))] gap-1.5 mb-1.5" role="row">
              <div className={`flex items-center rounded-md px-2 text-[10px] font-mono ${rowIndex === 5 ? 'bg-gray-900 text-white font-semibold' : 'bg-gray-50 text-gray-600'}`}>
                {formatSensitivityInput(row.economicValue, matrix.economicInput, matrix.config.economicUnit)}
              </div>
              {row.cells.map((cell, columnIndex) => {
                const displayValue = cell[metric];
                const tone = sensitivityCellStyle(displayValue, allValues);
                const isBlocked = cell.blocked;
                const isPlanningPoint = (
                  (rowIndex === 3 && columnIndex === 3)
                  || (rowIndex === 5 && columnIndex === 5)
                  || (rowIndex === 7 && columnIndex === 7)
                );
                const planningLabel = rowIndex === 3 && columnIndex === 3
                  ? 'P25 lower planning point'
                  : rowIndex === 5 && columnIndex === 5
                    ? 'Median current planning point'
                    : rowIndex === 7 && columnIndex === 7
                      ? 'P75 upper planning point'
                      : '';
                const guardrailSuffix = isBlocked
                  ? ` Guardrail: ${cell.guardrailMessage || 'This combination falls outside the measured workforce capacity.'}`
                  : '';
                const label = `${matrix.config.volumeLabel}: ${formatSensitivityInput(cell.volume, matrix.volumeInput, matrix.config.volumeUnit)}. ${matrix.config.economicLabel}: ${formatSensitivityInput(cell.economicValue, matrix.economicInput, matrix.config.economicUnit)}.${isBlocked ? '' : ` FY5 cash savings ${formatCurrency(cell.annualCashSavings)}. Five-year NPV ${formatCurrency(cell.npv)}.`}${planningLabel ? ` ${planningLabel}.` : ''}${guardrailSuffix}`;
                return (
                  <div
                    key={`${cell.volume}-${cell.economicValue}-${columnIndex}`}
                    role="gridcell"
                    aria-label={label}
                    title={isBlocked
                      ? `Guardrail: ${cell.guardrailMessage || 'This combination falls outside the measured workforce capacity.'}${planningLabel ? `\n${planningLabel}` : ''}`
                      : `FY5 cash savings: ${formatCurrency(cell.annualCashSavings)}\n5-year NPV: ${formatCurrency(cell.npv)}${planningLabel ? `\n${planningLabel}` : ''}`}
                    className={`min-h-10 rounded-md border px-1 flex items-center justify-center text-center font-mono text-[10px] font-semibold transition-col ${isBlocked ? 'border-amber-300 border-dashed bg-amber-50 text-amber-800' : tone.className} ${isPlanningPoint ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
                    style={isBlocked ? undefined : tone.style}
                  >
                    {isBlocked ? 'Guardrail' : Number.isFinite(displayValue) ? formatCompact(displayValue) : '—'}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {((isNpv && !matrix.hasNpvVariation) || (!isNpv && !matrix.hasAnnualCashSavingsVariation)) && (
        <p className="text-[10px] text-amber-700 mt-3 leading-relaxed">
          This range is flat because the current workforce and contract plan does not convert additional workload into an approved cash action. That is intentional: the model will not invent savings from freed capacity alone.
        </p>
      )}
      {matrix.blockedCellCount > 0 && (
        <p className="text-[10px] text-amber-700 mt-3 leading-relaxed">
          {matrix.blockedCellCount} planning combination{matrix.blockedCellCount === 1 ? '' : 's'} exceed credible workforce capacity or have no measurable workload. They are marked Guardrail and excluded from the range rather than being treated as a financial result.
        </p>
      )}
      <p className="text-[10px] text-gray-400 mt-4 leading-relaxed">
        Each cell reruns the base DCF with the selected case inputs. FY5 cash savings are the model’s gross savings at full adoption; NPV includes timing, AI costs, and the selected workforce/contract actions. P25, Median, and P75 pair lower, current, and upper planning levels (targeting 75%, 100%, and 125%, adjusted to valid input steps); they are planning points, not statistical probability estimates.
      </p>
      {matrix.config.capacityOnly && (
        <p className="text-[10px] text-amber-700 mt-2 leading-relaxed">
          Customer support cost per contact has not been validated as cash-realizable, so the matrix uses resolution time and does not add unvalidated support-cost avoidance to NPV.
        </p>
      )}
    </motion.div>
  );
}

function CollapsibleSection({ title, subtitle, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm mb-6 overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 cursor-pointer text-left hover:bg-white/50 transition-colors"
      >
        <div>
          <h3 className="text-gray-900 font-semibold text-base tracking-tight">{title}</h3>
          {subtitle && <p className="text-gray-400 text-[11px] mt-0.5">{subtitle}</p>}
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
      <div className="flex h-8 rounded-xl overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${costPct}%` }}
          transition={{ delay: delay + 0.2, duration: 0.8, ease: 'easeOut' }}
          className="bg-red-400/80 flex items-center justify-center"
        >
          <span className="text-white text-[11px] font-medium px-2 truncate">
            {formatCurrency(totalCost)}
          </span>
        </motion.div>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${savingsPct}%` }}
          transition={{ delay: delay + 0.4, duration: 0.8, ease: 'easeOut' }}
          className="bg-emerald-400/80 flex items-center justify-center"
        >
          <span className="text-white text-[11px] font-medium px-2 truncate">
            {formatCurrency(totalSavings)}
          </span>
        </motion.div>
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Total Investment</span>
        <span>5-FY Gross Savings</span>
      </div>
    </motion.div>
  );
}

const API_URL = import.meta.env.VITE_API_URL || '';

export default function LiveCalculation({ formData, onDownload, onDownloadExcel, onStartOver, onEditInputs, onShare }) {
  // Custom adoption ramp — editable on results page, defaults to benchmark ramp
  const [customRamp, setCustomRamp] = useState(null);
  // Driver overrides — inline edits on the "What Drives This Result" cards
  const [driverOverrides, setDriverOverrides] = useState({});
  const effectiveFormData = useMemo(() => {
    let fd = formData;
    if (customRamp) fd = { ...fd, customAdoptionRamp: customRamp };
    // Merge driver overrides into formData (supports nested paths like 'assumptions.automationPotential')
    for (const [path, value] of Object.entries(driverOverrides)) {
      if (value !== undefined) fd = setNestedValue(fd, path, value);
    }
    return fd;
  }, [formData, customRamp, driverOverrides]);
  const results = useMemo(() => runCalculations(effectiveFormData), [effectiveFormData]);

  // Derive output tier from role
  const tier = useMemo(() => getOutputTier(formData.role), [formData.role]);
  const show = useCallback((section) => tierShows(tier, section), [tier]);
  const autoExpand = AUTO_EXPAND[tier] || [];

  const effectiveShow = show;
  const effectiveAutoExpand = autoExpand;

  const recommendation = useMemo(() => getRecommendation(results, tier), [results, tier]);

  // Monte Carlo simulation (async dynamic import to avoid blocking initial render)
  const [mcResults, setMcResults] = useState(null);
  useEffect(() => {
    let cancelled = false;
    import('../../logic/monteCarlo').then(({ runMonteCarlo }) => {
      if (!cancelled) {
        setMcResults(runMonteCarlo(effectiveFormData, 500));
      }
    });
    return () => { cancelled = true; };
  }, [effectiveFormData]);

  // Scenario toggle
  const [activeScenario, setActiveScenario] = useState('base');
  const scenario = results.scenarios[activeScenario];
  const totalGrossSavings = scenario.projections.reduce((sum, yr) => sum + yr.grossSavings, 0);
  const totalNetCashFlows = scenario.projections.reduce((sum, yr) => sum + yr.netCashFlow, 0);
  // Upfront investment = implementation + hidden costs (the initial check)
  const upfrontInvestment = results.upfrontInvestment || 0;
  // Capital deployed = upfront + separation (total capital committed — for ROIC denominator)
  const capitalDeployed = results.investment?.totalInvestment || results.totalInvestment || 0;
  // Net return: netCashFlows already subtract separation + ongoing costs year-by-year,
  // so only subtract upfrontInvestment to avoid double-counting separation.
  const netReturn = totalNetCashFlows - upfrontInvestment;
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
  const workforceMix = results.currentState?.workforceMix;
  const usesWorkforceMix = Boolean(workforceMix?.hasWorkforceMix);
  const currentProcessWorkforce = results.currentState?.totalHeadcount ?? formData.teamSize ?? 0;
  const blendedWorkforceCost = results.currentState?.blendedFullyBurdenedCost ?? formData.avgSalary ?? 0;
  const totalAnnualHeadcountCost = workforceMix?.totalAnnualHeadcountCost
    ?? results.currentState?.annualLaborCost
    ?? (currentProcessWorkforce * blendedWorkforceCost);

  // Map lever labels to current input values for display
  const leverInputValues = useMemo(() => ({
    'Team Size': `${currentProcessWorkforce} people`,
    'Avg Cost per Person': formatCompact(blendedWorkforceCost),
    'Error Rate': `${((formData.errorRate || results.executiveSummary?.keyAssumptions?.errorRate || 0.10) * 100).toFixed(0)}%`,
    'Automation Potential': formatPercent(results.executiveSummary?.keyAssumptions?.automationPotential || 0),
    'Implementation Cost': formatCompact(formData.implementationBudget || 0),
    'Ongoing Cost': formatCompact(formData.ongoingAnnualCost || 0),
    'Discount Rate': formatPercent(results.discountRate || 0),
  }), [formData, results, currentProcessWorkforce, blendedWorkforceCost]);

  // Download loading states
  const [pdfLoading, setPdfLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [sensitivityMetric, setSensitivityMetric] = useState('npv');

  const caseSensitivityConfig = useMemo(
    () => getCaseSensitivityConfig(effectiveFormData.projectArchetype, results),
    [effectiveFormData.projectArchetype, results],
  );

  // The 100 model runs are intentionally deferred until the user asks for
  // Detailed Analysis, keeping the initial executive result fast.
  const twoDriverSensitivity = useMemo(() => (
    showDetailedAnalysis
      ? buildTwoDriverSensitivityMatrix(effectiveFormData, results)
      : null
  ), [showDetailedAnalysis, effectiveFormData, results]);

  const handlePdfDownload = useCallback(async () => {
    setPdfLoading(true);
    try {
      await Promise.resolve(onDownload(results, recommendation, mcResults));
    } finally {
      setTimeout(() => setPdfLoading(false), 500);
    }
  }, [onDownload, results, recommendation, mcResults]);

  const handleExcelDownload = useCallback(async () => {
    setExcelLoading(true);
    try {
      await Promise.resolve(onDownloadExcel(mcResults, results));
    } catch (err) {
      console.error('Excel download failed:', err);
    } finally {
      setTimeout(() => setExcelLoading(false), 500);
    }
  }, [onDownloadExcel, mcResults, results]);

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
    <div className="min-h-screen bg-[#f5f5f7] py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Back button */}
        {onEditInputs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <button
              onClick={onEditInputs}
              className="inline-flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Edit Inputs
            </button>
          </motion.div>
        )}

        {/* Scenario Toggle */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-white/60 backdrop-blur-xl rounded-full border border-gray-200/60 p-1 gap-0.5">
            {[
              { key: 'conservative', label: 'Conservative' },
              { key: 'base', label: 'Base Case' },
              { key: 'optimistic', label: 'Optimistic' },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => setActiveScenario(s.key)}
                className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all duration-200 cursor-pointer ${
                  activeScenario === s.key
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ============================================ */}
        {/* ZONE A — Hero ROI + Key Metrics */}
        {/* ============================================ */}

        {/* Hero: ROI front and center */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center mb-8"
        >
          <p className="text-gray-400 text-[11px] uppercase tracking-widest font-medium mb-2">5-Year ROI</p>
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className={`font-mono text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight ${
              scenarioROI >= 0 ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {formatPercent(scenarioROI)}
          </motion.p>
          <p className="text-gray-500 text-sm mt-3 max-w-sm mx-auto leading-relaxed">
            {isPositiveROI
              ? `${formatCurrency(netReturn)} net return on ${formatCompact(capitalDeployed)} invested`
              : `${formatCurrency(-netReturn)} shortfall — see suggestions below`
            }
          </p>
        </motion.div>

        {/* Key Metrics — 3 Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <MetricCard
            label="Break-Even"
            value={scenario.paybackMonths > 60 ? '>5 yrs' : `${scenario.paybackMonths} mo`}
            subtext={scenario.paybackMonths <= 60 ? `${Math.round(scenario.paybackMonths / 12 * 10) / 10} years` : 'Does not break even in 5 years'}
            color={scenario.paybackMonths <= 36 ? 'green' : scenario.paybackMonths <= 60 ? 'neutral' : 'red'}
            delay={0.2}
          />
          <MetricCard
            label="Annual Savings (Year 5)"
            value={formatCompact(scenario.projections[4]?.grossSavings || 0)}
            subtext={`Net: ${formatCompact(scenario.projections[4]?.netCashFlow || 0)} after costs`}
            color={(scenario.projections[4]?.netCashFlow || 0) >= 0 ? 'green' : 'red'}
            delay={0.3}
          />
          <MetricCard
            label="5-Year Net Return"
            value={formatCompact(netReturn)}
            subtext={`${formatCompact(totalGrossSavings)} savings − ${formatCompact(totalCostOfOwnership)} costs`}
            color={netReturn >= 0 ? 'green' : 'red'}
            delay={0.4}
          />
        </div>

        {/* Savings Waterfall — how annual savings build up */}
        {results.valueBreakdown && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-6 mb-6"
          >
            {(() => {
              // Show Year 5 (full ramp) savings breakdown
              const yr5 = scenario.projections[4] || scenario.projections[scenario.projections.length - 1];
              const vb = results.valueBreakdown;
              const yr5Gross = yr5?.grossSavings || 0;
              const yr5Net = yr5?.netCashFlow || 0;
              const yr5Ongoing = yr5?.ongoingCost || 0;

              // Scale breakdown proportionally to year 5 gross
              const totalRA = getValueBreakdownTotals(vb).riskAdjusted || 1;
              const scale = yr5Gross / totalRA;
              const savingsBuckets = buildSavingsBuckets(vb, scale);

              const maxVal = Math.max(...savingsBuckets.map(b => b.value), yr5Ongoing, 1);

              return (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-baseline justify-between mb-1">
                      <h3 className="text-gray-900 font-semibold text-base tracking-tight">Where the Savings Come From</h3>
                      <span className="text-[11px] text-gray-400">Year 5 (full ramp)</span>
                    </div>
                    <p className="text-gray-400 text-[11px]">
                      Annual gross savings: <span className="font-mono font-semibold text-gray-900">{formatCompact(yr5Gross)}</span>
                      {' '}&middot;{' '}
                      After ongoing costs: <span className={`font-mono font-semibold ${yr5Net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCompact(yr5Net)}</span>
                    </p>
                  </div>

                  {/* Savings buckets */}
                  <div className="space-y-2.5">
                    {savingsBuckets.map((b, bi) => {
                      const pct = (b.value / maxVal) * 100;
                      return (
                        <div key={b.label} className="space-y-1">
                          <div className="flex items-baseline justify-between">
                            <span className="text-[13px] font-medium text-gray-700">{b.label}</span>
                            <span className="font-mono text-[13px] font-semibold text-gray-900">{formatCompact(b.value)}</span>
                          </div>
                          <div className="h-4 w-full rounded-lg bg-gray-100/80 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(pct, 3)}%` }}
                              transition={{ duration: 0.6, delay: 0.15 + bi * 0.08, ease: 'easeOut' }}
                              className={`h-full rounded-lg ${b.color}`}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Ongoing costs (negative) */}
                    {yr5Ongoing > 0 && (
                      <div className="space-y-1 pt-1 border-t border-gray-100">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[13px] font-medium text-red-400">Less: Ongoing AI Costs</span>
                          <span className="font-mono text-[13px] font-semibold text-red-500">−{formatCompact(yr5Ongoing)}</span>
                        </div>
                        <div className="h-4 w-full rounded-lg bg-gray-100/80 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max((yr5Ongoing / maxVal) * 100, 3)}%` }}
                            transition={{ duration: 0.6, delay: 0.15 + savingsBuckets.length * 0.08, ease: 'easeOut' }}
                            className="h-full rounded-lg bg-red-400/60"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Net total bar */}
                  <div className="border-t border-gray-200/60 pt-3">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-[13px] font-bold text-gray-900">Net Annual Value (Year 5)</span>
                      <span className={`font-mono text-base font-bold ${yr5Net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCompact(yr5Net)}</span>
                    </div>
                    <div className="flex h-3 w-full overflow-hidden rounded-full gap-px">
                      {savingsBuckets.map((b) => {
                        const segPct = yr5Gross > 0 ? (b.value / yr5Gross) * 100 : 0;
                        return (
                          <div
                            key={b.label}
                            className={`${b.color} rounded-full`}
                            style={{ width: `${Math.max(segPct, b.value > 0 ? 3 : 0)}%` }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}

        {/* Download + Actions — right after the key findings */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center space-y-4 mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handlePdfDownload}
              disabled={pdfLoading}
              className="bg-gray-900 text-white font-medium py-3.5 px-8 rounded-full text-sm cursor-pointer transition-all duration-200 hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait"
            >
              {pdfLoading ? (
                <span className="flex items-center gap-2 justify-center">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating...
                </span>
              ) : (
                <span className="flex items-center gap-2 justify-center">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3" />
                  </svg>
                  Download Presentation
                </span>
              )}
            </button>
            <button
              onClick={handleExcelDownload}
              disabled={excelLoading}
              className="bg-white/80 backdrop-blur-sm text-gray-900 font-medium py-3.5 px-8 rounded-full text-sm border border-gray-200/60 cursor-pointer transition-all duration-200 hover:bg-white active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait"
            >
              {excelLoading ? (
                <span className="flex items-center gap-2 justify-center">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating...
                </span>
              ) : (
                <span className="flex items-center gap-2 justify-center">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3" />
                  </svg>
                  Download Excel Model
                </span>
              )}
            </button>
          </div>
          <div className="flex items-center justify-center gap-5">
            {onShare && (
              <button
                onClick={() => {
                  onShare();
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 2000);
                }}
                className="text-gray-500 hover:text-gray-900 text-[13px] cursor-pointer transition-colors"
              >
                {shareCopied ? 'Link Copied!' : 'Share Link'}
              </button>
            )}
            {onEditInputs && (
              <button
                onClick={onEditInputs}
                className="text-gray-500 hover:text-gray-900 text-[13px] cursor-pointer transition-colors"
              >
                Edit Inputs
              </button>
            )}
            {onStartOver && (
              <button
                onClick={onStartOver}
                className="text-gray-400 hover:text-gray-900 text-[13px] cursor-pointer transition-colors"
              >
                Start Over
              </button>
            )}
          </div>
        </motion.div>

        {/* What Drives This Result? — interactive driver cards */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-6 mb-6"
        >
          <h3 className="text-gray-900 font-semibold text-base tracking-tight mb-1">What Drives This Result?</h3>
          <p className="text-gray-400 text-[11px] mb-4">
            {leverCount === 1 ? 'The single biggest lever on your ROI' : `Top ${leverCount} levers — editable values show a pencil`}
          </p>
          <div className="space-y-2.5">
            {results.executiveSummary.topLevers.slice(0, leverCount).map((lever, i) => {
              const isCalculatedWorkforceLever = usesWorkforceMix && Boolean(WORKFORCE_LEVER_LABELS[lever.label]);
              const config = isCalculatedWorkforceLever ? null : LEVER_FIELD_MAP[lever.label];
              const displayLabel = isCalculatedWorkforceLever
                ? WORKFORCE_LEVER_LABELS[lever.label]
                : lever.label;
              // Use formData value, falling back to calculated effective value for null/auto fields
              let currentRaw = config ? getNestedValue(effectiveFormData, config.path) : null;
              if (currentRaw == null && config) {
                const fallbacks = {
                  'implementationBudget': results.aiCostModel?.realisticImplCost,
                  'ongoingAnnualCost': results.aiCostModel?.baseOngoingCost,
                };
                currentRaw = fallbacks[config.path] ?? null;
              }
              return (
                <DriverCard
                  key={lever.label}
                  index={i}
                  lever={lever}
                  displayLabel={displayLabel}
                  config={config}
                  currentValue={currentRaw}
                  results={results}
                  formData={effectiveFormData}
                  leverInputDisplay={leverInputValues[lever.label]}
                  onValueChange={(val) => {
                    if (config) {
                      setDriverOverrides(prev => ({ ...prev, [config.path]: val }));
                    }
                  }}
                />
              );
            })}
          </div>
          {Object.keys(driverOverrides).length > 0 && (
            <button
              onClick={() => setDriverOverrides({})}
              className="mt-3 text-[11px] text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
            >
              Reset to original values
            </button>
          )}
        </motion.div>

        {/* Detailed Analysis Toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="text-center mb-6"
        >
          <button
            onClick={() => setShowDetailedAnalysis(!showDetailedAnalysis)}
            className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200/60 px-6 py-3 text-[13px] font-medium text-gray-900 transition-all hover:bg-white cursor-pointer"
          >
            <svg
              className={`h-4 w-4 transition-transform duration-200 ${showDetailedAnalysis ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            {showDetailedAnalysis ? 'Hide Detailed Analysis' : 'View Detailed Analysis'}
          </button>
        </motion.div>

        {showDetailedAnalysis && (<>

        {/* Case-specific two-driver sensitivity — replaces the legacy 1-D table. */}
        <TwoDriverSensitivityMatrix
          matrix={twoDriverSensitivity}
          metric={sensitivityMetric}
          onMetricChange={setSensitivityMetric}
        />

        {results.breakEvenUnits && results.breakEvenUnits.length > 0 && (() => {
          // Filter out trivial thresholds, which do not change a planning decision.
          const meaningful = results.breakEvenUnits.filter(item => Math.abs(item.marginPct) <= 500);
          if (meaningful.length === 0) return null;
          return (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-5 mb-6"
            >
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mb-2">Break-Even Thresholds</p>
              <div className="flex flex-wrap gap-2">
                {meaningful.slice(0, 3).map((item) => {
                  const pct = Math.min(Math.abs(item.marginPct), 500);
                  const sign = item.marginPct > 0 ? '+' : '-';
                  return (
                    <div key={item.key} className="bg-gray-50/80 rounded-xl px-3 py-2 text-[11px]">
                      <span className="text-gray-400">{item.label}:</span>{' '}
                      <span className="font-mono font-semibold text-gray-900">
                        {item.type === 'percent' ? `${(item.breakEvenValue * 100).toFixed(1)}%` : item.breakEvenValue.toLocaleString()}
                      </span>
                      <span className={`ml-1 font-mono ${item.direction === 'floor' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        ({item.direction === 'floor' ? `${sign}${pct}% margin` : `${pct}% gap`})
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })()}

        {/* Process Volume by Year */}
        {results.adoptionRamp && effectiveFormData.archetypeInputs?.processVolume > 0 && effectiveShow('yearByYear') !== 'totals-only' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-6 mb-6"
          >
            <h3 className="text-gray-900 font-semibold text-base tracking-tight mb-1">Process Volume by Year</h3>
            <p className="text-gray-400 text-[11px] mb-4">
              {(effectiveFormData.archetypeInputs.processVolume * 12).toLocaleString()} transactions/year — AI handles more as adoption ramps
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-gray-200/60">
                    <th className="text-left py-2.5 text-gray-400 font-medium text-[11px] uppercase tracking-wider">FY</th>
                    <th className="text-right py-2.5 text-gray-400 font-medium text-[11px] uppercase tracking-wider">Annual Vol.</th>
                    <th className="text-right py-2.5 text-gray-400 font-medium text-[11px] uppercase tracking-wider">AI-Handled</th>
                    <th className="text-right py-2.5 text-gray-400 font-medium text-[11px] uppercase tracking-wider">Manual</th>
                    <th className="text-right py-2.5 text-gray-400 font-medium text-[11px] uppercase tracking-wider">AI %</th>
                  </tr>
                </thead>
                <tbody>
                  {results.adoptionRamp.map((ramp, yr) => {
                    const annualVol = effectiveFormData.archetypeInputs.processVolume * 12;
                    const autPct = results.executiveSummary?.keyAssumptions?.automationPotential || 0;
                    const aiHandled = Math.round(annualVol * autPct * ramp);
                    const manual = annualVol - aiHandled;
                    const aiPct = Math.round(autPct * ramp * 100);
                    return (
                      <tr key={yr} className="border-b border-gray-100/80">
                        <td className="py-2.5 font-medium text-gray-900">FY {yr + 1}</td>
                        <td className="py-2.5 text-right font-mono text-gray-900">{annualVol.toLocaleString()}</td>
                        <td className="py-2.5 text-right font-mono text-emerald-600">{aiHandled.toLocaleString()}</td>
                        <td className="py-2.5 text-right font-mono text-gray-400">{manual.toLocaleString()}</td>
                        <td className="py-2.5 text-right font-mono font-semibold text-gray-900">{aiPct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Year-by-Year Table */}
        {effectiveShow('yearByYear') && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-6 mb-6"
          >
            <h3 className="text-gray-900 font-semibold text-base tracking-tight mb-4">
              {effectiveShow('yearByYear') === 'totals-only' ? '5-FY Summary' : 'FY-by-FY Breakdown'}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-navy/10">
                    <th className="text-left py-2 text-gray-500 font-medium">{effectiveShow('yearByYear') === 'totals-only' ? '' : 'FY'}</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Gross Savings</th>
                    <th className="text-right py-2 text-gray-500 font-medium">AI Costs</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Net Savings</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Cumulative</th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveShow('yearByYear') === 'totals-only' ? (
                    <tr className="border-b border-gray-100 font-semibold">
                      <td className="py-2 font-medium text-navy">5-FY Total</td>
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
                        <td className="py-2 font-medium text-navy">FY {yr.year}</td>
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

        {/* Key Assumptions — 2x2 + timeline */}
        {effectiveShow('keyAssumptions') && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-6 mb-6"
          >
            <h3 className="text-gray-900 font-semibold text-base tracking-tight mb-4">Key Assumptions</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50/80 rounded-xl p-3 text-center">
                <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">Automation</p>
                <p className="font-mono text-xl font-bold text-gray-900">{formatPercent(results.executiveSummary.keyAssumptions.automationPotential)}</p>
              </div>
              <div className="bg-gray-50/80 rounded-xl p-3 text-center">
                <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">Adoption</p>
                <p className="font-mono text-xl font-bold text-gray-900">{formatPercent(results.executiveSummary.keyAssumptions.adoptionRate)}</p>
              </div>
              <div className="bg-gray-50/80 rounded-xl p-3 text-center">
                <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">Risk Factor</p>
                <p className="font-mono text-xl font-bold text-gray-900">{formatPercent(results.executiveSummary.keyAssumptions.riskMultiplier)}</p>
              </div>
              <div className="bg-gray-50/80 rounded-xl p-3 text-center">
                <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">Discount Rate</p>
                <p className="font-mono text-xl font-bold text-gray-900">{formatPercent(results.executiveSummary.keyAssumptions.discountRate)}</p>
              </div>
            </div>
            <div className="mt-3 bg-gray-50/80 rounded-xl p-3 text-center">
              <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">Timeline</p>
              <p className="font-mono text-xl font-bold text-gray-900">{results.executiveSummary.keyAssumptions.timelineMonths} months</p>
            </div>
          </motion.div>
        )}

        {/* Transition Ramp Editor */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-gray-900 font-semibold text-base tracking-tight">Transition Ramp</h3>
            {customRamp && (
              <button
                onClick={() => setCustomRamp(null)}
                className="text-[11px] text-gray-400 hover:text-gray-900 cursor-pointer transition-colors"
              >
                Reset
              </button>
            )}
          </div>
          <p className="text-gray-400 text-[11px] mb-5">
            Adjust automation realization per year. Changes update all results.
          </p>
          <div className="grid grid-cols-5 gap-3">
            {results.adoptionRamp.map((val, i) => (
              <div key={i} className="text-center">
                <p className="text-[10px] text-gray-400 mb-1.5 font-medium">FY {i + 1}</p>
                <input
                  type="number"
                  name={`transition-ramp-fy-${i + 1}`}
                  aria-label={`FY ${i + 1} automation realization percentage`}
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(val * 100)}
                  onChange={(e) => {
                    const newVal = Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) / 100;
                    const newRamp = [...(customRamp || results.adoptionRamp)];
                    newRamp[i] = newVal;
                    setCustomRamp(newRamp);
                  }}
                  className="w-full text-center font-mono text-sm font-semibold text-gray-900 bg-gray-50/80 rounded-xl border border-gray-200/60 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-shadow"
                />
                <p className="text-[10px] text-gray-400 mt-1">%</p>
              </div>
            ))}
          </div>
          <div className="flex items-end gap-2 mt-4 h-10">
            {results.adoptionRamp.map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full rounded-md bg-gray-900/20 transition-all duration-300"
                  style={{ height: `${val * 40}px` }}
                />
              </div>
            ))}
          </div>
        </motion.div>

        {/* (old executive toggle removed — replaced by universal "Detailed Analysis" toggle above) */}

        {/* What Would Make This Work - shown only for negative ROI */}
        {effectiveShow('whatWouldMakeItWork') && netReturn < 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="bg-white/70 backdrop-blur-xl rounded-2xl border border-amber-200/60 p-6 mb-6"
          >
            <h3 className="text-gray-900 font-semibold text-base tracking-tight mb-3">
              What Would Make This Work?
            </h3>
            <ul className="space-y-2.5 text-gray-600 text-[13px]">
              <li className="flex items-start gap-2.5">
                <span className="text-amber-400 mt-0.5 text-xs">&rarr;</span>
                <span>
                  <strong className="text-gray-900">
                    {caseSensitivityConfig ? `Broader ${caseSensitivityConfig.volumeShortLabel}:` : 'Broader measured workload:'}
                  </strong>{' '}
                  {caseSensitivityConfig
                    ? `Cash savings scale with ${caseSensitivityConfig.volumeShortLabel}. Use the P75 planning point to test a proven roughly 25% expansion of the current operating scope.`
                    : 'Cash savings scale with verified workload volume. Test a larger, measured operating scope before changing the investment case.'}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-amber-400 mt-0.5 text-xs">&rarr;</span>
                <span>
                  <strong className="text-gray-900">
                    {caseSensitivityConfig?.valueLeverTitle || 'Higher-value operating work:'}
                  </strong>{' '}
                  {caseSensitivityConfig?.valueLeverDescription || 'Focus on measured handling time, support cost, or other operating value that is allowed into the cash model.'}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-amber-400 mt-0.5 text-xs">&rarr;</span>
                <span><strong className="text-gray-900">Improve data readiness:</strong> Clean, accessible data can shorten implementation work; validate the timeline with the delivery team.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-amber-400 mt-0.5 text-xs">&rarr;</span>
                <span><strong className="text-gray-900">Secure executive sponsorship:</strong> Name an accountable sponsor with decision rights and approved resources.</span>
              </li>
            </ul>
            <p className="text-gray-400 text-[11px] mt-4 pt-3 border-t border-gray-200/60">
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
                <p className="text-gray-500 text-xs mb-1">5-FY NPV</p>
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
                  color={netReturn >= 0 ? '#10B981' : '#EF4444'}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-gray-500 text-xs">Net Return</span>
                  <span className={`font-mono text-xl font-bold ${
                    netReturn >= 0 ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    {formatCurrency(netReturn)}
                  </span>
                </div>
              </div>

              <div className="flex sm:flex-col gap-6 sm:gap-4">
                <div className="text-center sm:text-left">
                  <p className="text-gray-500 text-xs">Capital Deployed</p>
                  <p className="font-mono text-xl font-bold text-red-500">{formatCurrency(capitalDeployed)}</p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-gray-500 text-xs">5-FY Operating Costs</p>
                  <p className="font-mono text-lg font-bold text-red-400">{formatCurrency(results.aiCostModel.totalOngoing5Year)}</p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-gray-500 text-xs">5-FY Gross Savings</p>
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
          <CollapsibleSection title="Sensitivity Analysis" subtitle="How each variable affects 5-fiscal-year NPV" defaultOpen={effectiveAutoExpand.includes('sensitivityAnalysis')}>
            <TornadoChart
              extendedSensitivity={results.extendedSensitivity}
              baseNPV={results.scenarios.base.npv}
              sensitivityConfig={caseSensitivityConfig}
            />
          </CollapsibleSection>
        )}

        {/* Break-Even Unit Economics */}
        {effectiveShow('breakEvenUnits') && results.breakEvenUnits && results.breakEvenUnits.length > 0 && (() => {
          const meaningful = results.breakEvenUnits.filter(item => Math.abs(item.marginPct) <= 500);
          if (meaningful.length === 0) return null;
          return (
          <CollapsibleSection title="Break-Even Unit Economics" subtitle="Minimum input thresholds for a positive NPV">
            <p className="text-gray-500 text-xs mb-4">
              {meaningful[0]?.direction === 'floor'
                ? 'Your current inputs exceed break-even. These are the minimum values before NPV turns negative.'
                : 'These are the target values each input must reach for NPV to turn positive.'}
            </p>
            <div className="space-y-2">
              {meaningful.map((item) => {
                const isFloor = item.direction === 'floor';
                const pct = item.marginPct;
                const pctLabel = `${pct > 0 ? '+' : ''}${pct}`;
                const formatVal = (v, type) => type === 'percent' ? `${(v * 100).toFixed(1)}%` : v >= 1000 ? v.toLocaleString() : v.toString();
                return (
                  <div key={item.key} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-2.5">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm font-medium text-navy truncate">{item.label}</p>
                      <p className="text-xs text-gray-500">
                        Break-even: <span className="font-mono font-semibold text-navy">{formatVal(item.breakEvenValue, item.type)}</span>
                        {' | '}
                        Current: <span className="font-mono font-semibold text-navy">{formatVal(item.currentValue, item.type)}</span>
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                      isFloor
                        ? pct > 30 ? 'bg-emerald-100 text-emerald-700'
                          : pct > 10 ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {isFloor ? `${pctLabel}% margin` : `${pctLabel}% gap`}
                    </span>
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>
          );
        })()}

        {/* Capital Allocation: AI vs Alternatives */}
        {effectiveShow('workforceAlternatives') && results.workforceAlternatives && (
          <CollapsibleSection title="Capital Allocation: AI vs Alternatives" subtitle="Compare AI investment against hiring, outsourcing, or doing nothing">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'aiInvestment', icon: '🤖', accent: 'emerald' },
                { key: 'hiring', icon: '👥', accent: 'blue' },
                { key: 'outsourcing', icon: '🏢', accent: 'purple' },
                { key: 'statusQuo', icon: '⏸️', accent: 'red' },
              ].map(({ key, icon, accent }) => {
                const opt = results.workforceAlternatives[key];
                if (!opt) return null;
                const isBest = key === 'aiInvestment' && results.workforceAlternatives.aiInvestment.roi > 0;
                return (
                  <div key={key} className={`rounded-lg border-2 p-4 ${isBest ? `border-${accent}-400 bg-${accent}-50` : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{icon}</span>
                      <span className="text-sm font-semibold text-navy">{opt.label}</span>
                      {isBest && <span className="text-[10px] font-bold uppercase bg-emerald-500 text-white px-1.5 py-0.5 rounded">Best</span>}
                    </div>
                    <div className="space-y-1 text-xs">
                      {key === 'aiInvestment' && (
                        <>
                          <div className="flex justify-between"><span className="text-gray-600">5-FY Net</span><span className={`font-mono font-bold ${opt.annual5YearNet >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatCurrency(opt.annual5YearNet)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">ROI</span><span className="font-mono text-navy">{formatPercent(opt.roi)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Payback</span><span className="font-mono text-navy">{opt.paybackMonths} mo</span></div>
                        </>
                      )}
                      {key === 'hiring' && (
                        <>
                          <div className="flex justify-between"><span className="text-gray-600">FTEs Needed</span><span className="font-mono text-navy">{opt.ftesNeeded}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">5-FY Cost</span><span className="font-mono text-red-600">{formatCurrency(opt.total5YearCost)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Ramp Time</span><span className="font-mono text-navy">{opt.rampMonths} mo</span></div>
                        </>
                      )}
                      {key === 'outsourcing' && (
                        <>
                          <div className="flex justify-between"><span className="text-gray-600">Annual Savings</span><span className={`font-mono ${opt.annualSavings >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatCurrency(opt.annualSavings)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Quality Impact</span><span className="font-mono text-amber-600">{opt.qualityImpact}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Transition</span><span className="font-mono text-navy">{opt.transitionMonths} mo</span></div>
                        </>
                      )}
                      {key === 'statusQuo' && (
                        <>
                          <div className="flex justify-between"><span className="text-gray-600">5-FY Cost</span><span className="font-mono text-red-600">{formatCurrency(opt.total5YearCost)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Opportunity Cost</span><span className="font-mono text-red-600">{formatCurrency(opt.opportunityCost)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Erosion</span><span className="font-mono text-red-600">{formatPercent(opt.competitiveErosionRate)}/yr</span></div>
                        </>
                      )}
                      <div className="pt-1 border-t border-gray-200 mt-1">
                        <div className="flex justify-between"><span className="text-gray-500">Risk</span><span className={`font-medium ${opt.riskLevel?.includes('Low') ? 'text-emerald-600' : opt.riskLevel === 'Medium' ? 'text-amber-600' : 'text-red-600'}`}>{opt.riskLevel}</span></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>
        )}

        {/* Consulting Assumptions (token economics, model drift, agent costs) */}
        {effectiveShow('consultingAssumptions') && results.consultingAssumptions && (
          <CollapsibleSection title="AI Cost Model & Technical Assumptions" subtitle="Token economics, model drift, and infrastructure details">
            <div className="space-y-4">
              {/* Token / Model Tier */}
              <div className="rounded-lg bg-gray-50 p-4">
                <h4 className="text-xs font-semibold text-navy uppercase tracking-wider mb-2">LLM Cost Model</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between"><span className="text-gray-600">Model Tier</span><span className="font-mono text-navy capitalize">{results.consultingAssumptions.modelTier}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Token-Based Pricing</span><span className="font-mono text-navy">{results.consultingAssumptions.useTokenModel ? 'Yes' : 'No'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Prompt Caching</span><span className="font-mono text-navy">{formatPercent(results.consultingAssumptions.promptCachingRate)}</span></div>
                  {results.consultingAssumptions.isAgenticWorkflow && (
                    <div className="flex justify-between"><span className="text-gray-600">LLM Calls/Task</span><span className="font-mono text-navy">{results.consultingAssumptions.llmCallsPerTask}</span></div>
                  )}
                </div>
              </div>
              {/* Model Drift */}
              <div className="rounded-lg bg-gray-50 p-4">
                <h4 className="text-xs font-semibold text-navy uppercase tracking-wider mb-2">Model Drift Schedule</h4>
                <p className="text-xs text-gray-500 mb-2">Annual drift rate: {formatPercent(results.consultingAssumptions.modelDriftRate)} — accounts for model deprecation, API changes, and retraining costs.</p>
                <div className="grid grid-cols-5 gap-1">
                  {[1,2,3,4,5].map(yr => {
                    const factor = Math.pow(1 - results.consultingAssumptions.modelDriftRate, yr);
                    return (
                      <div key={yr} className="text-center">
                        <p className="text-[10px] text-gray-400">Year {yr}</p>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-0.5">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${factor * 100}%` }} />
                        </div>
                        <p className="text-[10px] font-mono text-navy mt-0.5">{(factor * 100).toFixed(1)}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Agentic Workflow Details */}
              {results.consultingAssumptions.isAgenticWorkflow && results.consultingAssumptions.agentComplexity && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <h4 className="text-xs font-semibold text-navy uppercase tracking-wider mb-2">Agentic Workflow</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between"><span className="text-gray-600">Agent Complexity</span><span className="font-mono text-navy capitalize">{results.consultingAssumptions.agentComplexity}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">LLM Calls / Task</span><span className="font-mono text-navy">{results.consultingAssumptions.llmCallsPerTask}</span></div>
                  </div>
                </div>
              )}
            </div>
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
                <span className="text-gray-500">Current process workforce</span>
                <span className="text-navy font-mono">{currentProcessWorkforce} people</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Blended annual workforce cost</span>
                <span className="text-navy font-mono">{formatCurrency(blendedWorkforceCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ongoing headcount cost</span>
                <span className="text-navy font-mono">{formatCurrency(totalAnnualHeadcountCost)}</span>
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
                    <p className="text-xs text-gray-500">Freed time available for redeployment</p>
                  </div>
                  <span className="font-mono font-bold text-blue-600 text-lg">
                    {formatCompact(results.valuePathways.capacityCreation.totalAnnualValue)}
                    <span className="text-xs text-gray-500 font-normal">/yr</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                  <span>{Math.round(results.valuePathways.capacityCreation.hoursFreed).toLocaleString()} hrs freed</span>
                  <span>{results.valuePathways.capacityCreation.fteEquivalent.toFixed(1)} FTE equiv</span>
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
              {results.gateStructure.map((gate) => {
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

        </>)}
        {/* End of showDetailedAnalysis wrapper */}

      </div>

    </div>
  );
}
