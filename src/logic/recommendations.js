import { formatCompact } from '../utils/formatters';

export function getRecommendation(results, tier = 'detailed') {
  const conservativeNPV = results.scenarios.conservative.npv;
  const baseNPV = results.scenarios.base.npv;
  const oppCost = results.opportunityCost;

  // Build the base recommendation object, then adapt language to tier
  let rec;

  if (conservativeNPV > 0) {
    const oppCostNote = oppCost
      ? ` Delaying 12 months would cost an estimated ${formatCompact(oppCost.costOfWaiting12Months)} in forgone savings, wage inflation, and competitive erosion.`
      : '';
    rec = {
      verdict: 'STRONG',
      headline: 'Strong case to proceed',
      summary:
        'Even under worst-case assumptions, this investment generates positive returns. The economics support moving forward.' + oppCostNote,
      steps: [
        results.riskAdjustments.sponsorAdjustment < 1
          ? 'Secure executive sponsorship — this is the single biggest risk factor'
          : 'Confirm executive sponsor commitment and governance structure',
        'Begin vendor evaluation with clear selection criteria',
        'Allocate change management budget (minimum 15% of implementation cost)',
        'Define 90-day pilot scope with measurable success criteria',
        'Establish measurement framework before implementation begins',
      ],
    };
  } else if (baseNPV > 0) {
    rec = {
      verdict: 'MODERATE',
      headline: 'Favorable case with manageable risk',
      summary:
        'Base case projections are positive, but downside scenarios show risk. A phased approach is recommended.',
      steps: [
        'Run a limited pilot with a focused team and constrained budget',
        'Address data readiness gaps before scaling',
        'Build a change management plan with clear milestones',
        'Re-evaluate after 90-day pilot with actual performance data',
        'Plan for scale only after pilot validates assumptions',
      ],
    };
  } else if (results.scenarios.optimistic.npv > 0) {
    rec = {
      verdict: 'CAUTIOUS',
      headline: 'Proceed with caution',
      summary:
        'Only the optimistic scenario shows positive returns. Consider a smaller pilot to validate assumptions before committing full budget.',
      steps: [
        'Consider alternative approaches or reduced scope',
        'Invest in data readiness and process standardization first',
        'Build executive buy-in through education and small wins',
        'Run a minimal pilot ($25K-$50K) to gather real performance data',
        'Revisit the full business case after 90 days of pilot data',
      ],
    };
  } else {
    rec = {
      verdict: 'WEAK',
      headline: 'Current economics do not support this investment',
      summary:
        'At this scale and readiness level, the investment is unlikely to generate positive returns. Consider foundational improvements first.',
      steps: [
        'Consider alternative approaches to process improvement',
        'Invest in data readiness and infrastructure first',
        'Build executive buy-in with education about AI capabilities',
        'Address change management fundamentals before technology investment',
        'Revisit in 6-12 months after foundational improvements',
      ],
    };
  }

  // Adapt to tier
  if (tier === 'executive') {
    rec = adaptForExecutive(rec, results);
  } else if (tier === 'detailed') {
    rec = adaptForDetailed(rec, results);
  }
  // 'financial' tier uses the default language as-is

  return rec;
}

function adaptForExecutive(rec, results) {
  const baseScenario = results.scenarios.base;
  const totalInvestment = (results.totalInvestment || 0) + (results.aiCostModel?.totalOngoing5Year || 0);

  const execSummaries = {
    STRONG: `Conservative projections show positive returns. Recommend authorizing a 90-day pilot with ${formatCompact(totalInvestment)} total 5-year commitment.`,
    MODERATE: `Base case is positive (${formatCompact(baseScenario.npv)} NPV). Recommend a phased pilot to validate before full commitment.`,
    CAUTIOUS: `Returns are scenario-dependent. Recommend a limited proof-of-concept before further investment.`,
    WEAK: `Current economics do not support this investment at this scale. Recommend foundational improvements first.`,
  };

  const execSteps = {
    STRONG: [
      'Authorize 90-day pilot with defined success criteria',
      'Assign executive sponsor and governance structure',
    ],
    MODERATE: [
      'Approve limited pilot with constrained budget',
      'Re-evaluate after 90 days with actual performance data',
    ],
    CAUTIOUS: [
      'Defer full commitment; approve small proof-of-concept only',
      'Invest in data readiness and process standardization first',
    ],
    WEAK: [
      'Redirect budget to foundational data and process improvements',
      'Revisit AI investment in 6-12 months',
    ],
  };

  return {
    ...rec,
    summary: execSummaries[rec.verdict] || rec.summary,
    steps: execSteps[rec.verdict] || rec.steps.slice(0, 2),
  };
}

function adaptForDetailed(rec, results) {
  const baseScenario = results.scenarios.base;
  const totalInvestment = (results.totalInvestment || 0) + (results.aiCostModel?.totalOngoing5Year || 0);
  const netReturn = (baseScenario.projections || []).reduce((s, yr) => s + yr.grossSavings, 0) - totalInvestment;

  // Add specific dollar thresholds and metric targets to steps
  const detailedExtras = {
    STRONG: [
      `Target: ${formatCompact(netReturn)} net return over 5 years at base case`,
      `Break-even by month ${baseScenario.paybackMonths || 'N/A'}; NPV ${formatCompact(baseScenario.npv)}`,
    ],
    MODERATE: [
      `Base NPV: ${formatCompact(baseScenario.npv)}; pilot budget should not exceed ${formatCompact(totalInvestment * 0.15)}`,
      `Target adoption rate: ${Math.round((results.riskAdjustments?.adoptionRate || 0.7) * 100)}% to achieve positive returns`,
    ],
    CAUTIOUS: [
      `Pilot budget cap: ${formatCompact(Math.min(50000, totalInvestment * 0.1))}; measure automation accuracy and adoption`,
      `Break-even requires optimistic scenario: validate key assumptions with real data`,
    ],
    WEAK: [
      `Current gap: ${formatCompact(Math.abs(baseScenario.npv))} negative NPV at base case`,
      `Minimum viable team size for positive ROI: ~${Math.max(Math.ceil((results.formData?.teamSize || 10) * 1.5), 20)} people`,
    ],
  };

  return {
    ...rec,
    steps: [
      ...rec.steps,
      ...(detailedExtras[rec.verdict] || []),
    ],
  };
}

export function getRiskMitigations(inputs) {
  const mitigations = [];

  if (inputs.changeReadiness <= 2) {
    mitigations.push({
      risk: 'Low change readiness',
      impact: 'High — reduces realized value by 45-60%',
      mitigation:
        'Invest in change management before technology. Communicate the "why" clearly, identify champions, and create quick wins.',
    });
  }

  if (inputs.dataReadiness <= 2) {
    mitigations.push({
      risk: 'Poor data readiness',
      impact: 'High — adds 25-40% to timeline and 20-30% to costs',
      mitigation:
        'Prioritize data cleanup and standardization. Consider this a prerequisite investment, not part of the AI budget.',
    });
  }

  if (!inputs.execSponsor) {
    mitigations.push({
      risk: 'No executive sponsor',
      impact: 'Critical — projects without sponsorship fail 2x more often',
      mitigation:
        'Use this analysis to build the executive case. Focus on risk-adjusted ROI and the cost of inaction.',
    });
  }

  if (inputs.errorRate >= 0.225) {
    mitigations.push({
      risk: 'High current error rate',
      impact: 'Medium — AI can help but may inherit process flaws',
      mitigation:
        'Standardize the process before automating. AI amplifies existing processes — good or bad.',
    });
  }

  return mitigations;
}
