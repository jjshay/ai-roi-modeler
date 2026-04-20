import { motion } from 'framer-motion';
import { formatCompact, formatCurrency, formatPercent } from '../../utils/formatters';

// Steady-state waterfall chart: shows buildup from starting point to subtotal.
// steps: [{label, value, type: 'start' | 'delta' | 'subtotal' | 'end'}]
function Waterfall({ title, subtitle, steps, height = 180 }) {
  const maxAbs = Math.max(...steps.map(s => Math.abs(s.cumulative ?? s.value)), 1);
  const scale = (height - 50) / maxAbs;
  const barWidth = 56;
  const gap = 14;
  const width = steps.length * (barWidth + gap) + 20;
  const zeroY = height - 20;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="mb-2">
        <div className="text-navy font-semibold text-sm">{title}</div>
        {subtitle && <div className="text-gray-500 text-[11px]">{subtitle}</div>}
      </div>
      <div className="overflow-x-auto">
        <svg width={width} height={height + 30} className="text-navy">
          {/* zero baseline */}
          <line x1="10" y1={zeroY} x2={width - 10} y2={zeroY} stroke="#E5E7EB" strokeWidth="1" />
          {steps.map((s, i) => {
            const x = 10 + i * (barWidth + gap);
            const isSubtotal = s.type === 'subtotal' || s.type === 'start' || s.type === 'end';
            // Running cumulative used for delta bars; absolute cumulative for subtotals.
            const top = isSubtotal
              ? zeroY - (s.cumulative ?? s.value) * scale
              : zeroY - Math.max(s.cumulative, s.cumulative - s.value) * scale;
            const barHeight = isSubtotal
              ? Math.abs((s.cumulative ?? s.value) * scale)
              : Math.abs(s.value * scale);
            const barY = isSubtotal
              ? (s.cumulative ?? s.value) >= 0 ? top : zeroY
              : top;
            const fill = isSubtotal
              ? '#0E2F5A'   // navy for subtotals
              : s.value >= 0 ? '#10B981' : '#EF4444';   // emerald / red
            const labelY = barY + barHeight + 14;

            return (
              <g key={i}>
                <rect
                  x={x}
                  y={barY}
                  width={barWidth}
                  height={Math.max(barHeight, 2)}
                  fill={fill}
                  opacity={isSubtotal ? 1 : 0.85}
                  rx="2"
                />
                {/* Connector line to next bar */}
                {i < steps.length - 1 && (
                  <line
                    x1={x + barWidth}
                    y1={isSubtotal ? top : barY + (s.value >= 0 ? 0 : barHeight)}
                    x2={x + barWidth + gap}
                    y2={isSubtotal ? top : barY + (s.value >= 0 ? 0 : barHeight)}
                    stroke="#9CA3AF"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}
                {/* Value label */}
                <text
                  x={x + barWidth / 2}
                  y={barY - 4}
                  fontSize="10"
                  textAnchor="middle"
                  fill="#0E2F5A"
                  fontWeight="600"
                  fontFamily="ui-monospace, monospace"
                >
                  {formatCompact(s.value)}
                </text>
                {/* Category label */}
                <text
                  x={x + barWidth / 2}
                  y={height + 14}
                  fontSize="9"
                  textAnchor="middle"
                  fill="#6B7280"
                >
                  {s.label.length > 12 ? s.label.slice(0, 11) + '…' : s.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// Format a number for a P&L cell: compact currency, em-dash for zero/null,
// parentheses for negative.
function num(v) {
  if (v === null || v === undefined || v === 0 || !isFinite(v)) return '—';
  const abs = Math.abs(v);
  const s = abs >= 1000 ? formatCompact(abs) : `$${Math.round(abs).toLocaleString()}`;
  return v < 0 ? `(${s})` : s;
}

function pct(v) {
  if (v === null || v === undefined || !isFinite(v)) return '—';
  return formatPercent(v);
}

function colorize(v) {
  if (v === null || v === undefined || v === 0 || !isFinite(v)) return 'text-gray-400';
  return v > 0 ? 'text-emerald-600' : 'text-red-500';
}

// Each line: label, year-by-year values, CAGR, optional indent and emphasis
function Row({ label, values, cagr, emphasis, indent, muted, dividerAbove }) {
  const base = 'py-1.5 text-right font-mono';
  const labelCls = `py-1.5 pr-3 ${indent ? 'pl-6 text-gray-600' : 'font-medium text-navy'} ${emphasis ? 'font-bold text-navy' : ''}`;
  return (
    <tr className={`${dividerAbove ? 'border-t border-navy/15' : 'border-t border-gray-50'} ${emphasis ? 'bg-gold/5' : ''}`}>
      <td className={labelCls}>{label}</td>
      {values.map((v, i) => (
        <td
          key={i}
          className={`${base} ${emphasis ? 'font-bold text-navy' : muted ? 'text-gray-400' : colorize(v)} whitespace-nowrap`}
        >
          {num(v)}
        </td>
      ))}
      <td className={`${base} text-xs whitespace-nowrap ${cagr === null || cagr === undefined ? 'text-gray-300' : cagr >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
        {cagr === null || cagr === undefined ? '—' : pct(cagr)}
      </td>
    </tr>
  );
}

function PctRow({ label, values, indent }) {
  return (
    <tr className="border-t border-gray-50">
      <td className={`py-1 pr-3 text-xs ${indent ? 'pl-6' : ''} text-gray-400 italic`}>{label}</td>
      {values.map((v, i) => (
        <td key={i} className="py-1 text-right text-xs font-mono text-gray-400 whitespace-nowrap">
          {pct(v)}
        </td>
      ))}
      <td className="py-1" />
    </tr>
  );
}

export default function IncrementalPL({ pl, scenarioROI, scenarioNPV, upfrontInvestment }) {
  if (!pl || !pl.rows || pl.rows.length < 6) return null;

  const rows = pl.rows;  // [FY0, FY1, FY2, FY3, FY4, FY5]
  const cagr = pl.cagr || {};
  const totals = pl.totals || {};
  const roi = pl.roiFormula || {};
  const mapping = pl.functionMapping || {};

  // Build year-by-year arrays for each P&L line
  const yr = (get) => rows.map(get);
  const revenue = yr(r => r.revenue?.total ?? 0);
  const cogs = yr(r => r.cogs?.net ?? 0);
  const grossProfit = yr(r => r.grossProfit ?? 0);
  const grossMargin = yr(r => r.grossMargin);
  const smNet = yr(r => r.sm?.net ?? 0);
  const rdNet = yr(r => r.rd?.net ?? 0);
  const gaNet = yr(r => r.ga?.net ?? 0);
  const totalOpex = yr(r => r.totalOpex ?? 0);
  const ebitda = yr(r => r.ebitda ?? 0);
  const ebitdaMargin = yr(r => r.ebitdaMargin);
  const da = yr(r => r.da ?? 0);
  const ebit = yr(r => r.ebit ?? 0);
  const tax = yr(r => r.tax ?? 0);
  const netIncome = yr(r => r.netIncome ?? 0);
  const capex = yr(r => r.capex ?? 0);
  const fcf = yr(r => r.freeCashFlow ?? 0);
  const cumFcf = yr(r => r.cumulativeFCF ?? 0);
  const discFcf = yr(r => r.discountedFCF ?? 0);
  const cumDiscFcf = yr(r => r.cumulativeDiscountedFCF ?? 0);

  return (
    <motion.div
      id="incremental-pl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.5 }}
      className="bg-white rounded-3xl shadow-xl p-6 mb-8 scroll-mt-20"
    >
      <h3 className="text-navy font-bold text-lg mb-1">Illustrative Incremental P&L</h3>
      <p className="text-gray-500 text-xs mb-4">
        Base-case impact of this AI initiative on the income statement, modeled as deltas vs. the do-nothing path.
        Displaced headcount lands in <span className="font-semibold">{mapping.displacedFn}</span> ·
        AI ongoing cost in <span className="font-semibold">{mapping.aiFn}</span>
        {mapping.inferenceInCOGS ? ' · inference split 60/40 to COGS' : ''}.
      </p>

      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-sm" style={{ minWidth: '720px' }}>
          <thead>
            <tr className="border-b-2 border-navy/20 text-right">
              <th className="text-left py-2 pr-3 text-gray-500 font-medium">Line Item</th>
              <th className="py-2 text-gray-500 font-medium">FY0</th>
              <th className="py-2 text-gray-500 font-medium">FY1</th>
              <th className="py-2 text-gray-500 font-medium">FY2</th>
              <th className="py-2 text-gray-500 font-medium">FY3</th>
              <th className="py-2 text-gray-500 font-medium">FY4</th>
              <th className="py-2 text-gray-500 font-medium">FY5</th>
              <th className="py-2 text-gray-500 font-medium">CAGR</th>
            </tr>
          </thead>
          <tbody>
            <Row label="Incremental Revenue" values={revenue} cagr={cagr.revenue} emphasis dividerAbove />
            <Row label="Incremental COGS (net)" values={cogs} cagr={cagr.cogs} indent />
            <Row label="Incremental Gross Profit" values={grossProfit} cagr={cagr.grossProfit} emphasis dividerAbove />
            <PctRow label="Gross Margin %" values={grossMargin} indent />

            <Row label="S&M (net)" values={smNet} cagr={cagr.sm} dividerAbove />
            <Row label="R&D (net)" values={rdNet} cagr={cagr.rd} />
            <Row label="G&A (net)" values={gaNet} cagr={cagr.ga} />
            <Row label="Total Incremental OpEx" values={totalOpex} cagr={cagr.totalOpex} emphasis />

            <Row label="Incremental EBITDA" values={ebitda} cagr={cagr.ebitda} emphasis dividerAbove />
            <PctRow label="EBITDA Margin %" values={ebitdaMargin} indent />

            <Row label="(−) D&A on implementation" values={da.map(v => -v)} cagr={null} indent muted />
            <Row label="Incremental EBIT" values={ebit} cagr={cagr.ebit} emphasis dividerAbove />
            <Row label={`(−) Tax @ ${pct(roi.taxRate || 0.21)}`} values={tax.map(v => -v)} cagr={null} indent muted />
            <Row label="Incremental Net Income" values={netIncome} cagr={cagr.netIncome} emphasis />

            <Row label="(+) D&A add-back" values={da} cagr={null} indent muted dividerAbove />
            <Row label="(−) CapEx (implementation)" values={capex.map(v => -v)} cagr={null} indent muted />
            <Row label="Free Cash Flow" values={fcf} cagr={cagr.freeCashFlow} emphasis />
            <Row label="Cumulative FCF" values={cumFcf} cagr={null} indent muted />
            <Row label="Discounted FCF (NPV build)" values={discFcf} cagr={null} indent muted />
            <Row label="Cumulative Discounted FCF" values={cumDiscFcf} cagr={null} indent muted />
          </tbody>
        </table>
      </div>

      {/* 5-year totals strip */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-gray-50 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-gray-500">5Y Incr. Revenue</p>
          <p className={`font-mono text-sm font-bold ${totals.revenue >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {num(totals.revenue)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-gray-500">5Y Incr. EBITDA</p>
          <p className={`font-mono text-sm font-bold ${totals.ebitda >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {num(totals.ebitda)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-gray-500">5Y Incr. Net Income</p>
          <p className={`font-mono text-sm font-bold ${totals.netIncome >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {num(totals.netIncome)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-gray-500">5Y Free Cash Flow</p>
          <p className={`font-mono text-sm font-bold ${totals.fcf >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {num(totals.fcf)}
          </p>
        </div>
      </div>

      {/* Steady-state waterfall charts (FY5) */}
      <div className="mt-6">
        <div className="mb-2">
          <h4 className="text-navy font-bold text-base">Steady-State Waterfall — FY5</h4>
          <p className="text-gray-500 text-[11px]">Mature run-rate after full adoption ramp. Shows the composition of Revenue and EBITDA impact.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(() => {
            const fy5Row = rows[5] || {};
            // Revenue waterfall (steady-state)
            const revSteps = [];
            let cum = 0;
            revSteps.push({ label: 'Baseline', value: 0, cumulative: 0, type: 'start' });
            if (fy5Row.revenue?.aiEnabled) {
              cum += fy5Row.revenue.aiEnabled;
              revSteps.push({ label: 'AI-enabled', value: fy5Row.revenue.aiEnabled, cumulative: cum, type: 'delta' });
            }
            if (fy5Row.revenue?.acceleration) {
              cum += fy5Row.revenue.acceleration;
              revSteps.push({ label: 'Acceleration', value: fy5Row.revenue.acceleration, cumulative: cum, type: 'delta' });
            }
            revSteps.push({ label: 'FY5 Revenue', value: cum, cumulative: cum, type: 'end' });

            // EBITDA waterfall (steady-state)
            const earnSteps = [];
            let ec = fy5Row.revenue?.total || 0;
            earnSteps.push({ label: 'Revenue', value: ec, cumulative: ec, type: 'start' });
            const cogsNet = fy5Row.cogs?.net || 0;
            if (cogsNet !== 0) {
              ec -= cogsNet;
              earnSteps.push({ label: '− COGS', value: -cogsNet, cumulative: ec, type: 'delta' });
            }
            earnSteps.push({ label: 'Gross Profit', value: fy5Row.grossProfit || 0, cumulative: ec, type: 'subtotal' });
            const smNet5 = fy5Row.sm?.net || 0;
            const rdNet5 = fy5Row.rd?.net || 0;
            const gaNet5 = fy5Row.ga?.net || 0;
            if (smNet5) { ec -= smNet5; earnSteps.push({ label: '− S&M', value: -smNet5, cumulative: ec, type: 'delta' }); }
            if (rdNet5) { ec -= rdNet5; earnSteps.push({ label: '− R&D', value: -rdNet5, cumulative: ec, type: 'delta' }); }
            if (gaNet5) { ec -= gaNet5; earnSteps.push({ label: '− G&A', value: -gaNet5, cumulative: ec, type: 'delta' }); }
            earnSteps.push({ label: 'EBITDA', value: fy5Row.ebitda || 0, cumulative: fy5Row.ebitda || 0, type: 'end' });

            return (
              <>
                <Waterfall
                  title="Revenue — Steady State"
                  subtitle="How incremental FY5 revenue builds up"
                  steps={revSteps}
                />
                <Waterfall
                  title="EBITDA — Steady State"
                  subtitle="How FY5 earnings build from revenue to EBITDA"
                  steps={earnSteps}
                />
              </>
            );
          })()}
        </div>
      </div>

      {/* ROI Formula: full breakdown */}
      <div id="roi-formula" className="mt-6 rounded-xl border border-gold/30 bg-gold/5 p-5 scroll-mt-20">
        <h4 className="text-navy font-bold text-base mb-3">ROI Formula — full calculation</h4>

        <div className="space-y-4 text-sm">
          {/* ROIC derivation */}
          <div>
            <div className="font-semibold text-navy mb-1.5">ROIC (Return on Invested Capital)</div>
            <div className="font-mono text-xs bg-white rounded-lg p-3 border border-gray-200 space-y-1">
              <div className="text-gray-500">ROIC = Average Annual NOPAT ÷ Capital Deployed</div>
              <div className="text-gray-400">where NOPAT = EBIT × (1 − Tax Rate)</div>
              <div className="pt-2 border-t border-gray-100">
                <div>Average EBIT (5Y) = {num(roi.averageAnnualEbit)}</div>
                <div>NOPAT = {num(roi.averageAnnualEbit)} × (1 − {pct(roi.taxRate || 0.21)}) = <span className="font-bold text-navy">{num(roi.averageAnnualNOPAT)}</span></div>
                <div>Capital Deployed (upfront) = {num(roi.capitalDeployed)}</div>
              </div>
              <div className="pt-2 border-t border-gray-100 font-bold text-navy">
                ROIC = {num(roi.averageAnnualNOPAT)} ÷ {num(roi.capitalDeployed)} = <span className="text-emerald-600">{pct(roi.roic)}</span>
              </div>
            </div>
          </div>

          {/* NPV derivation */}
          <div>
            <div className="font-semibold text-navy mb-1.5">NPV (Net Present Value)</div>
            <div className="font-mono text-xs bg-white rounded-lg p-3 border border-gray-200 space-y-1">
              <div className="text-gray-500">NPV = −CapEx + Σ [FCF_t ÷ (1 + r)^t]</div>
              <div className="text-gray-400">for t = 1 to 5, r = WACC / discount rate</div>
              <div className="pt-2 border-t border-gray-100 space-y-0.5">
                {rows.map((row, i) => i === 0 ? (
                  <div key={i}>FY0: −{num(upfrontInvestment)} (CapEx)</div>
                ) : (
                  <div key={i}>
                    FY{i}: {num(row.freeCashFlow)} ÷ (1 + {pct(pl.assumptions?.discountRate || 0.10)})^{i} = {num(row.discountedFCF)}
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-gray-100 font-bold text-navy">
                NPV = <span className={scenarioNPV >= 0 ? 'text-emerald-600' : 'text-red-500'}>{num(scenarioNPV)}</span>
                <span className="text-gray-400 text-[10px] ml-2">(P&L-derived: {num(roi.npvFromPL)})</span>
              </div>
            </div>
          </div>

          {/* Simple ROI */}
          <div>
            <div className="font-semibold text-navy mb-1.5">Simple 5-Year ROI</div>
            <div className="font-mono text-xs bg-white rounded-lg p-3 border border-gray-200 space-y-1">
              <div className="text-gray-500">Simple ROI = 5Y Net Cash ÷ Investment</div>
              <div className="pt-2 border-t border-gray-100">
                <div>5Y FCF (net of CapEx) = {num(totals.fcf)}</div>
                <div>Investment = {num(upfrontInvestment)}</div>
              </div>
              <div className="pt-2 border-t border-gray-100 font-bold text-navy">
                Simple ROI = {num(totals.fcf)} ÷ {num(upfrontInvestment)} = <span className={roi.simpleROI5Year >= 0 ? 'text-emerald-600' : 'text-red-500'}>{pct(roi.simpleROI5Year)}</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-gray-500 italic">
            All figures are incremental impact vs. the do-nothing baseline. NPV uses risk-adjusted free cash flows;
            ROIC uses NOPAT per standard corporate finance definition (EBIT after tax).
            Simple ROI is shown for intuition only — it ignores time value of money.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
