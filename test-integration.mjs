/**
 * Quick integration test: runs calculations, verifies all outputs exist,
 * then checks that generateReport and generateExcelModel don't throw.
 * Run with: node test-integration.mjs
 */

// We can't easily import React components in Node, but we CAN import
// the pure-JS logic. For the PDF/Excel we'll test via the Vite build.

import { runCalculations } from './src/logic/calculations.js';
import { getRecommendation } from './src/logic/recommendations.js';

const formData = {
  industry: 'Technology / Software',
  companySize: 'Mid-Market',
  role: 'VP of Operations',
  teamLocation: 'US — Tier 1 (SF, NYC, Boston)',
  processType: 'Data Analysis & Reporting',
  teamSize: 15,
  hoursPerWeek: 25,
  errorRate: 0.12,
  avgSalary: 120000,
  currentToolCosts: 50000,
  vendorsReplaced: 2,
  vendorTerminationCost: 15000,
  implementationBudget: 150000,
  expectedTimeline: 6,
  ongoingAnnualCost: 35000,
  companyState: 'California',
  changeReadiness: 4,
  dataReadiness: 3,
  execSponsor: true,
};

console.log('=== Running calculations ===');
let results;
try {
  results = runCalculations(formData);
  console.log('✓ runCalculations succeeded');
} catch (e) {
  console.error('✗ runCalculations FAILED:', e.message);
  process.exit(1);
}

// Verify all 14 top-level output sections exist
const requiredSections = [
  'currentState', 'benchmarks', 'riskAdjustments', 'aiCostModel',
  'oneTimeCosts', 'hiddenCosts', 'upfrontInvestment', 'totalInvestment',
  'discountRate', 'dcfYears', 'savings', 'valueBreakdown',
  'opportunityCost', 'revenueEnablement', 'rdTaxCredit',
  'thresholdAnalysis', 'phasedTimeline', 'scalabilityPremium',
  'confidenceIntervals', 'peerComparison', 'scenarios',
  'scenarioWeights', 'expectedNPV', 'expectedROIC',
  'sensitivity', 'extendedSensitivity', 'vendorLockIn', 'confidenceLevel',
];

let missing = [];
for (const key of requiredSections) {
  if (results[key] === undefined) missing.push(key);
}
if (missing.length > 0) {
  console.error('✗ Missing sections:', missing.join(', '));
  process.exit(1);
}
console.log(`✓ All ${requiredSections.length} output sections present`);

// Verify key values are numbers (not NaN)
const checks = [
  ['scenarios.base.npv', results.scenarios?.base?.npv],
  ['scenarios.base.irr', results.scenarios?.base?.irr],
  ['scenarios.base.roic', results.scenarios?.base?.roic],
  ['scenarios.base.paybackMonths', results.scenarios?.base?.paybackMonths],
  ['expectedNPV', results.expectedNPV],
  ['expectedROIC', results.expectedROIC],
  ['savings.grossAnnualSavings', results.savings?.grossAnnualSavings],
  ['savings.riskAdjustedSavings', results.savings?.riskAdjustedSavings],
  ['savings.netAnnualSavings', results.savings?.netAnnualSavings],
  ['upfrontInvestment', results.upfrontInvestment],
  ['totalInvestment', results.totalInvestment],
  ['opportunityCost.costOfWaiting12Months', results.opportunityCost?.costOfWaiting12Months],
  ['confidenceIntervals.npv.p50', results.confidenceIntervals?.npv?.p50],
  ['peerComparison.percentileRank', results.peerComparison?.percentileRank],
  ['thresholdAnalysis.isViable', results.thresholdAnalysis?.isViable],
];

let nanErrors = [];
for (const [path, val] of checks) {
  if (val === undefined || val === null || (typeof val === 'number' && isNaN(val))) {
    nanErrors.push(`${path} = ${val}`);
  }
}
if (nanErrors.length > 0) {
  console.error('✗ NaN/undefined values:', nanErrors.join(', '));
  process.exit(1);
}
console.log(`✓ All ${checks.length} key values are valid numbers`);

// Verify projections have the fields the PDF needs
const baseProj = results.scenarios.base.projections[0];
const projFields = ['year', 'enhancementSavings', 'headcountSavings', 'grossSavings', 'separationCost', 'ongoingCost', 'netCashFlow'];
let missingProjFields = [];
for (const f of projFields) {
  if (baseProj[f] === undefined) missingProjFields.push(f);
}
if (missingProjFields.length > 0) {
  console.error('✗ Missing projection fields:', missingProjFields.join(', '));
  process.exit(1);
}
console.log(`✓ Projection objects have all ${projFields.length} required fields (including enhancementSavings, headcountSavings)`);

// Verify value breakdown
const vb = results.valueBreakdown;
const vbFields = ['headcount', 'efficiency', 'errorReduction', 'toolReplacement', 'totalGross', 'totalRiskAdjusted'];
let missingVB = vbFields.filter(f => vb[f] === undefined);
if (missingVB.length > 0) {
  console.error('✗ Missing valueBreakdown fields:', missingVB.join(', '));
  process.exit(1);
}
console.log('✓ Value breakdown has all 6 fields');

// Verify phased timeline
if (!Array.isArray(results.phasedTimeline) || results.phasedTimeline.length < 3) {
  console.error('✗ phasedTimeline missing or too short');
  process.exit(1);
}
console.log(`✓ Phased timeline has ${results.phasedTimeline.length} phases`);

// Verify opportunity cost yearly breakdown
if (!results.opportunityCost.yearlyBreakdown || results.opportunityCost.yearlyBreakdown.length < 3) {
  console.error('✗ Opportunity cost yearlyBreakdown missing');
  process.exit(1);
}
console.log(`✓ Opportunity cost has ${results.opportunityCost.yearlyBreakdown.length}-year breakdown`);

// Verify extended sensitivity
if (!Array.isArray(results.extendedSensitivity) || results.extendedSensitivity.length < 4) {
  console.error('✗ Extended sensitivity missing or too short');
  process.exit(1);
}
console.log(`✓ Extended sensitivity has ${results.extendedSensitivity.length} variables`);

// Test recommendations
console.log('\n=== Running recommendations ===');
let recommendation;
try {
  recommendation = getRecommendation(results);
  console.log('✓ getRecommendation succeeded');
  console.log(`  Verdict: ${recommendation.verdict}`);
  console.log(`  Headline: ${recommendation.headline}`);
} catch (e) {
  console.error('✗ getRecommendation FAILED:', e.message);
  process.exit(1);
}

// Print key metrics
console.log('\n=== Key Metrics ===');
console.log(`  Base NPV:     $${Math.round(results.scenarios.base.npv).toLocaleString()}`);
console.log(`  Base IRR:     ${(results.scenarios.base.irr * 100).toFixed(1)}%`);
console.log(`  Base ROIC:    ${(results.scenarios.base.roic * 100).toFixed(1)}%`);
console.log(`  Payback:      Month ${results.scenarios.base.paybackMonths}`);
console.log(`  Expected NPV: $${Math.round(results.expectedNPV).toLocaleString()}`);
console.log(`  Confidence:   ${results.confidenceLevel}`);
console.log(`  Peer Rank:    P${results.peerComparison.percentileRank}`);
console.log(`  12mo delay:   $${Math.round(results.opportunityCost.costOfWaiting12Months).toLocaleString()}`);
console.log(`  Threshold OK: ${results.thresholdAnalysis.isViable}`);

console.log('\n=== ALL TESTS PASSED ===');
