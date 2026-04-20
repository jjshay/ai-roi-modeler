import { formatCompact, formatCurrency } from '../../utils/formatters';

/**
 * BoardActions — Board-ready approval motion, phased funding, success metrics,
 * ownership/accountability, escalation triggers, and exit costs.
 * Transforms analytical output into a governance-ready decision framework.
 */

function buildBoardPackage(results, formData, recommendation) {
  const { scenarios, upfrontInvestment, gateStructure, executiveSummary,
          thresholdAnalysis, breakEvenAdoptionRate, riskAdjustments } = results;
  const base = scenarios.base;
  const cons = scenarios.conservative;
  const teamSize = formData.teamSize || 10;
  const avgSalary = formData.avgSalary || 100000;
  const timeline = riskAdjustments?.adjustedTimeline || 12;

  // Phase 1 pilot budget (gate 1 investment)
  const phase1 = gateStructure?.[0] || {};
  const phase1Budget = phase1.investment || Math.round(upfrontInvestment * 0.15);
  const phase1EndMonth = phase1.monthRange?.[1] || 6;

  // Success metrics
  const metrics = [
    {
      metric: 'Automation Rate',
      target: `${Math.round((results.benchmarks?.automationPotential || 0.40) * 100)}%`,
      baseline: '0% (manual process)',
      measureMethod: 'Tasks completed by AI vs total tasks processed',
      frequency: 'Monthly',
      owner: 'Project Lead',
    },
    {
      metric: 'User Adoption',
      target: `${Math.round((riskAdjustments?.adoptionRate || 0.70) * 100)}%`,
      baseline: '0%',
      measureMethod: 'Active users / total eligible users (30-day rolling)',
      frequency: 'Weekly during pilot, monthly post-launch',
      owner: 'Change Management Lead',
    },
    {
      metric: 'Cost per Transaction',
      target: `${Math.round((1 - (results.benchmarks?.automationPotential || 0.40)) * 100)}% of current`,
      baseline: formatCurrency(Math.round(results.currentState?.totalCurrentCost / (teamSize * 2080) * 100) / 100) + '/hr',
      measureMethod: 'Total process cost / transactions processed',
      frequency: 'Monthly',
      owner: 'Finance / FP&A',
    },
    {
      metric: 'Error Rate',
      target: `< ${Math.round((formData.errorRate || 0.08) * 50)}%`,
      baseline: `${Math.round((formData.errorRate || 0.08) * 100)}%`,
      measureMethod: 'Errors caught in QA / total outputs',
      frequency: 'Monthly',
      owner: 'Quality Lead',
    },
    {
      metric: 'Net Cash Flow',
      target: `Positive by month ${base.paybackMonths || 'TBD'}`,
      baseline: formatCompact(-upfrontInvestment),
      measureMethod: 'Cumulative savings minus cumulative costs',
      frequency: 'Quarterly (board reporting)',
      owner: 'CFO / Finance',
    },
  ];

  // Escalation triggers
  const escalations = [
    {
      trigger: `Cost overrun exceeds 15% of phase budget`,
      threshold: formatCompact(Math.round(phase1Budget * 0.15)),
      action: 'Notify project sponsor; pause non-critical spend; present remediation plan within 2 weeks',
      escalateTo: 'CFO / Project Sponsor',
    },
    {
      trigger: 'User adoption below 25% at 90-day mark',
      threshold: '25%',
      action: 'Pause rollout; conduct user feedback survey; rebuild change management approach',
      escalateTo: 'COO / Change Management Lead',
    },
    {
      trigger: 'Phase 1 gate metrics not met',
      threshold: `< ${phase1.requiredMetrics?.minAutomationValidated ? Math.round(phase1.requiredMetrics.minAutomationValidated * 100) + '%' : '15%'} automation validated`,
      action: 'Present board with options: restructure, pivot scope, or terminate with exit cost analysis',
      escalateTo: 'Board / Executive Committee',
    },
    {
      trigger: 'Vendor pricing increases > 20% or material SLA breach',
      threshold: '20% price increase',
      action: 'Activate vendor portability plan; begin parallel evaluation of alternatives',
      escalateTo: 'CTO / Procurement',
    },
  ];

  // Exit costs by phase
  const exitCosts = (gateStructure || []).map(gate => ({
    phase: gate.label,
    monthRange: `Months ${gate.monthRange[0]}-${gate.monthRange[1]}`,
    investedToDate: gate.cumulativeInvestment,
    recoverable: Math.round(gate.cumulativeInvestment * 0.10), // ~10% recoverable (hardware, licenses)
    sunkCost: Math.round(gate.cumulativeInvestment * 0.90),
    exitNote: gate.gate === 1
      ? 'Lowest exit cost; pilot scope limits exposure'
      : gate.gate <= 3
        ? 'Moderate; some reusable infrastructure and learnings'
        : 'High; significant organizational change already underway',
  }));

  // Board motion
  const verdictMap = {
    STRONG: 'approve',
    MODERATE: 'approve with conditions',
    CAUTIOUS: 'approve pilot only',
    WEAK: 'defer',
  };
  const motionVerb = verdictMap[recommendation.verdict] || 'review';

  return { phase1Budget, phase1EndMonth, metrics, escalations, exitCosts, motionVerb, timeline };
}

export default function BoardActions({ results, formData, recommendation }) {
  const { scenarios, upfrontInvestment, gateStructure } = results;
  if (!scenarios?.base) return null;

  const pkg = buildBoardPackage(results, formData, recommendation);
  const base = scenarios.base;

  return (
    <div className="space-y-6">

      {/* Board Motion */}
      <div className="rounded-xl border-2 border-navy bg-navy/5 p-5">
        <p className="text-[10px] font-bold text-navy/50 uppercase tracking-widest mb-2">Proposed Board Motion</p>
        <p className="text-sm text-navy leading-relaxed">
          <span className="font-bold">RESOLVED</span>, that the Board {pkg.motionVerb} an AI investment of{' '}
          <span className="font-bold font-mono">{formatCompact(upfrontInvestment)}</span> total capital,
          structured as a phased deployment beginning with a{' '}
          <span className="font-bold font-mono">{formatCompact(pkg.phase1Budget)}</span> Phase 1 pilot
          over <span className="font-bold">{pkg.phase1EndMonth} months</span>, with go/no-go gate review
          before each subsequent phase. The {formData.executiveSponsor ? 'designated executive sponsor' : 'CEO'} is
          authorized to select vendors and commit Phase 1 funds. Phase 2+ funding requires board
          reauthorization based on actual pilot results vs. the success metrics defined herein.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <span className="bg-navy/10 text-navy px-2 py-1 rounded">
            Base NPV: <span className="font-mono font-bold">{formatCompact(base.npv)}</span>
          </span>
          <span className="bg-navy/10 text-navy px-2 py-1 rounded">
            Payback: <span className="font-mono font-bold">{base.paybackMonths}mo</span>
          </span>
          <span className="bg-navy/10 text-navy px-2 py-1 rounded">
            ROIC: <span className="font-mono font-bold">{Math.round(base.roic * 100)}%</span>
          </span>
        </div>
      </div>

      {/* Success Metrics */}
      <div>
        <p className="text-xs font-bold text-navy mb-2 uppercase tracking-wide">Success Metrics & Accountability</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-navy/10">
                <th className="text-left py-2 font-medium text-gray-500">KPI</th>
                <th className="text-left py-2 font-medium text-gray-500">Target</th>
                <th className="text-left py-2 font-medium text-gray-500">Baseline</th>
                <th className="text-left py-2 font-medium text-gray-500 hidden sm:table-cell">Measurement</th>
                <th className="text-left py-2 font-medium text-gray-500">Owner</th>
              </tr>
            </thead>
            <tbody>
              {pkg.metrics.map(m => (
                <tr key={m.metric} className="border-b border-gray-100">
                  <td className="py-2 font-medium text-navy">{m.metric}</td>
                  <td className="py-2 font-mono text-emerald-700 font-bold">{m.target}</td>
                  <td className="py-2 font-mono text-gray-500">{m.baseline}</td>
                  <td className="py-2 text-gray-600 hidden sm:table-cell">{m.measureMethod}</td>
                  <td className="py-2 text-gray-700 font-medium">{m.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Escalation Triggers */}
      <div>
        <p className="text-xs font-bold text-navy mb-2 uppercase tracking-wide">Escalation Protocol</p>
        <div className="space-y-2">
          {pkg.escalations.map((e, i) => (
            <div key={i} className="rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold text-red-800">{e.trigger}</p>
                <span className="text-[10px] bg-red-200 text-red-800 px-1.5 py-0.5 rounded shrink-0">{e.escalateTo}</span>
              </div>
              <p className="text-[11px] text-red-700 mt-1">{e.action}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Exit Cost Analysis */}
      <div>
        <p className="text-xs font-bold text-navy mb-2 uppercase tracking-wide">Exit Cost by Phase</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-navy/10">
                <th className="text-left py-2 font-medium text-gray-500">Phase</th>
                <th className="text-left py-2 font-medium text-gray-500">Timeline</th>
                <th className="text-right py-2 font-medium text-gray-500">Invested</th>
                <th className="text-right py-2 font-medium text-red-500">Sunk Cost</th>
                <th className="text-right py-2 font-medium text-emerald-500">Recoverable</th>
              </tr>
            </thead>
            <tbody>
              {pkg.exitCosts.map((e, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 font-medium text-navy">{e.phase}</td>
                  <td className="py-2 text-gray-500">{e.monthRange}</td>
                  <td className="py-2 text-right font-mono text-navy">{formatCompact(e.investedToDate)}</td>
                  <td className="py-2 text-right font-mono text-red-600">{formatCompact(e.sunkCost)}</td>
                  <td className="py-2 text-right font-mono text-emerald-600">{formatCompact(e.recoverable)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-gray-400 mt-2">
          Recoverable assumes ~10% of cumulative investment (transferable licenses, reusable infrastructure).
          Exit at Phase 1 carries lowest risk; each subsequent phase increases sunk cost but also increases realized value.
        </p>
      </div>

    </div>
  );
}
