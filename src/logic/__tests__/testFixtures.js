// Standard test inputs for AI ROI Calculator
// Represents a mid-market technology company with good readiness

export const BASE_INPUTS = {
  industry: 'Technology / Software',
  companySize: 'Mid-Market (501-5,000)',
  processType: 'Document Processing',
  teamSize: 20,
  avgSalary: 85000,
  hoursPerWeek: 40,
  errorRate: 0.15,
  currentToolCosts: 50000,
  vendorsReplaced: 0,
  vendorTerminationCost: 0,
  changeReadiness: 3,
  dataReadiness: 3,
  execSponsor: true,
  expectedTimeline: 6,
  implementationBudget: 200000,
  ongoingAnnualCost: 50000,
  teamLocation: 'US - Major Tech Hub',
  companyState: 'California',
};

// Small startup with poor readiness
export const STARTUP_INPUTS = {
  ...BASE_INPUTS,
  industry: 'Technology / Software',
  companySize: 'Startup (1-50)',
  teamSize: 5,
  avgSalary: 70000,
  currentToolCosts: 10000,
  changeReadiness: 2,
  dataReadiness: 2,
  execSponsor: false,
  implementationBudget: 50000,
  ongoingAnnualCost: 15000,
};

// Large enterprise financial services
export const ENTERPRISE_INPUTS = {
  ...BASE_INPUTS,
  industry: 'Financial Services / Banking',
  companySize: 'Enterprise (5,001-50,000)',
  processType: 'Quality & Compliance',
  teamSize: 100,
  avgSalary: 120000,
  hoursPerWeek: 45,
  errorRate: 0.10,
  currentToolCosts: 500000,
  changeReadiness: 4,
  dataReadiness: 4,
  execSponsor: true,
  expectedTimeline: 12,
  implementationBudget: 2000000,
  ongoingAnnualCost: 400000,
  teamLocation: 'US - Other',
  companyState: 'New York',
};

// Government with low readiness (worst case)
export const GOVERNMENT_INPUTS = {
  ...BASE_INPUTS,
  industry: 'Government / Public Sector',
  companySize: 'Large Enterprise (50,000+)',
  processType: 'Workflow Automation',
  teamSize: 50,
  avgSalary: 75000,
  hoursPerWeek: 37,
  errorRate: 0.20,
  currentToolCosts: 200000,
  changeReadiness: 1,
  dataReadiness: 1,
  execSponsor: false,
  expectedTimeline: 18,
  implementationBudget: 500000,
  ongoingAnnualCost: 100000,
  teamLocation: 'US - Other',
  companyState: 'Virginia',
};

// Non-US team (no R&D credit)
export const NON_US_INPUTS = {
  ...BASE_INPUTS,
  teamLocation: 'UK / Western Europe',
  companyState: 'Other / Not Sure',
};

// Revenue-eligible process type
export const REVENUE_ELIGIBLE_INPUTS = {
  ...BASE_INPUTS,
  processType: 'Customer Communication',
};

// Non-revenue-eligible process type
export const NON_REVENUE_INPUTS = {
  ...BASE_INPUTS,
  processType: 'Workflow Automation',
};
