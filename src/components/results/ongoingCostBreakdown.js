const asAmount = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

const nonEmpty = (items) => items.filter(({ amount }) => Math.abs(asAmount(amount)) > 0.5);

/**
 * Creates a transparent, non-overlapping cost tree from the live model.
 * It intentionally uses the same four buckets used by the Excel model:
 * Build (one-time), Access, Consumption, and Run. This helper only concerns
 * the three recurring buckets so it can reconcile to annual AI operating cost.
 */
export function getOngoingCostBreakdown(aiCostModel = {}) {
  const costBuckets = aiCostModel?.costBuckets || {};
  const authoritativeBreakdown = costBuckets.breakdown;

  // Newer calculation payloads provide a complete, DCF-reconciled contract.
  // Prefer it because a user-entered annual override is allocated across the
  // visible categories rather than leaving a mystery residual in the UI.
  if (authoritativeBreakdown && Array.isArray(authoritativeBreakdown.categories)) {
    const categories = authoritativeBreakdown.categories
      .map((category) => ({
        key: category.key,
        label: category.label,
        amount: asAmount(category.amount),
        modeledAmount: asAmount(category.modeledAmount),
        items: (category.items || []).map((item) => ({
          key: item.key,
          label: item.label,
          amount: asAmount(item.amount),
          modeledAmount: asAmount(item.modeledAmount),
        })).filter((item) => Math.abs(item.amount) > 0.5 || Math.abs(item.modeledAmount) > 0.5),
      }))
      .filter((category) => Math.abs(category.amount) > 0.5 || category.items.length > 0);
    const bucketTotal = asAmount(
      authoritativeBreakdown.modeledAnnualTotal
      ?? costBuckets.modeledAnnualTotal
      ?? aiCostModel.computedOngoingCost,
    );
    const effectiveAnnualCost = asAmount(
      authoritativeBreakdown.annualTotal
      ?? costBuckets.annualTotal
      ?? aiCostModel.baseOngoingCost
      ?? bucketTotal,
    );
    const enteredAdjustment = asAmount(
      authoritativeBreakdown.annualOverrideDelta
      ?? (effectiveAnnualCost - bucketTotal),
    );

    return {
      access: asAmount(categories.find((category) => category.key === 'access')?.amount),
      consumption: asAmount(categories.find((category) => category.key === 'consumption')?.amount),
      run: asAmount(categories.find((category) => category.key === 'run')?.amount),
      bucketTotal,
      effectiveAnnualCost,
      isUserOverride: Boolean(
        aiCostModel.userProvidedOngoing
        || authoritativeBreakdown.source === 'user-entered-annual-cost'
        || Math.abs(enteredAdjustment) > 0.5,
      ),
      enteredAdjustment,
      hasBucketDetail: categories.length > 0,
      categories,
      source: authoritativeBreakdown.source || 'modelled',
      usesReconciledBreakdown: true,
    };
  }

  const accessFallback = asAmount(aiCostModel.annualBasePlatformLicense)
    + asAmount(aiCostModel.annualUserLicenseCost)
    + asAmount(aiCostModel.annualAdjacentCost);
  const consumptionFallback = asAmount(aiCostModel.annualApiCost);
  const runComponentItems = nonEmpty([
    { label: 'AI operations and support', amount: aiCostModel.ongoingAiLaborCost },
    { label: 'Agent tools, monitoring and guardrails', amount: aiCostModel.annualAgentInfrastructureCost },
    { label: 'Model updates and retraining', amount: aiCostModel.modelRetrainingCost },
    { label: 'Governance and compliance', amount: aiCostModel.annualComplianceCost },
    { label: 'Employee retraining', amount: aiCostModel.retainedRetrainingCost },
    { label: 'Technology debt reserve', amount: aiCostModel.techDebtCost },
    { label: 'Cybersecurity coverage', amount: aiCostModel.cyberInsuranceCost },
    { label: 'Data storage, transfer and connected apps', amount: aiCostModel.dataTransferCostAnnual },
  ]);
  const runFallback = runComponentItems.reduce((sum, item) => sum + asAmount(item.amount), 0);

  const access = asAmount(costBuckets.accessAnnual ?? accessFallback);
  const consumption = asAmount(costBuckets.consumptionAnnual ?? consumptionFallback);
  const run = asAmount(costBuckets.runAnnual ?? runFallback);
  const bucketTotal = asAmount(costBuckets.modeledAnnualTotal ?? aiCostModel.computedOngoingCost ?? (access + consumption + run));
  const effectiveAnnualCost = asAmount(costBuckets.annualTotal ?? aiCostModel.baseOngoingCost ?? bucketTotal);
  const isUserOverride = Boolean(aiCostModel.userProvidedOngoing);
  const enteredAdjustment = isUserOverride ? effectiveAnnualCost - bucketTotal : 0;

  const accessItems = nonEmpty([
    { label: 'Platform licence', amount: aiCostModel.annualBasePlatformLicense },
    { label: 'User licences', amount: aiCostModel.annualUserLicenseCost },
    { label: 'Adjacent AI products', amount: aiCostModel.annualAdjacentCost },
  ]);
  const consumptionItems = nonEmpty([
    {
      label: aiCostModel.tokenCostModel?.useTokenModel
        ? 'Token, model calls and document processing'
        : 'Requests, model calls and document processing',
      amount: consumption,
    },
  ]);

  // Defensive residual keeps the displayed components reconciled if new Run
  // cost fields are added to the model before this UI receives an update.
  const listedRunTotal = runComponentItems.reduce((sum, item) => sum + asAmount(item.amount), 0);
  const runItems = [...runComponentItems];
  const runResidual = run - listedRunTotal;
  if (Math.abs(runResidual) > 0.5) {
    runItems.push({ label: 'Other operating model costs', amount: runResidual });
  }

  return {
    access,
    consumption,
    run,
    bucketTotal,
    effectiveAnnualCost,
    isUserOverride,
    enteredAdjustment,
    hasBucketDetail: [accessItems, consumptionItems, runItems].some((items) => items.length > 0),
    categories: [
      { key: 'access', label: 'Access and licensing', amount: access, items: accessItems },
      { key: 'consumption', label: 'Consumption', amount: consumption, items: consumptionItems },
      { key: 'run', label: 'Operations, governance and support', amount: run, items: runItems },
    ].filter((category) => Math.abs(category.amount) > 0.5 || category.items.length > 0),
    source: isUserOverride ? 'user-entered-annual-cost' : 'modelled',
    usesReconciledBreakdown: false,
  };
}

/**
 * Classifies the ongoing cost in relation to the actual financial result,
 * not a generic colour threshold. That makes the red/amber outline semantic:
 * red means this cost materially changes the decision, amber means it is a
 * real but smaller drag, and grey means it does not materially change it.
 */
export function getOngoingCostImpactStatus({ annualCost = 0, grossSavings = 0, netValue = 0 } = {}) {
  const cost = asAmount(annualCost);
  const gross = asAmount(grossSavings);
  const net = asAmount(netValue);

  if (cost <= 0) return 'neutral';
  if (gross <= 0 || net < 0 || cost >= gross * 0.5) return 'material-negative';
  if (cost >= gross * 0.05) return 'minor-negative';
  return 'neutral';
}
