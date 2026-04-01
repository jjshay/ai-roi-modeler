import { formatCompact } from '../../utils/formatters';

/**
 * RiskRegister — Probability × Impact risk matrix with mitigations and owners.
 * Built from model inputs and calculation outputs for board-level risk governance.
 */

function buildRiskRegister(results, formData) {
  const risks = [];
  const {
    riskAdjustments, hiddenCosts, upfrontInvestment, scenarios, vendorLockIn,
    thresholdAnalysis, confidenceLevel, breakEvenAdoptionRate,
  } = results;
  const baseNPV = scenarios.base.npv;
  const consNPV = scenarios.conservative.npv;
  const changeReadiness = formData.changeReadiness || 3;
  const dataReadiness = formData.dataReadiness || 3;
  const execSponsor = formData.executiveSponsor ?? formData.execSponsor ?? true;
  const teamSize = formData.teamSize || 10;

  // 1. Adoption / Change Management Risk
  const adoptionSeverity = changeReadiness <= 2 ? 'high' : changeReadiness === 3 ? 'medium' : 'low';
  risks.push({
    id: 'adoption',
    risk: 'Low user adoption',
    category: 'Organizational',
    probability: changeReadiness <= 2 ? 0.7 : changeReadiness === 3 ? 0.4 : 0.15,
    dollarImpact: Math.abs(baseNPV - consNPV),
    severity: adoptionSeverity,
    mitigation: 'Invest in change management (15% of impl cost); appoint departmental champions; run 90-day pilot with feedback loops',
    owner: 'COO / Change Management Lead',
    costToMitigate: Math.round(upfrontInvestment * 0.15),
    timeline: 'Pre-implementation + first 6 months',
  });

  // 2. Data Quality Risk
  const dataSeverity = dataReadiness <= 2 ? 'high' : dataReadiness === 3 ? 'medium' : 'low';
  risks.push({
    id: 'data-quality',
    risk: 'Insufficient data quality',
    category: 'Technical',
    probability: dataReadiness <= 2 ? 0.65 : dataReadiness === 3 ? 0.30 : 0.10,
    dollarImpact: upfrontInvestment * 0.30, // 30% cost overrun
    severity: dataSeverity,
    mitigation: 'Conduct data audit before implementation; allocate data cleanup budget; establish data governance framework',
    owner: 'CTO / Data Engineering Lead',
    costToMitigate: Math.round(hiddenCosts.dataCleanup * 1.5),
    timeline: 'Pre-implementation (2-3 months)',
  });

  // 3. Executive Sponsorship Risk
  if (!execSponsor) {
    risks.push({
      id: 'sponsorship',
      risk: 'No executive sponsor',
      category: 'Governance',
      probability: 0.80,
      dollarImpact: upfrontInvestment, // Total loss if project killed
      severity: 'critical',
      mitigation: 'Secure C-level sponsor before proceeding; use this ROI analysis to build the case; define sponsor accountability metrics',
      owner: 'CEO / Board',
      costToMitigate: 0,
      timeline: 'Immediate — prerequisite',
    });
  }

  // 4. Vendor / Technology Risk
  const lockInLevel = vendorLockIn?.level || 'Medium';
  risks.push({
    id: 'vendor-lock-in',
    risk: 'Vendor lock-in and pricing risk',
    category: 'Commercial',
    probability: lockInLevel === 'High' ? 0.50 : lockInLevel === 'Medium' ? 0.30 : 0.15,
    dollarImpact: vendorLockIn?.switchingCost || upfrontInvestment * 0.20,
    severity: lockInLevel === 'High' ? 'high' : 'medium',
    mitigation: 'Negotiate multi-year pricing caps; maintain abstraction layer for model portability; include exit clauses in contracts',
    owner: 'CTO / Procurement',
    costToMitigate: Math.round((vendorLockIn?.switchingCost || 0) * 0.10),
    timeline: 'Contract negotiation phase',
  });

  // 5. Implementation Cost Overrun
  risks.push({
    id: 'cost-overrun',
    risk: 'Implementation cost exceeds budget',
    category: 'Financial',
    probability: 0.40, // Industry average: 40% of AI projects go over budget
    dollarImpact: upfrontInvestment * 0.50,
    severity: 'medium',
    mitigation: 'Fixed-price milestones with vendor; 20% contingency reserve; phased gates with go/no-go decisions',
    owner: 'CFO / Project Sponsor',
    costToMitigate: Math.round(upfrontInvestment * 0.20),
    timeline: 'Throughout implementation',
  });

  // 6. Headcount Transition Risk
  if (teamSize > 15) {
    risks.push({
      id: 'workforce',
      risk: 'Workforce disruption and talent retention',
      category: 'Organizational',
      probability: 0.45,
      dollarImpact: Math.round(teamSize * (formData.avgSalary || 100000) * 0.10), // 10% productivity hit
      severity: teamSize > 50 ? 'high' : 'medium',
      mitigation: 'Develop retraining program; communicate transition timeline; offer retention bonuses to key personnel',
      owner: 'CHRO / Department Head',
      costToMitigate: Math.round(teamSize * 5000), // ~$5K/person for retention
      timeline: 'Months 3-18 post-launch',
    });
  }

  // 7. Regulatory / Compliance Risk
  const industry = formData.industry || '';
  const isRegulated = ['Financial Services', 'Healthcare', 'Government'].some(i => industry.includes(i));
  if (isRegulated) {
    risks.push({
      id: 'regulatory',
      risk: 'Regulatory compliance failure',
      category: 'Legal',
      probability: 0.25,
      dollarImpact: upfrontInvestment * 2, // Fines + remediation
      severity: 'high',
      mitigation: 'Engage compliance team early; conduct AI impact assessment; build audit trail and explainability into model design',
      owner: 'General Counsel / Compliance Officer',
      costToMitigate: Math.round(upfrontInvestment * 0.05),
      timeline: 'Pre-implementation + ongoing',
    });
  }

  // Sort by severity then probability
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  risks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || b.probability - a.probability);

  return risks;
}

const SEVERITY_STYLES = {
  critical: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800', badge: 'bg-red-600 text-white' },
  high: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', badge: 'bg-orange-500 text-white' },
  medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', badge: 'bg-amber-400 text-white' },
  low: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', badge: 'bg-emerald-500 text-white' },
};

export default function RiskRegister({ results, formData }) {
  const risks = buildRiskRegister(results, formData);
  if (risks.length === 0) return null;

  const totalRiskExposure = risks.reduce((sum, r) => sum + r.dollarImpact * r.probability, 0);
  const totalMitigationCost = risks.reduce((sum, r) => sum + r.costToMitigate, 0);
  const criticalCount = risks.filter(r => r.severity === 'critical' || r.severity === 'high').length;

  return (
    <div className="space-y-4">
      {/* Risk summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-center">
          <p className="text-[10px] font-medium text-red-600 uppercase tracking-wide">Risk Exposure</p>
          <p className="text-lg font-bold font-mono text-red-700">{formatCompact(totalRiskExposure)}</p>
          <p className="text-[10px] text-red-500">Probability-weighted</p>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
          <p className="text-[10px] font-medium text-amber-600 uppercase tracking-wide">Mitigation Cost</p>
          <p className="text-lg font-bold font-mono text-amber-700">{formatCompact(totalMitigationCost)}</p>
          <p className="text-[10px] text-amber-500">To address all risks</p>
        </div>
        <div className="rounded-lg bg-navy/5 border border-navy/10 p-3 text-center">
          <p className="text-[10px] font-medium text-navy/60 uppercase tracking-wide">High/Critical</p>
          <p className={`text-lg font-bold font-mono ${criticalCount > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
            {criticalCount} of {risks.length}
          </p>
          <p className="text-[10px] text-navy/40">Require immediate action</p>
        </div>
      </div>

      {/* Risk cards */}
      <div className="space-y-3">
        {risks.map(risk => {
          const styles = SEVERITY_STYLES[risk.severity] || SEVERITY_STYLES.medium;
          return (
            <div key={risk.id} className={`rounded-xl border ${styles.border} ${styles.bg} p-4`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${styles.badge}`}>
                    {risk.severity}
                  </span>
                  <span className="font-semibold text-navy text-sm">{risk.risk}</span>
                </div>
                <span className="text-xs text-gray-500 shrink-0">{risk.category}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs">
                <div>
                  <span className="text-gray-500">Probability</span>
                  <p className={`font-mono font-bold ${styles.text}`}>{Math.round(risk.probability * 100)}%</p>
                </div>
                <div>
                  <span className="text-gray-500">Dollar Impact</span>
                  <p className="font-mono font-bold text-navy">{formatCompact(risk.dollarImpact)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Expected Loss</span>
                  <p className="font-mono font-bold text-red-600">{formatCompact(risk.dollarImpact * risk.probability)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Mitigation Cost</span>
                  <p className="font-mono font-bold text-amber-600">{formatCompact(risk.costToMitigate)}</p>
                </div>
              </div>

              <div className="text-xs space-y-1">
                <p className="text-gray-700"><span className="font-semibold text-navy">Mitigation:</span> {risk.mitigation}</p>
                <div className="flex gap-4">
                  <p className="text-gray-500"><span className="font-semibold">Owner:</span> {risk.owner}</p>
                  <p className="text-gray-500"><span className="font-semibold">Timeline:</span> {risk.timeline}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-400 pt-2 border-t border-gray-100">
        Risk exposure = probability x dollar impact. Mitigation costs are incremental to base implementation budget.
        Risk probabilities derived from industry benchmarks (Gartner 2024, McKinsey 2025) adjusted for organizational readiness inputs.
      </p>
    </div>
  );
}
