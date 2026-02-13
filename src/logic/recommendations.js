function formatCompact(value) {
  if (value == null || isNaN(value)) return '$0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return '$' + (abs / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return '$' + (abs / 1_000).toFixed(0) + 'K';
  return '$' + abs.toFixed(0);
}

export function getRecommendation(results) {
  const conservativeNPV = results.scenarios.conservative.npv;
  const baseNPV = results.scenarios.base.npv;
  const oppCost = results.opportunityCost;

  if (conservativeNPV > 0) {
    const oppCostNote = oppCost
      ? ` Delaying 12 months would cost an estimated ${formatCompact(oppCost.costOfWaiting12Months)} in forgone savings, wage inflation, and competitive erosion.`
      : '';
    return {
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
  }

  if (baseNPV > 0) {
    return {
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
  }

  if (results.scenarios.optimistic.npv > 0) {
    return {
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
  }

  return {
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
