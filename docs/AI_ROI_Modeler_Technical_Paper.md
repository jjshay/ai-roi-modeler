# AI ROI Modeler: Technical Reference Paper

**Version:** 2.1
**Date:** February 2026
**Authors:** Engineering Team
**Classification:** Internal / Stakeholder Review
**Status:** Complete — V2 adds Monte Carlo simulation, enhanced competitive erosion, AI maturity premium, and synthetic case study

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Architecture](#3-solution-architecture)
4. [The 5 Project Archetypes](#4-the-5-project-archetypes)
5. [Calculation Engine -- Core Formulas](#5-calculation-engine----core-formulas)
6. [Monte Carlo Simulation Engine](#6-monte-carlo-simulation-engine) *(V2)*
7. [Enhanced Competitive Erosion](#7-enhanced-competitive-erosion) *(V2)*
8. [AI Maturity Premium](#8-ai-maturity-premium) *(V2)*
9. [User Interface & Wizard Flow](#9-user-interface--wizard-flow)
10. [Excel Model Design](#10-excel-model-design)
11. [PDF Report Generation](#11-pdf-report-generation)
12. [API & Data Persistence](#12-api--data-persistence)
13. [Benchmark Data & Sources](#13-benchmark-data--sources)
14. [Testing & Validation](#14-testing--validation)
15. [What It Does vs. What It Doesn't](#15-what-it-does-vs-what-it-doesnt)
16. [Design Decisions & Trade-offs](#16-design-decisions--trade-offs)
17. [Future Considerations](#17-future-considerations)
- [Appendix A: Complete Formula Reference](#appendix-a-complete-formula-reference)
- [Appendix B: Benchmark Data Tables](#appendix-b-benchmark-data-tables)
- [Appendix C: API Endpoint Reference](#appendix-c-api-endpoint-reference)

---

## 1. Executive Summary

This section provides a high-level overview of what the AI ROI Modeler is, the key decisions behind its design, and how to use this document for technical review.

### What We Built

The AI ROI Modeler is a browser-based financial calculator that helps organizations estimate the return on investment for AI initiatives. Given a set of inputs about a company's industry, team composition, operational readiness, and planned investment, the tool produces a full 5-year discounted cash flow (DCF) analysis across three scenarios (Conservative, Base, Optimistic), a 6-variable sensitivity analysis, probability-weighted expected values, and a 500-iteration Monte Carlo simulation that produces true probabilistic outcomes (P10/P50/P90 confidence intervals, probability of positive NPV).

The system generates two downloadable artifacts: a presentation-ready Excel workbook with live formulas (so stakeholders can change inputs and see results recalculate), and a branded 24-page PDF report suitable for executive distribution that includes a Monte Carlo analysis page, a synthetic case study, and an AI maturity premium analysis. Models can be saved to a PostgreSQL database and shared via short URLs.

### Key Design Decisions

- **Browser-side computation.** All calculations run in the client. The server stores and retrieves saved models but performs no computation. This keeps the architecture simple and eliminates server-side scaling concerns for the calculation engine.
- **Formula-driven Excel.** The Excel model uses real Excel formulas rather than static values. Every calculated cell traces back to an input cell on the Inputs tab, making the model fully auditable.
- **Risk-adjusted everything.** Every savings projection is multiplied by a blended risk factor derived from organizational readiness and industry success rates. The tool is designed to be an "honest broker" -- it consistently discounts optimistic projections.
- **5 strategic archetypes.** The original system used 8 flat "process types." We consolidated these into 5 project archetypes that map to how organizations actually think about AI investments. Backward compatibility with old process-type data is preserved.
- **DCF over simpler models.** We chose discounted cash flow analysis over simpler payback-only models because DCF accounts for the time value of money, which matters over a 5-year horizon.
- **Monte Carlo with fast mode.** The Monte Carlo engine runs 500 iterations of the full DCF engine by setting a `_mcMode: 'fast'` flag that causes the calculation engine to return after scenario results, skipping expensive post-processing (sensitivity, peer comparison, gates). This reduces per-iteration time from ~10ms to ~1ms, keeping total simulation time under 500ms.
- **Revenue-based competitive erosion.** When the user provides annual revenue, competitive erosion uses industry-specific margin compression rates and AI adoption rates rather than the simpler cost-based penalty. This produces more realistic inaction cost projections for revenue-generating organizations.
- **Maturity premium as narrative only.** AI maturity premium data (compounding benefits of successive deployments) is presented in the UI and PDF for strategic context but deliberately excluded from the core DCF to maintain conservative, defensible projections.

### Calculation Methodology Summary

The calculation chain follows this sequence: (1) Establish current-state costs from user inputs, (2) Look up industry/archetype benchmarks, (3) Compute a blended risk multiplier from organizational readiness and industry success rates, (4) Derive implementation costs from team sizing and timeline, (5) Calculate four categories of savings (headcount, efficiency, error reduction, tool replacement), (6) Risk-adjust all savings, (7) Build 5-year cash flows with adoption ramps and cost escalation, (8) Compute NPV, IRR, ROIC, and payback for three scenarios, (9) Run sensitivity analysis on 6 key variables, (10) Run 500-iteration Monte Carlo simulation with perturbed inputs across 6 probability distributions.

### How to Use This Document

This paper is organized so that each section can be read independently. Section 5 (Calculation Engine) is the most critical for verifying mathematical correctness. Section 6 (Monte Carlo Simulation) documents the probabilistic analysis added in V2. Section 13 (Benchmark Data) documents the empirical basis for all default values. Section 15 (What It Does vs. What It Doesn't) provides an honest assessment of the system's limitations. Reviewers focused on financial accuracy should start with Sections 5-6 and Appendix A. Reviewers focused on system architecture should start with Sections 3 and 12.

---

## 2. Problem Statement

This section explains why calculating AI ROI is difficult, what is missing in the current market, and who this tool serves.

### Why Calculating AI ROI Is Hard

AI investments differ from traditional technology investments in several fundamental ways that make ROI estimation challenging:

**Uncertainty in automation potential.** Unlike deploying a known software package, AI capabilities vary significantly by use case, data quality, and model selection. The same "document processing" task might be 20% automatable in one organization and 60% automatable in another depending on document complexity, data standardization, and process maturity. Published benchmarks vary widely: McKinsey estimates 60-70% of employee time is automatable with current generative AI, while observed enterprise deployment rates are far lower.

**Multi-year time horizons with compounding variables.** AI projects typically take 6-18 months to implement and 2-3 years to reach full adoption. Over this horizon, wage inflation, vendor cost escalation, headcount phasing, and organizational learning all compound. Simple spreadsheet models that apply a flat "savings rate" per year miss these dynamics.

**Risk adjustment requirements.** Industry research consistently shows that 70-85% of AI initiatives fail to meet expected outcomes (MIT/RAND). Only 48% of AI projects reach production (Gartner 2024). Any credible ROI model must account for the probability that the project will underperform expectations. Most available tools do not.

**Hidden and transition costs.** Beyond the obvious costs of engineering and licensing, AI deployments incur change management costs (McKinsey estimates culture is the primary barrier to adoption), data cleanup costs, integration testing, productivity dips during transition, separation costs for displaced employees, compliance and legal review, and ongoing model maintenance. Organizations that budget only for the "implementation cost" are systematically surprised.

**Separation cost complexity.** When AI displaces roles, the cost is not just severance. Total separation cost includes benefits continuation (COBRA), outplacement services, administrative processing, and legal review. SHRM estimates total separation cost at 1.0x to 1.5x annual salary. These costs are phased over years, not incurred on day one.

### What Is Missing in the Market

Most AI ROI tools available today suffer from one or more of the following gaps:

**Static outputs.** They produce a single number or a static report. Stakeholders cannot change inputs and see results update. This makes it impossible to conduct what-if analysis or to audit the calculation chain.

**No risk adjustment.** They take the user's assumptions at face value and produce an "expected" ROI without discounting for the probability of failure or underperformance. This systematically overstates returns.

**Oversimplified cost models.** They account for software licensing and perhaps engineering headcount but omit transition costs, hidden costs, vendor cost escalation, and ongoing operational costs like model retraining and compliance audits.

**No DCF.** Many tools compute simple payback periods or static ROI percentages without discounting future cash flows. Over a 5-year horizon, the difference between $1M in savings today and $1M in savings in Year 5 is significant, especially for startups with high cost of capital.

**Not auditable.** The formulas behind the numbers are opaque. Finance teams and CFOs are reluctant to trust projections when they cannot trace each number back to its source assumptions.

### The Gap We Fill

The gap this tool addresses is between "AI will save money" (the qualitative claim made by AI vendors and consultants) and "here is the NPV with a DCF, risk-adjusted across three scenarios, backed by 31 cited research sources, with a live Excel model you can audit" (the quantitative evidence finance teams need to approve a capital allocation).

### Who This Tool Is For

The primary audiences are:

- **Finance teams** evaluating AI investment proposals. They need auditable projections, sensitivity analysis, and risk-adjusted scenarios.
- **AI and technology leaders** building business cases for AI initiatives. They need to translate technical capabilities into financial language.
- **Management consultants** advising clients on AI strategy. They need a defensible, source-backed methodology they can present to C-suite audiences.
- **Operations leaders** estimating the impact of AI on their teams. They need to understand headcount implications, timeline expectations, and phased value realization.

The tool is explicitly not for AI engineers selecting models or architectures, for organizations already in production with AI (who should be tracking actuals), or for consumer-facing AI product decisions.

### The Quantification Challenge in Practice

Consider a concrete example. A mid-market financial services company (2,000 employees) is evaluating an AI initiative to automate their compliance document review process. The CTO estimates it will "save 30% of the compliance team's time." The CFO asks: "What does that mean in dollars? What's the NPV? What's the payback period? What if adoption is slower than expected? What are the hidden costs?"

Without a structured model, the answers are typically back-of-envelope calculations: "30% of 50 compliance analysts at $120K each is $1.8M per year, minus $500K for the AI platform, so $1.3M per year, payback in 6 months." This calculation ignores:

- Risk that adoption will be lower than 30% (industry average is 65% for financial services, not the CTO's optimistic 100%)
- Separation costs for the 15 analysts who would be displaced ($1.95M at 1.3x salary multiplier, phased over 4 years)
- Ongoing costs: model retraining ($35K/year), compliance audits ($60K/year), cyber insurance increase ($25K/year), API costs ($40K+/year)
- Implementation costs beyond the platform: legal review ($175K), security audit ($125K), change management, data cleanup
- The time value of money: $1.3M in Year 5 is worth less than $1.3M today at a 9% discount rate for an enterprise
- Vendor cost escalation: AI platform costs typically increase 12% per year for the first 2 years

The AI ROI Modeler captures all of these factors systematically, producing a defensible financial analysis that withstands CFO scrutiny.

---

## 3. Solution Architecture

This section describes the technical architecture, file structure, and data flow of the AI ROI Modeler.

### High-Level Architecture

```
+------------------------------------------------------------------+
|                        USER'S BROWSER                             |
|                                                                   |
|  +------------------+    +--------------------+    +------------+ |
|  |   Landing Page   |--->|   6-Step Wizard    |--->|  Results   | |
|  |                  |    |   (StepWizard.jsx) |    |  Dashboard | |
|  +------------------+    +--------------------+    +-----+------+ |
|                                                          |        |
|                          +-----------+                   |        |
|                          | formData  |<------ state -----+        |
|                          |  (React   |                   |        |
|                          |  useState)|                   |        |
|                          +-----+-----+                   |        |
|                                |                         |        |
|                    +-----------+-----------+              |        |
|                    |                       |              |        |
|             +------v------+        +------v------+       |        |
|             | calculations|        |  archetypes |       |        |
|             |    .js      |        |    .js      |       |        |
|             +------+------+        +-------------+       |        |
|                    |                                     |        |
|             +------v------+                              |        |
|             | benchmarks  |                              |        |
|             |    .js      |                              |        |
|             +-------------+                              |        |
|                                                          |        |
|              +-------------------------------------------+        |
|              |                    |                                |
|       +------v------+    +-------v-------+                        |
|       | Excel Model |    |  PDF Report   |                        |
|       | (ExcelJS)   |    |  (jsPDF)      |                        |
|       +-------------+    +---------------+                        |
+------------------------------------------------------------------+
           |  Save / Load / Share
           v
+-----------------------------+
|   API SERVER (Hono + Node)  |
|   Railway.app               |
|   /api/models  CRUD         |
|   /api/share/:token  GET    |
|   /api/leads   POST         |
+-------------+---------------+
              |
    +---------v---------+
    |   PostgreSQL DB   |
    |   (Railway)       |
    |   models table    |
    |   leads table     |
    +-------------------+
```

### Tech Stack Choices and Rationale

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend Framework | React 19 | Component model fits wizard-style UI; large ecosystem |
| Build Tool | Vite 7 | Fast HMR, ESM-native, simple config |
| Styling | Tailwind CSS 4 | Utility-first CSS; rapid iteration without stylesheet bloat |
| Animation | Framer Motion | Declarative animation for step transitions |
| Excel Generation | ExcelJS | Full formula support; runs in browser; no server needed |
| PDF Generation | jsPDF + jspdf-autotable | Client-side PDF with table layout support |
| API Framework | Hono | Lightweight, fast, TypeScript-native; minimal overhead |
| Database | PostgreSQL | JSONB support for flexible formData storage |
| Hosting (Frontend) | Vercel | Zero-config React deployment; global CDN |
| Hosting (API) | Railway | Managed Node.js + PostgreSQL; simple deployment |

### File Structure

```
ai-roi-modeler/
  src/
    App.jsx                          # Root component, screen state machine
    main.jsx                         # React entry point
    logic/
      calculations.js                # Core calculation engine (~1,500 lines)
      benchmarks.js                  # All benchmark constants + sources (~930 lines)
      monteCarlo.js                  # Monte Carlo simulation engine (V2)
      archetypes.js                  # 5 project archetypes + defaults (~166 lines)
      recommendations.js             # Verdict engine (STRONG/MODERATE/CAUTIOUS/WEAK)
      __tests__/
        calculations.test.js         # 147 tests on core calculations
        benchmarks.test.js           # 31 tests on benchmark data integrity
        recommendations.test.js      # 13 tests on recommendation logic
        monteCarlo.test.js           # 11 tests on Monte Carlo engine (V2)
        testFixtures.js              # Standard input profiles for testing
    components/
      StepWizard.jsx                 # 6-step wizard controller
      ProgressBar.jsx                # Visual progress indicator
      LandingPage.jsx                # Marketing landing page
      AnimatedCounter.jsx            # Number animation component
      steps/
        Step1_CompanyContext.jsx      # Industry, size, location, role
        Step2_RiskReadiness.jsx       # Change readiness, data readiness, sponsor
        Step3_ProcessDetails.jsx      # Archetype, team size, hours, error rate
        Step4_ReviewAssumptions.jsx   # Editable archetype defaults
        Step4_CurrentCosts.jsx        # Salary, tool costs, vendor info
        Step5_AIInvestment.jsx        # Budget, timeline, ongoing cost
      inputs/                        # Reusable input components
        CardSelector.jsx
        CurrencyInput.jsx
        SegmentedSelect.jsx
        SliderInput.jsx
        StarRating.jsx
        ToggleQuestion.jsx
      results/
        LiveCalculation.jsx          # Results dashboard container
        ScenarioCards.jsx             # 3-scenario comparison
        ValueBreakdown.jsx           # 4-category value decomposition
        WaterfallChart.jsx           # Visual cash flow waterfall
        HiddenCosts.jsx              # Hidden cost breakdown
        OpportunityCost.jsx          # Cost of inaction display
        PhasedTimeline.jsx           # 4-phase value realization
        ScalabilityPremium.jsx       # 2x/3x scaling comparison
        ConfidenceIntervals.jsx      # NPV/ROIC/payback ranges
        PeerComparison.jsx           # Industry peer benchmarking
        RevenueEnablement.jsx        # Revenue uplift (informational)
        QualitativeBenefits.jsx      # Non-quantified benefits
        BottomLine.jsx               # Final recommendation
    excel/
      generateExcelModel.js          # 6-tab Excel workbook generator
    pdf/
      generateReport.js              # Branded PDF report generator
    utils/
      formatters.js                  # Currency, percent, date formatting
      statistics.js                  # Statistical distributions for Monte Carlo (V2)
      __tests__/
        formatters.test.js           # 13 tests on formatting functions
        statistics.test.js           # 19 tests on statistical utilities (V2)
  api/
    src/
      index.ts                       # Hono API server
      db.js                          # PostgreSQL connection (postgres.js)
      schema.sql                     # Database schema
  index.html                         # Vite entry HTML
  vite.config.js                     # Vite configuration
  vercel.json                        # Vercel deployment config
  railway.toml                       # Railway deployment config
  package.json                       # Dependencies and scripts
```

### Data Flow

The data flow follows a unidirectional pattern:

1. **User inputs** are collected across 6 wizard steps and stored in a single `formData` state object in `App.jsx`.
2. **On wizard completion**, `formData` is passed to the `LiveCalculation` results component.
3. **`LiveCalculation`** calls `runCalculations(formData)` from `calculations.js`, which returns a comprehensive results object (~50 properties).
4. **Monte Carlo** runs asynchronously via dynamic import (`import('../../logic/monteCarlo')`), perturbing 6 input variables across probability distributions for 500 iterations. Results are stored in `mcResults` state.
5. **Results** are distributed to child result components (ScenarioCards, ValueBreakdown, etc.) as props.
6. **Excel export** calls `generateExcelModel(formData, mcResults)`, which internally runs the same calculations and writes formulas to an ExcelJS workbook, with Monte Carlo summary in the Sensitivity tab.
7. **PDF export** calls `generateReport(formData, results, recommendation, mcResults)`, which renders the results into a 24-page jsPDF document including Monte Carlo, case study, and maturity premium pages.
7. **Save/Share** sends `formData` to the API, which stores it in PostgreSQL and returns a share token.
8. **Load** retrieves `formData` from the API by share token or model ID, restores it to state, and renders results.

---

## 4. The 5 Project Archetypes

This section documents the archetype system that replaced the original flat process-type selector, explains the design rationale, and details how default assumptions are derived.

### Why We Moved from 8 Process Types to 5 Archetypes

The original system presented users with 8 process types:

1. Document Processing
2. Customer Communication
3. Data Analysis & Reporting
4. Research & Intelligence
5. Workflow Automation
6. Content Creation
7. Quality & Compliance
8. Other

Usability testing revealed two problems. First, users frequently could not map their AI initiative to a single process type. A project to "automate our back-office operations" might span Document Processing, Workflow Automation, and Data Analysis. Second, the process types were implementation-oriented (describing *what* AI does) rather than strategy-oriented (describing *why* the organization is investing).

The 5 archetypes reframe the question around business purpose:

| Archetype | ID | Tags | Source Process Types |
|-----------|----|------|---------------------|
| Internal Process Automation | `internal-process-automation` | Internal, Operations, Data | Workflow Automation, Document Processing |
| Customer-Facing AI | `customer-facing-ai` | External, Revenue | Customer Communication, Content Creation |
| Data & Analytics Automation | `data-analytics-automation` | Internal, Data | Data Analysis & Reporting, Research & Intelligence |
| Revenue & Growth AI | `revenue-growth-ai` | External, Revenue | Customer Communication, Content Creation, Research & Intelligence |
| Risk & Compliance AI | `risk-compliance-ai` | Internal, Operations, Data | Quality & Compliance, Document Processing |

Each archetype maps to 2-3 source process types. The default assumptions for an archetype are computed by averaging the benchmark values across its source process types for the selected industry.

### How Defaults Are Derived

The `buildDefaults` function in `archetypes.js` computes defaults for each archetype-industry combination:

```javascript
function buildDefaults(archetype, industry) {
  const pts = archetype.sourceProcessTypes;

  const automationPotential = parseFloat(
    avgAutomationForIndustry(industry, pts).toFixed(2)
  );
  const apiCostPer1kRequests = Math.round(
    avgFromProcessTypes(API_COST_PER_1K_REQUESTS, pts, 10)
  );
  const requestsPerPersonHour = Math.round(
    avgFromProcessTypes(REQUESTS_PER_PERSON_HOUR, pts, 12)
  );
  const toolReplacementRate = parseFloat(
    avgFromProcessTypes(TOOL_REPLACEMENT_RATE, pts, 0.40).toFixed(2)
  );
  const adoptionRate = 0.70;
  const revenueEligible = ['customer-facing-ai', 'revenue-growth-ai']
    .includes(archetype.id);

  return {
    automationPotential,
    adoptionRate,
    apiCostPer1kRequests,
    requestsPerPersonHour,
    toolReplacementRate,
    revenueEligible,
  };
}
```

The averaging helpers look up each source process type in the benchmark tables and return the mean:

```javascript
function avgFromProcessTypes(lookupTable, processTypes, fallback) {
  const vals = processTypes
    .map(pt => lookupTable[pt])
    .filter(v => v !== undefined);
  return vals.length > 0
    ? vals.reduce((s, v) => s + v, 0) / vals.length
    : fallback;
}
```

For example, "Internal Process Automation" in "Technology / Software" averages across Workflow Automation and Document Processing:
- Automation potential: (0.65 + 0.60) / 2 = 0.625, rounded to 0.63
- API cost/1K: (5 + 20) / 2 = 12.5, rounded to 13
- Requests/hour: (30 + 12) / 2 = 21
- Tool replacement: (0.65 + 0.55) / 2 = 0.60

### The Assumptions Object

Every archetype generates an `assumptions` object with these fields:

| Field | Type | Description |
|-------|------|-------------|
| `automationPotential` | 0-1 | Fraction of team's work that AI can automate |
| `adoptionRate` | 0-1 | Expected adoption rate (defaults to 0.70, overridden by readiness) |
| `apiCostPer1kRequests` | $ | Cost per 1,000 API inference calls |
| `requestsPerPersonHour` | int | Expected AI API requests per person per hour |
| `toolReplacementRate` | 0-1 | Fraction of current tool costs replaced by AI |
| `revenueEligible` | bool | Whether this archetype can generate revenue uplift |

The Risk & Compliance archetype adds one additional field:

| Field | Type | Description |
|-------|------|-------------|
| `errorReductionPotential` | 0-1 | Set to `min(automationPotential + 0.10, 0.75)` |

These defaults are pre-computed at module load time for all 50 combinations (5 archetypes x 10 industries) and stored in the `ARCHETYPE_DEFAULTS` lookup table. They are presented to the user on the "Review Assumptions" step as editable values.

### Backward Compatibility

Old saved models that contain a `processType` but no `projectArchetype` or `assumptions` continue to work. The calculation engine falls back to direct benchmark lookups when `assumptions` is empty or missing:

```javascript
const automationPotential = assumptions.automationPotential
  ?? getAutomationPotential(industry, processType);
```

This pattern (use `assumptions` value if present, otherwise fall back to benchmark lookup by `processType`) is applied consistently for all archetype-derived parameters.

---

## 5. Calculation Engine -- Core Formulas

This is the most important section of this document. It traces the complete calculation chain from user inputs to final financial metrics. All formulas are shown both in mathematical notation and as they appear in the source code (`calculations.js`).

### Calculation Chain Overview

The full calculation chain proceeds through these stages, each building on the results of the previous:

```
User Inputs
    |
    v
[Current State Costs] -----------> annualLaborCost, annualReworkCost, totalCurrentCost
    |
    v
[Industry Benchmarks] -----------> automationPotential, industrySuccessRate
    |
    v
[Risk Adjustments] --------------> adoptionRate, sponsorAdjustment, riskMultiplier
    |
    v
[FTE Displacement] --------------> displacedFTEs, retainedFTEs
    |
    v
[Implementation Cost Model] -----> realisticImplCost, hiddenCosts, upfrontInvestment
    |
    v
[Ongoing Cost Model] ------------> baseOngoingCost, ongoingCostsByYear[0..4]
    |
    v
[Savings Decomposition] ---------> headcount, efficiency, errorReduction, toolReplacement
    |
    v
[Separation Cost Phasing] -------> separationByYear[0..4]
    |
    v
[5-Year Cash Flow Builder] ------> yearFlows[0..4] for each scenario
    |
    v
[Financial Metrics] -------------> NPV, IRR, ROIC, Payback (per scenario)
    |
    v
[Probability-Weighted Values] ---> expectedNPV, expectedROIC
    |
    v
[Sensitivity Analysis] ----------> 6-variable tornado (full DCF re-run each)
    |
    v
[Supplementary Analyses] --------> opportunityCost, competitiveErosion,
                                    revenueEnablement, rdTaxCredit,
                                    peerComparison, confidenceIntervals,
                                    capitalEfficiency, gateStructure
    |
    v (async, in UI layer)
[Monte Carlo Simulation] --------> 500 iterations with perturbed inputs
                                    → P10/P25/P50/P75/P90, probabilityPositiveNPV,
                                      NPV distribution histogram
```

### 5.1 Risk Multiplier

The risk multiplier is the single most important parameter in the model. It scales all savings projections downward based on organizational readiness and industry track record.

**Step 1: Adoption rate from change readiness.**

The user rates their organization's change readiness on a 1-5 scale. This maps to an adoption rate:

| Change Readiness | Adoption Rate |
|------------------|---------------|
| 1 (Very Low) | 0.40 |
| 2 (Low) | 0.55 |
| 3 (Moderate) | 0.70 |
| 4 (High) | 0.85 |
| 5 (Very High) | 0.95 |

```javascript
const adoptionRate = ADOPTION_MULTIPLIERS[changeReadiness] || 0.70;
```

**Step 2: Executive sponsor adjustment.**

If the project has an executive sponsor, the adjustment is 1.0 (no penalty). If not, it is 0.85 (15% penalty):

```javascript
const sponsorAdjustment = inputs.execSponsor ? 1.0 : 0.85;
```

**Step 3: Organizational readiness.**

```
orgReadiness = adoptionRate x sponsorAdjustment
```

```javascript
const orgReadiness = adoptionRate * sponsorAdjustment;
```

**Step 4: Blended risk multiplier.**

The risk multiplier averages organizational readiness with the industry's historical AI success rate:

```
riskMultiplier = (orgReadiness + industrySuccessRate) / 2
```

```javascript
const riskMultiplier = (orgReadiness + industrySuccessRate) / 2;
```

Industry success rates range from 0.45 (Government) to 0.72 (Technology).

**Design note:** The code includes a detailed comment explaining why averaging is used instead of multiplication. Multiplicative composition (`orgReadiness x industrySuccessRate`) would treat the factors as independent probabilities, over-penalizing because high-success industries tend to correlate with better organizational readiness. The average is a pragmatic compromise sourced from Deloitte's meta-analysis methodology.

### 5.2 Current State Costs

These establish the baseline cost against which savings are measured.

```
hourlyRate       = avgSalary / 2080
annualLaborCost  = teamSize x avgSalary
annualReworkCost = annualLaborCost x errorRate
totalCurrentCost = annualLaborCost + annualReworkCost + currentToolCosts
```

```javascript
const hourlyRate = avgSalary / 2080;
const annualLaborCost = teamSize * avgSalary;
const annualReworkCost = annualLaborCost * errorRate;
const totalCurrentCost = annualLaborCost + annualReworkCost + currentToolCosts;
```

The constant 2,080 represents standard annual working hours (52 weeks x 40 hours).

### 5.3 FTE Displacement

```
rawDisplacedFTEs = round(teamSize x automationPotential x adoptionRate)
maxDisplaced     = floor(teamSize x 0.75)
displacedFTEs    = min(rawDisplacedFTEs, maxDisplaced)
retainedFTEs     = teamSize - displacedFTEs
```

```javascript
const rawDisplacedFTEs = Math.round(teamSize * automationPotential * adoptionRate);
const maxDisplaced = Math.floor(teamSize * MAX_HEADCOUNT_REDUCTION);
const displacedFTEs = Math.min(rawDisplacedFTEs, maxDisplaced);
const retainedFTEs = teamSize - displacedFTEs;
```

The 75% cap (`MAX_HEADCOUNT_REDUCTION = 0.75`) ensures the model never projects complete team elimination. At least 25% of roles always require human judgment, relationship management, and edge-case handling.

### 5.4 Implementation Cost

Implementation cost is built bottom-up from staffing requirements, then reconciled with the user's stated budget.

**AI team sizing:**

```javascript
const scopeMinEngineers = Math.max(1, Math.ceil(teamSize / 12));
const timelinePressure = expectedTimeline <= 3 ? 1.5
  : expectedTimeline <= 6 ? 1.2 : 1.0;
const dataHeadcountMult = dataReadiness <= 2 ? 1.3
  : dataReadiness === 3 ? 1.1 : 1.0;
const maxTeam = MAX_IMPL_TEAM[companySize] || 10;
const rawEngineers = Math.ceil(
  scopeMinEngineers * timelinePressure * dataHeadcountMult
);
const aiImplEngineers = Math.min(rawEngineers, maxTeam);
const aiImplPMs = Math.max(0.5, Math.ceil(aiImplEngineers / 5));
```

Maximum implementation team sizes by company size: Startup=3, SMB=5, Mid-Market=10, Enterprise=15, Large Enterprise=25.

**Timeline adjustment:**

```javascript
const dataTimeMult = DATA_TIMELINE_MULTIPLIER[dataReadiness] || 1.10;
const sizeMult = SIZE_MULTIPLIER[companySize] || 1.0;
const sponsorTimeMult = inputs.execSponsor ? 1.0 : 1.25;
const adjustedTimeline = Math.ceil(
  expectedTimeline * dataTimeMult * sizeMult * sponsorTimeMult
);
```

Low data readiness extends timelines by up to 40%. Lack of executive sponsor adds 25%. Large enterprise size multiplier is 1.6x.

**Cost components:**

```
implEngineeringCost = engineers x aiSalary x timelineYears
implPMCost          = PMs x (aiSalary x 0.85) x timelineYears
implInfraCost       = (engineering + PM) x 0.12
implTrainingCost    = (engineering + PM) x 0.08
computedImplCost    = engineering + PM + infra + training
```

```javascript
const implEngineeringCost = aiImplEngineers * aiSalary * implTimelineYears;
const implPMCost = aiImplPMs * (aiSalary * 0.85) * implTimelineYears;
const implInfraCost = (implEngineeringCost + implPMCost) * 0.12;
const implTrainingCost = (implEngineeringCost + implPMCost) * 0.08;
const computedImplCost = implEngineeringCost + implPMCost
  + implInfraCost + implTrainingCost;
```

**Data readiness cost multiplier:**

The user's stated budget is adjusted for data readiness before comparison:

```javascript
const dataCostMult = DATA_COST_MULTIPLIER[dataReadiness] || 1.10;
const userAdjustedImplCost = implementationBudget * dataCostMult;
```

| Data Readiness | Cost Multiplier |
|---------------|-----------------|
| 1 (Very Low) | 1.30 |
| 2 (Low) | 1.20 |
| 3 (Moderate) | 1.10 |
| 4 (High) | 1.00 |
| 5 (Very High) | 1.00 |

**Budget reconciliation:**

The model takes the higher of the user's adjusted budget and the computed cost:

```javascript
const realisticImplCost = Math.max(userAdjustedImplCost, computedImplCost);
```

If the computed cost exceeds the budget, the model reports the gap in `aiCostModel.budgetGap`.

### 5.5 Ongoing Annual Costs

Ongoing costs are built from seven components:

```javascript
const coreOngoingCost = ongoingAiLaborCost + annualApiCost
  + annualLicenseCost + annualAdjacentCost;

const computedOngoingCost = coreOngoingCost
  + modelRetrainingCost        // 7% of impl cost
  + annualComplianceCostVal    // $8K-$100K by size
  + retainedRetrainingCost     // 3% of retained salary
  + techDebtCost               // 5% of impl cost
  + cyberInsuranceCost;        // $2K-$50K by size

const baseOngoingCost = Math.max(ongoingAnnualCost, computedOngoingCost);
```

**API cost calculation:**

```javascript
const monthlyApiVolume = teamSize * hoursPerWeek * 4.33 * requestsPerHour;
const monthlyApiCost = (monthlyApiVolume / 1000) * apiCostPerK;
const annualApiCost = monthlyApiCost * 12;
```

**Cost escalation schedule:**

Ongoing costs escalate annually using a tapered schedule:

| Year | Escalation Rate | Cumulative |
|------|----------------|------------|
| 1 | 0% | 1.000 |
| 2 | 12% | 1.120 |
| 3 | 12% | 1.254 |
| 4 | 7% | 1.342 |
| 5 | 7% | 1.436 |

```javascript
const ongoingCostsByYear = [];
let cumulativeEscalation = 1.0;
for (let yr = 0; yr < DCF_YEARS; yr++) {
  cumulativeEscalation *= (1 + (AI_COST_ESCALATION_SCHEDULE[yr] || 0));
  ongoingCostsByYear.push(baseOngoingCost * cumulativeEscalation);
}
```

### 5.6 Savings Calculations

Savings are decomposed into four categories, each risk-adjusted independently:

```javascript
const headcountSavingsGross = displacedFTEs * avgSalary;
const efficiencySavingsGross = Math.max(0,
  (annualLaborCost * automationPotential) - headcountSavingsGross);
const errorReductionGross = annualReworkCost * automationPotential;
const toolReplacementGross = currentToolCosts * toolReplacementRate;
```

**Headcount savings:** The salary cost of FTEs that will be displaced. This is phased over Years 2-5 (Year 1 is "enhancement only" -- AI augments existing employees, no layoffs).

**Efficiency savings:** The productivity gains that exceed headcount savings. If automation potential is 60% and team size is 20, then total automatable labor is 12 FTE-equivalents. If 8 FTEs are displaced, the remaining 4 FTE-equivalents of productivity gain accrue as efficiency savings (same headcount, doing more with AI).

**Error reduction:** Current rework cost multiplied by automation potential. This represents quality improvements from AI-assisted processes.

**Tool replacement:** Current tool costs multiplied by the tool replacement rate (40-65% depending on process type). Represents legacy software that AI replaces.

**Risk-adjusted totals:**

```javascript
const grossAnnualSavings = headcountSavingsGross + efficiencySavingsGross
  + errorReductionGross + toolReplacementGross;
const riskAdjustedSavings = grossAnnualSavings * riskMultiplier;
const netAnnualSavings = riskAdjustedSavings - baseOngoingCost;
```

### 5.7 5-Year DCF Model

The core of the financial model is a year-by-year cash flow projection:

```javascript
function buildYearCashFlows(scenarioMultiplier) {
  const flows = [];
  let cumulativeReduction = 0;
  let cumulativeNet = -upfrontInvestment;

  for (let yr = 0; yr < DCF_YEARS; yr++) {
    const wageGrowth = Math.pow(1 + WAGE_INFLATION_RATE, yr);

    // Enhancement savings (efficiency + error + tool)
    const enhancementSavings = enhancementRiskAdjusted
      * ADOPTION_RAMP[yr] * scenarioMultiplier * wageGrowth;

    // Headcount savings -- phased reduction
    cumulativeReduction += HEADCOUNT_REDUCTION_SCHEDULE[yr];
    const headcountSavings = valueBreakdown.headcount.riskAdjusted
      * cumulativeReduction * scenarioMultiplier * wageGrowth;

    const grossSavings = enhancementSavings + headcountSavings;
    const separationCost = separationByYear[yr];
    const ongoingCost = ongoingCostsByYear[yr];
    const netCashFlow = grossSavings - separationCost - ongoingCost;
    cumulativeNet += netCashFlow;

    flows.push({
      year: yr + 1,
      enhancementSavings, headcountSavings, grossSavings,
      separationCost, ongoingCost, netCashFlow,
      cumulativeReduction, netCumulative: cumulativeNet,
    });
  }
  return flows;
}
```

**Key schedules:**

| Year | Adoption Ramp | HR Reduction | Cumulative HR |
|------|--------------|-------------|---------------|
| 1 | 0.75 | 0% | 0% |
| 2 | 0.90 | 20% | 20% |
| 3 | 1.00 | 25% | 45% |
| 4 | 1.00 | 20% | 65% |
| 5 | 1.00 | 10% | 75% |

Year 1 is the "enhancement phase" -- AI augments existing employees with no headcount reduction. Headcount reduction begins in Year 2 and reaches the 75% cap by Year 5.

Wage growth at 4% annually means the value of avoided labor increases each year.

**NPV Calculation:**

```
NPV = -upfrontInvestment + SUM(netCashFlow[yr] / (1 + discountRate)^yr)
```

```javascript
function calculateNPV(yearFlows) {
  let npv = -upfrontInvestment;
  for (let yr = 0; yr < yearFlows.length; yr++) {
    npv += yearFlows[yr].netCashFlow / Math.pow(1 + discountRate, yr + 1);
  }
  return npv;
}
```

Discount rates vary by company size (WACC proxy): Startup=18%, SMB=14%, Mid-Market=10%, Enterprise=9%, Large Enterprise=8%. The discount rate acts as a WACC (Weighted Average Cost of Capital) proxy. Startups have higher cost of capital because equity investors demand higher returns for higher risk. Large enterprises can access cheaper debt and have more predictable cash flows.

**Hidden Costs:**

Before the upfront investment is totaled, five categories of hidden costs are calculated as percentages of the realistic implementation cost:

```javascript
const changeManagement = realisticImplCost * 0.15;
const culturalResistance = realisticImplCost * CULTURAL_RESISTANCE_RATE; // 0.12
const dataCleanup = realisticImplCost *
  (dataReadiness <= 2 ? 0.25 : dataReadiness === 3 ? 0.10 : 0);
const integrationTesting = realisticImplCost * 0.10;
const productivityDip = (annualLaborCost / 12) * 3 * 0.25;
const totalHidden = changeManagement + culturalResistance
  + dataCleanup + integrationTesting + productivityDip;
```

- **Change management (15%):** Internal marketing, champions program, adoption support programs. Source: McKinsey estimates change programs cost 10-15% of implementation.
- **Cultural resistance (12%):** Resistance management, retraining, shadow IT risk. McKinsey identifies culture as the number-one barrier to AI adoption.
- **Data cleanup (0-25%):** Data quality remediation. Cost depends on data readiness: 25% at low readiness, 10% at moderate, 0% at high. Source: Gartner 2025 estimates 60% of AI projects fail due to data readiness issues.
- **Integration testing (10%):** End-to-end testing, UAT, parallel running with legacy systems.
- **Productivity dip:** Three months at 25% productivity loss during transition, calculated as `(annualLaborCost / 12) * 3 * 0.25`. This is a fixed-duration cost independent of implementation cost.

**One-Time Transition Costs:**

In addition to hidden costs, the upfront investment includes one-time costs for legal/compliance review, security audits, contingency reserve, and vendor termination:

```javascript
const totalOneTimeCosts = legalComplianceCost + securityAuditCost
  + contingencyReserve + vendorTerminationCost;
```

Contingency reserve is 20% of the realistic implementation cost (PMI recommends 10-25% for technology projects).

**Upfront Investment:**

```
upfrontInvestment = realisticImplCost + totalHidden + totalOneTimeCosts
totalInvestment   = upfrontInvestment + totalSeparationCost
```

Note that separation costs are NOT included in upfrontInvestment. They are phased over Years 2-5 as cash outflows in the DCF. The totalInvestment figure (which includes separation) is used for ROIC calculation to reflect the full capital deployed over the project lifecycle.

**IRR Calculation:**

IRR is computed using Newton-Raphson iteration with dampening:

```javascript
function calculateIRR(yearFlows, maxIterations = 200) {
  const cashFlows = [-upfrontInvestment, ...yearFlows.map(f => f.netCashFlow)];
  const hasPositive = cashFlows.some(cf => cf > 0);
  const hasNegative = cashFlows.some(cf => cf < 0);
  if (!hasPositive || !hasNegative) return NaN;

  let rate = 0.10;
  for (let i = 0; i < maxIterations; i++) {
    // ... Newton-Raphson with dampened steps
    if (Math.abs(newRate - rate) < 0.0001) return newRate;
    rate = newRate;
  }
  return rate;
}
```

IRR is capped at 75% (`MAX_BASE_IRR`) and floored at -100% (`MIN_BASE_IRR`).

**ROIC Calculation:**

```
totalNetReturn = SUM(all year netCashFlows)
netProfit      = totalNetReturn - upfrontInvestment
ROIC           = netProfit / totalInvestment
```

```javascript
function calculateROIC(yearFlows) {
  const totalNetReturn = yearFlows.reduce((sum, f) => sum + f.netCashFlow, 0);
  const netProfit = totalNetReturn - upfrontInvestment;
  return totalInvestment > 0 ? netProfit / totalInvestment : 0;
}
```

ROIC is capped at 100% (`MAX_BASE_ROIC`).

**Payback Calculation:**

Payback is computed monthly by dividing each year's net cash flow by 12:

```javascript
function calculatePayback(yearFlows) {
  let cumulative = -upfrontInvestment;
  const maxMonths = DCF_YEARS * 12;
  for (let month = 1; month <= maxMonths; month++) {
    const yearIndex = Math.floor((month - 1) / 12);
    const monthlyNet = yearFlows[yearIndex].netCashFlow / 12;
    cumulative += monthlyNet;
    if (cumulative >= 0) return month;
  }
  return maxMonths + 1; // >60 months
}
```

### 5.8 Scenario Analysis

Three scenarios are computed using multipliers on the savings:

| Scenario | Multiplier | Timeline Adjustment | Probability Weight |
|----------|-----------|--------------------|--------------------|
| Conservative | 0.75 | +30% | 25% |
| Base Case | 1.00 | 0% | 50% |
| Optimistic | 1.25 | -20% | 25% |

```javascript
const scenarioConfigs = {
  conservative: { label: 'Conservative', multiplier: 0.75 },
  base:         { label: 'Base Case',    multiplier: 1.0 },
  optimistic:   { label: 'Optimistic',   multiplier: 1.25 },
};
```

Each scenario gets its own full 5-year cash flow projection, NPV, IRR, ROIC, and payback calculation. The scenario multiplier is applied to both enhancement and headcount savings within `buildYearCashFlows`.

**Probability-weighted expected value:**

```javascript
const scenarioWeights = { conservative: 0.25, base: 0.50, optimistic: 0.25 };
const expectedNPV = Object.entries(scenarioWeights).reduce(
  (sum, [key, weight]) => sum + scenarioResults[key].npv * weight, 0
);
```

### 5.9 Sensitivity Analysis

The sensitivity analysis varies 6 input parameters and measures the impact on full-DCF NPV. Each sensitivity row represents a "what-if" that re-runs the complete 5-year cash flow model with modified parameters.

**The 6 variables:**

| Variable | Low Case | High Case |
|----------|----------|-----------|
| Team Size | -20% | +20% |
| Avg Cost per Person | -20% | +20% |
| Error / Rework Rate | -50% | +50% |
| Automation Potential | -15 pp | +15 pp |
| Implementation Cost | -20% | +50% |
| Ongoing Annual Cost | -50% | +100% |

The core sensitivity function re-runs the DCF with modified values:

```javascript
function sensitivityNPV(modEnhancementRA, modHeadcountRA,
                        modOngoingByYear, modUpfront) {
  const flows = [];
  let cumulativeReduction = 0;
  let cumulativeNet = -modUpfront;
  for (let yr = 0; yr < DCF_YEARS; yr++) {
    const wageGrowth = Math.pow(1 + WAGE_INFLATION_RATE, yr);
    const eSavings = modEnhancementRA * ADOPTION_RAMP[yr] * wageGrowth;
    cumulativeReduction += HEADCOUNT_REDUCTION_SCHEDULE[yr];
    const hSavings = modHeadcountRA * cumulativeReduction * wageGrowth;
    const net = eSavings + hSavings
      - separationByYear[yr] - modOngoingByYear[yr];
    flows.push({ netCashFlow: net });
  }
  let npv = -modUpfront;
  for (let yr = 0; yr < flows.length; yr++) {
    npv += flows[yr].netCashFlow / Math.pow(1 + discountRate, yr + 1);
  }
  return npv;
}
```

For Team Size, Salary, Error Rate, and Automation Potential, the sensitivity function also recalculates displaced FTEs and the split between headcount and efficiency savings (via `valueFromCurrentCost`). For Implementation Cost, it recalculates hidden costs and upfront investment (via `investmentFromImplCost`). For Ongoing Cost, it scales the entire 5-year escalation schedule.

### 5.10 V3 Value Creation Pathways

Beyond the core DCF (which captures cost savings), the calculation engine computes three supplementary value creation pathways:

**Path A: Cost Efficiency (included in DCF).** This is the primary pathway, represented by the risk-adjusted savings already described. An additional concept is "cash realization percentage" -- what fraction of productivity gains actually convert to cash (through headcount reduction or role elimination) versus being absorbed as increased capacity (people stay but do different work). The default is 40%.

**Path B: Capacity Creation (informational by default).** This pathway quantifies the strategic value of freed capacity:

```javascript
const capacityHoursFreed = annualHours * automationPotential * riskMultiplier;
const capacityFTEEquivalent = capacityHoursFreed / 2080;
const revenueAcceleration = annualRevenue > 0 && cycleTimeReductionMonths > 0
  ? (annualRevenue * contributionMargin
     * cycleTimeReductionMonths / 12) * riskMultiplier
  : 0;
```

Capacity creation includes freed hours (valued at hourly rate), FTE equivalents, and revenue acceleration from reduced cycle times. Users can optionally include this in the NPV calculation, but it is excluded by default to maintain conservatism.

**Path C: Risk Reduction (informational by default).** This pathway quantifies the value of reduced regulatory/compliance risk:

```javascript
const expectedLossBefore = regEventProbability * regEventImpact;
const expectedLossAfter = (regEventProbability
  * (1 - aiRiskReductionPct)) * regEventImpact;
const annualRiskReductionValue = expectedLossBefore - expectedLossAfter;
```

For each industry, the model stores the probability of a major regulatory event, its average financial impact, and the estimated reduction in probability from AI-powered compliance monitoring. For example, Financial Services has an 8% annual probability of a $25M regulatory event, and AI can reduce this by 25%, yielding an annual risk reduction value of $500K.

### 5.11 Capital Efficiency Metrics

The calculation engine produces several capital efficiency metrics:

- **Economic Value Added (EVA):** NOPAT minus (invested capital times WACC). Shows whether the project creates value above the cost of capital.
- **Cash-on-Cash Return:** Year 3 (stabilized) net cash flow divided by total investment. A simple metric for comparing to alternative investments.
- **ROIC vs. WACC Spread:** The difference between ROIC and the discount rate. A positive spread indicates value creation.

### 5.12 Gate Structure

The calculation engine models a phased deployment approach with go/no-go gates:

| Gate | Label | Timeline | Investment | Key Threshold |
|------|-------|----------|------------|---------------|
| 1 | Pilot | 0-6 months | 15% | Min 40% automation validated, 50% adoption |
| 2 | Controlled Rollout | 6-12 months | 35% | Min 50% automation, 65% adoption, positive IRR path |
| 3 | Enterprise Scale | 12-36 months | 50% | Min 55% automation, 75% adoption, 5%+ IRR |

Each gate is evaluated against the user's current metrics. If the current automation potential and adoption rate meet the gate's thresholds, the gate is marked as passable. This helps organizations plan phased investment rather than committing the full budget upfront.

---

## 6. Monte Carlo Simulation Engine

This section documents the probabilistic simulation layer added in V2 that transforms the deterministic 3-scenario analysis into a full probability distribution.

### Motivation

The original three-scenario approach (Conservative 0.75x / Base 1.0x / Optimistic 1.25x) provides a useful range but cannot capture the full spectrum of outcomes or the interaction effects between variables. A Monte Carlo simulation addresses this by sampling from probability distributions for each uncertain input, running hundreds of complete DCF calculations, and producing a continuous distribution of outcomes.

### Architecture

The Monte Carlo engine is implemented in two files:

- **`src/utils/statistics.js`** — Pure statistical utility functions (no business logic)
- **`src/logic/monteCarlo.js`** — Simulation orchestration using the existing DCF engine

The simulation runs client-side in the browser. It is loaded via dynamic import (`import('../../logic/monteCarlo')`) to avoid blocking the initial render. The Vite bundler code-splits it into a separate 2.1KB chunk.

### Statistical Distributions

Seven statistical functions are provided in `statistics.js`:

| Function | Algorithm | Use |
|----------|-----------|-----|
| `gaussianRandom(mean, stdDev)` | Box-Muller transform | Normal distribution sampling |
| `lognormalRandom(mean, stdDev)` | `exp(gaussianRandom)` | Right-skewed cost distributions |
| `triangularRandom(low, mid, high)` | Inverse CDF method | Bounded distributions with mode |
| `percentile(sortedArr, p)` | Linear interpolation | P10/P25/P50/P75/P90 extraction |
| `mean(arr)` | Arithmetic mean | Descriptive statistics |
| `stdDev(arr)` | Population standard deviation | Distribution spread |
| `clamp(val, min, max)` | Min/max bounds | Preventing unrealistic values |

### Perturbed Variables

The `sampleDistributions(formData)` function creates a perturbed copy of the user's inputs by sampling 6 key variables:

| Variable | Distribution | Range | Rationale |
|----------|-------------|-------|-----------|
| `automationPotential` | Normal(μ=input, σ=0.08) | [0.10, 0.95] | Core uncertainty in AI capability (independent) |
| `changeReadiness` | Weighted discrete (50% 0, 30% +1, 20% -1) | [1, 5] | Anchoring bias: readiness rarely shifts dramatically mid-project. Correlated with environment shock. |
| `implementationBudget` | Lognormal(μ=shock, σ=0.30) | [0.7x, 1.8x] | Enterprise cost overruns skew right; σ=0.30 reflects wider real-world variance. Correlated with environment shock. |
| `ongoingAnnualCost` | Lognormal(μ=shock, σ=0.35) | [0.5x, 2.0x] | Pricing volatility in AI services. Correlated with environment shock. |
| `cashRealizationPct` | Triangular(0.20, input, 0.80) | [0.20, 0.80] | Political constraints on headcount reduction (independent) |
| `errorRate` | Normal(μ=input, σ=input×0.25) | [0.01, 0.50] | Measurement uncertainty (independent) |

**Structural correlation:** A shared "environment shock" factor (ε ~ Normal(0,1)) links change readiness, implementation budget, and ongoing cost. Negative ε (poor organizational environment) simultaneously degrades readiness and inflates costs, preventing unrealistic combinations like low readiness with below-average costs. Automation potential, cash realization, and error rate remain independent.

Each perturbed copy receives the flag `_mcMode: 'fast'` to enable the fast-mode early return in `calculations.js`.

### Fast Mode

When `inputs._mcMode === 'fast'` is set, the DCF engine returns immediately after computing the three scenario results:

```javascript
if (inputs._mcMode === 'fast') {
  return { scenarios: scenarioResults, upfrontInvestment, totalInvestment, discountRate };
}
```

This skips sensitivity analysis, peer comparison, gate evaluation, value pathways, capital efficiency metrics, and all other post-processing. The result is a reduction from ~10ms to ~1ms per iteration. At 500 iterations, total simulation time is approximately 500ms.

### Output Structure

`runMonteCarlo(formData, 500)` returns:

```javascript
{
  sampleSize: 500,
  npv:     { p5, p10, p25, p50, p75, p90, mean, stdDev },
  irr:     { p10, p25, p50, p75, p90, mean },
  payback: { p10, p25, p50, p75, p90, mean },
  roic:    { p10, p25, p50, p75, p90, mean },
  probabilityPositiveNPV: 0.82,  // fraction of iterations with NPV > 0
  tailRisk: {
    p5Npv: -125000,              // 5th percentile NPV (worst case)
    probCapitalLoss50: 0.08,     // P(NPV < -50% of median upfront investment)
    probPaybackOver60: 0.05,     // P(payback > 60 months)
  },
  npvDistribution: [...],        // sorted array for histogram rendering
}
```

### UI Integration

In `LiveCalculation.jsx`, the Monte Carlo simulation runs as a side effect:

```javascript
const [mcResults, setMcResults] = useState(null);
useEffect(() => {
  let cancelled = false;
  import('../../logic/monteCarlo').then(({ runMonteCarlo }) => {
    if (!cancelled) setMcResults(runMonteCarlo(formData, 500));
  });
  return () => { cancelled = true; };
}, [formData]);
```

The results are displayed in a CollapsibleSection containing: a probability hero box (color-coded green/amber/red), P10/P50/P90 cards, a 20-bin histogram rendered with div bars (no chart library), summary statistics, and a VaR tail risk row (P5 worst case, P(capital loss >50%), P(payback >60 months)).

---

## 7. Enhanced Competitive Erosion

This section documents the V2 enhancement to the opportunity cost of inaction calculation.

### Original Approach

The original `calculateInactionCost()` function used a cost-based competitive penalty: a fixed percentage of total current cost, compounding annually. This worked for organizations without revenue data but underestimated the true competitive risk for revenue-generating businesses.

### Revenue-Based S-Curve Margin Compression

When `annualRevenue > 0`, the enhanced calculation uses a logistic S-curve adoption function:

```javascript
function logisticAdoption(year, terminalRate, k = 1.2, t0 = 2.5) {
  return terminalRate / (1 + Math.exp(-k * (year - t0)));
}
revenueErosion = annualRevenue × marginCompression × logisticAdoption(year, aiAdoptionRate)
```

The S-curve models that competitor AI adoption follows a logistic trajectory rather than linear growth. Early years see slow adoption, years 2-3 hit the inflection point with rapid acceleration, and years 4-5 approach the terminal rate. This produces more realistic erosion patterns than the V1 linear model.

Parameters: `k=1.2` (moderate steepness), `t0=2.5` (inflection at mid-horizon). Source: BCG 2025 technology adoption S-curves; McKinsey 2025 AI diffusion data.

Two benchmark maps provide the industry-specific terminal rates:

| Industry | AI Adoption Rate | Margin Compression | Source |
|----------|-----------------|-------------------|--------|
| Technology / Software | 75% | 4.5% | BCG 2025, McKinsey Q3 2025 |
| Financial Services / Banking | 65% | 3.5% | BCG 2025 |
| Healthcare / Life Sciences | 45% | 2.0% | McKinsey Q3 2025 |
| Manufacturing / Industrial | 50% | 2.5% | BCG 2025 |
| Retail / E-Commerce | 60% | 4.0% | BCG 2025 |
| Professional Services | 55% | 3.5% | BCG 2025 |
| Media / Entertainment | 60% | 4.0% | McKinsey Q3 2025 |
| Energy / Utilities | 35% | 1.5% | BCG 2025 |
| Government / Public Sector | 30% | 1.5% | McKinsey Q3 2025 |

When no revenue is provided, the original cost-based competitive penalty is used as fallback, ensuring backward compatibility.

The enhanced output includes a `competitiveErosion` object in the results with `annualRevenue`, `aiAdoptionRate`, `marginCompression`, `erosionModel` ('logistic-s-curve' or 'linear-cost-penalty'), `revenueBasedErosion` (boolean), and `year5RevenueErosion`.

---

## 8. AI Maturity Premium

This section documents the strategic narrative data added in V2.

### Purpose

Organizations that successfully deploy their first AI project see compounding returns on subsequent deployments through reusable infrastructure, institutional knowledge, and data asset leverage. The maturity premium quantifies this compounding for strategic planning.

### Constants

The `AI_MATURITY_PREMIUM` object in `benchmarks.js` provides:

| Metric | 2nd Deployment | 3rd Deployment |
|--------|---------------|----------------|
| Cost Reduction | 30% | 45% |
| Time Compression | 40% | 55% |
| Model Reusability | 60% | 60% |
| Data Asset Multiplier | 1.5x | 2.25x |

### Deliberate Exclusion from DCF

These values are presented in the UI (as a CollapsibleSection table) and in the PDF report (a dedicated page with strategic narrative) but are **not** included in any NPV, IRR, ROIC, or payback calculation. This is a deliberate design decision: maturity premiums are speculative projections about future deployments and would undermine the credibility of the current project's financial analysis if included in the DCF.

**Industry caveat:** These are cross-industry averages. Highly regulated industries (Healthcare, Financial Services, Government) may see smaller time compression due to compliance review requirements that cannot be shortened regardless of AI maturity. Technology and Retail organizations often exceed these averages. Source: a16z "AI in the Enterprise" 2024, McKinsey 2025.

### Break-Even Adoption Rate

Added in V2.1, the break-even adoption rate is the minimum adoption rate (as a percentage) that produces a positive base-case NPV. It is calculated via binary search over the `buildYearCashFlows` savings multiplier:

1. Binary search over multiplier range [0.01, 3.0] with 25 iterations
2. For each multiplier, compute `calculateNPV(buildYearCashFlows(multiplier))`
3. Find the multiplier where NPV crosses zero
4. Break-even rate = `currentAdoptionRate × breakEvenMultiplier`
5. Returns `null` if break-even requires >99% adoption (infeasible)

This metric helps stakeholders understand: "How much worse can adoption be before the project destroys value?" It is displayed in the Quick Facts UI section, the PDF Monte Carlo page, and the executive summary.

### Industry Cash Realization Defaults

Added in V2.1, the `CASH_REALIZATION_BY_INDUSTRY` constant provides industry-specific base-case defaults for cash realization percentage. Industries with higher natural turnover (Technology, Retail) realize more cash from AI productivity gains, while industries with strong job protections (Government) realize less.

| Industry | Default Cash Realization |
|----------|------------------------|
| Technology / Software | 50% |
| Financial Services | 45% |
| Healthcare / Life Sciences | 30% |
| Retail / E-Commerce | 55% |
| Government / Public Sector | 20% |

Source: BLS JOLTS turnover data 2025, McKinsey workforce restructuring data 2025.

---

## 9. User Interface & Wizard Flow

This section describes the 6-step wizard that collects user inputs, the validation logic, and the state management approach.

### State Management

All form data is stored in a single `useState` hook in `App.jsx`:

```javascript
const DEFAULT_FORM_DATA = {
  // Step 1: Company Context
  industry: '',
  companySize: '',
  role: '',
  teamLocation: '',
  // Step 2: Risk & Readiness
  changeReadiness: 3,
  dataReadiness: 3,
  execSponsor: true,
  // Step 3: Project Archetype & Team Details
  processType: '',
  projectArchetype: '',
  assumptions: {},
  teamSize: 10,
  hoursPerWeek: 20,
  errorRate: 0.10,
  // Step 4: Current Costs
  avgSalary: 100000,
  currentToolCosts: 0,
  vendorsReplaced: 0,
  vendorTerminationCost: 0,
  // Step 5: AI Investment
  implementationBudget: null,
  expectedTimeline: null,
  ongoingAnnualCost: null,
  // Optional
  companyState: 'Other / Not Sure',
};
```

The `formData` object and its setter are passed to `StepWizard` as props. Each step component receives `formData` and an `updateField` callback.

### The 6-Step Wizard

The wizard is controlled by `StepWizard.jsx`, which manages `currentStep` state and renders the appropriate step component with slide animation (Framer Motion):

**Step 1: Company Context.** Collects industry (10 options), company size (5 options), user's role (free text), and team location (8 options). All four fields are required.

**Step 2: Risk & Readiness.** Collects change readiness (1-5 star rating), data readiness (1-5 star rating), and executive sponsor (yes/no toggle). Change and data readiness are required. This step was moved earlier in the flow (from Step 4 in the original design) because readiness values drive the auto-calculated budget and timeline suggestions shown in later steps.

**Step 3: Project Archetype & Team Details.** Collects project archetype (5 card options), team size (numeric), hours per week (numeric), and error/rework rate (slider, 0-50%). When the user selects an archetype, the `assumptions` object is populated with defaults for their industry. All four fields are required.

**Step 4: Review Assumptions.** Displays the computed defaults from the archetype + industry combination. The user can override any value: automation potential, API cost, requests per hour, tool replacement rate, and revenue eligibility. No fields are required (all have defaults).

**Step 5: Current Costs.** Collects average fully-loaded salary (currency input), current annual tool costs (currency input), number of vendors being replaced, and vendor termination costs. Only salary is required.

**Step 6: AI Investment.** Collects implementation budget, expected timeline (months), and ongoing annual cost. All three have auto-suggested defaults computed from the values entered in earlier steps. None are required (null values trigger auto-calculation in the engine).

### Form Validation

Each step has a set of required fields defined in the `REQUIRED_FIELDS` object:

```javascript
const REQUIRED_FIELDS = {
  1: ['industry', 'companySize', 'role', 'teamLocation'],
  2: ['changeReadiness', 'dataReadiness'],
  3: ['projectArchetype', 'teamSize', 'hoursPerWeek', 'errorRate'],
  4: [], // assumptions have defaults
  5: ['avgSalary'],
  6: [], // AI investment has auto-suggested defaults
};
```

The "Next" button is disabled until all required fields for the current step have non-empty, non-zero values. Enter key advances to the next step when validation passes.

### Screen State Machine

`App.jsx` manages four screens as a simple state machine:

```
landing --> wizard --> analyzing --> results
   ^                                    |
   +-------- startOver ----------------+
```

The "analyzing" screen is a brief animated transition (approximately 3 seconds) that shows each calculation step completing. It exists purely for perceived performance -- the actual calculations take less than 50ms.

---

## 10. Excel Model Design

This section documents the 6-tab Excel workbook structure, the formula chain between tabs, and the design rationale.

### Overview

The Excel model is generated client-side using ExcelJS. It produces a `.xlsx` file with 6 worksheets. All calculated cells use real Excel formulas that reference input cells. If a user changes an input value in the Inputs tab, all downstream calculations update automatically.

### Tab Structure

| # | Tab Name | Tab Color | Purpose |
|---|----------|-----------|---------|
| 1 | Inputs | Blue | Editable user inputs with dropdowns |
| 2 | Key Formulas | Green | Calculation chain with cross-tab references |
| 3 | Summary | Navy/Black | Executive overview, scenarios, key assumptions |
| 4 | P&L & Cash Flow | Navy/Black | 5-year DCF, financial metrics, ROIC walkthrough |
| 5 | Sensitivity | Orange | Scenario comparison + tornado + confidence |
| 6 | Lookups | Gray (hidden) | All benchmark reference tables |

### Color Coding

The model uses three color codes consistently:

| Color | Meaning | Cell Background | Font Color |
|-------|---------|----------------|------------|
| Blue | Editable input | Light blue (#DCE6F0) | Navy (#1B2A4A) |
| Green | Calculated formula | Light green (#E2EFDA) | Green (#2E7D32) |
| Black/Navy | Key result/output | Navy (#1B2A4A) | White (#FFFFFF) |

```javascript
const inputFill  = { type: 'pattern', pattern: 'solid',
                     fgColor: { argb: 'FFDCE6F0' } };
const calcFill   = { type: 'pattern', pattern: 'solid',
                     fgColor: { argb: 'FFE2EFDA' } };
const resultFill = { type: 'pattern', pattern: 'solid',
                     fgColor: { argb: 'FF1B2A4A' } };
```

Every cell in the workbook is either an input (blue), a formula (green), or a key output (navy). A color legend row appears at the top of the Inputs tab.

### Tab 1: Inputs

Contains all user-editable values organized into sections: Company Context, Risk & Readiness, Project Details, Current Costs, and AI Investment. Key features:

- Dropdown validation lists for industry, company size, process type, and location (sourced from the Lookups tab)
- Currency-formatted cells for dollar amounts
- Percentage-formatted cells for rates
- Star rating values (1-5) for readiness scores

### Tab 2: Key Formulas

Shows the complete calculation chain with cross-tab references. Each formula cell references the Inputs tab (e.g., `=Inputs!B4*Inputs!B8`) and downstream formulas reference earlier rows on the same tab. Sections include:

- Current State (labor cost, rework, total)
- Risk Adjustments (adoption rate, sponsor, risk multiplier)
- FTE Displacement
- Implementation Cost Model
- Ongoing Cost Model
- Value Breakdown (4 categories)
- Separation Cost Phasing

### Tab 3: Summary

Executive-level overview with key metrics, scenario comparison table, and key assumptions. All values are formula-driven from the Key Formulas tab.

### Tab 4: P&L & Cash Flow

The heart of the financial model. Contains:

- 5-year P&L statement (gross savings, ongoing costs, separation costs, net cash flow by year)
- Discount factor row and present value row
- NPV, IRR, ROIC, and payback calculations
- ROIC walkthrough (step-by-step derivation of the ROIC figure)

The ROIC walkthrough is a particularly important feature. It shows the derivation step by step:

1. Total net cash flows over 5 years (sum of all year net cash flows)
2. Minus upfront investment (to get net profit)
3. Total capital deployed (upfront + all phased separation costs)
4. ROIC = Net Profit / Total Capital Deployed

This transparency allows finance reviewers to verify that ROIC is calculated correctly and understand what it represents. The walkthrough includes cell references back to the P&L rows so every number can be traced.

The P&L is structured with years as columns (Year 1 through Year 5) and line items as rows:

| Line Item | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 |
|-----------|--------|--------|--------|--------|--------|
| Enhancement Savings | formula | formula | formula | formula | formula |
| Headcount Savings | 0 | formula | formula | formula | formula |
| **Gross Savings** | **sum** | **sum** | **sum** | **sum** | **sum** |
| Separation Costs | 0 | formula | formula | formula | formula |
| Ongoing AI Costs | formula | formula | formula | formula | formula |
| **Net Cash Flow** | **diff** | **diff** | **diff** | **diff** | **diff** |
| Discount Factor | formula | formula | formula | formula | formula |
| Present Value | formula | formula | formula | formula | formula |

Enhancement savings in Year 1 reflect the 75% adoption ramp (not full adoption). Headcount savings are zero in Year 1 (enhancement phase only). Separation costs follow the [0, 20%, 25%, 20%, 10%] schedule. Ongoing costs reflect the escalation schedule.

### Tab 5: Sensitivity

Contains four sections:

- **Scenario comparison table:** Conservative, Base, Optimistic side by side
- **Tornado analysis:** 6 variables with low/high NPV impact
- **Confidence intervals:** NPV, payback, and ROIC at p25/p50/p75
- **Monte Carlo simulation summary (V2):** When `mcResults` is available, rows 49-56 display the distribution summary for NPV, IRR, ROIC, and Payback at P10/P25/P50/P75/P90 percentiles, plus probability of positive NPV. Static values from the simulation (not formulas, since MC runs in JavaScript).

### Tab 6: Lookups (Hidden)

Contains all benchmark reference tables used by VLOOKUP formulas throughout the workbook:

- Automation potential matrix (10 industries x 8 process types)
- Industry benchmarks (success rates, competitive penalties, revenue uplift)
- Readiness multipliers
- Company size master table (11 columns of size-specific parameters)
- AI team salary by location
- Process type parameters (API cost, requests/hour, tool replacement rate)
- State R&D credit rates
- Model constants
- Year-by-year schedules
- Separation cost breakdown
- Peer benchmarks (50 industry-size combinations)
- Regulatory event benchmarks

This tab is hidden by default but can be unhidden by the user for audit purposes.

### Print-Friendly Design

Each tab is configured for fit-to-width printing:

```javascript
function printSetup(ws) {
  ws.pageSetup = { fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
}
```

### Why Certain Tabs Were Removed

The original Excel model had 11 tabs. The redesign reduced this to 6 by eliminating:

- **Guide tab:** Replaced by the color legend and inline notes
- **Dashboard tab:** Merged into Summary
- **Opportunity Cost tab:** Removed from Excel (still shown in web UI and PDF)
- **Revenue & Scale tab:** Revenue enablement is informational only and not in the DCF, so it was removed to avoid implying it affects NPV
- **Sources tab:** Source citations are in the PDF report and Lookups tab notes

The goal was to produce a workbook that a CFO could review in a single sitting without navigating 11 tabs.

---

## 11. PDF Report Generation

This section documents the PDF report structure, content, and generation approach.

### Overview

The PDF report is generated client-side using jsPDF with the jspdf-autotable plugin for table layout. It produces an A4-formatted document branded with navy and gold colors.

### Technology

```javascript
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
```

The report uses consistent brand constants:

```javascript
const NAVY = [26, 58, 107];
const GOLD = [201, 162, 39];
const PAGE_W = 210; // A4 width mm
const PAGE_H = 297; // A4 height mm
const MARGIN = 20;
```

### Report Sections

The PDF report includes the following sections, each starting on a new page:

1. **Cover page.** Title, date, assessment ID (unique identifier), and confidentiality notice.

2. **Executive Summary.** Key metrics (NPV, ROIC, payback, expected NPV), the recommendation verdict (STRONG/MODERATE/CAUTIOUS/WEAK), and a summary of recommended next steps.

3. **Current State Analysis.** Annual labor cost, rework cost, tool costs, total cost baseline, and team composition details.

4. **AI Cost Model.** Implementation cost breakdown (engineering, PM, infrastructure, training), ongoing cost breakdown (AI headcount, API, licenses, compliance, insurance, etc.), and the budget gap analysis.

5. **Value Creation Breakdown.** The four savings categories (headcount, efficiency, error reduction, tool replacement) shown as both gross and risk-adjusted values.

6. **5-Year DCF Projection.** Year-by-year table showing enhancement savings, headcount savings, separation costs, ongoing costs, net cash flow, and cumulative position. Includes NPV, IRR, ROIC, and payback.

7. **Scenario Comparison.** Side-by-side comparison of Conservative, Base, and Optimistic scenarios with probability-weighted expected values.

8. **Sensitivity Analysis.** Tornado chart data showing NPV impact of each variable at low and high cases.

9. **Hidden Costs.** Breakdown of change management, cultural resistance, data cleanup, integration testing, and productivity dip.

10. **Methodology & Sources.** Description of the calculation methodology and the 31 research sources cited throughout.

11. **Monte Carlo Simulation (V2).** Probability hero box (green/amber/red by threshold), distribution summary table (P10-P90 for NPV, IRR, ROIC, Payback), 20-bar histogram of NPV distribution rendered via `drawRoundedRect`, and methodology note. Only rendered when `mcResults` is available.

12. **Case Study: Mid-Market Financial Services (V2).** Synthetic case study illustrating a representative 50-analyst, $120K salary, 60% automation scenario. Shows scenario parameters, model outputs (NPV, IRR, Payback, ROIC across 3 scenarios), real-world benchmark comparison, and key insights.

13. **AI Maturity Premium (V2).** Deployment-over-deployment improvements table (cost reduction, time compression, model reusability, data asset multiplier for 1st/2nd/3rd deployments). Strategic narrative paragraphs on infrastructure leverage, organizational learning, data asset appreciation, and model reusability. Explicit note that these values are not in the DCF.

### Formatting Details

Every page includes:
- A gold line at the top (0.8pt weight)
- A footer with the disclaimer "Confidential -- For Directional Guidance Only -- Not Financial or Investment Advice" and a page number
- Section titles in 14pt navy bold with a 40mm gold underline

Tables use jspdf-autotable with alternating row colors (white and light gray) and navy header rows.

### Recommendation Verdict

The PDF report includes a recommendation verdict generated by `recommendations.js`. The verdict is one of four levels:

| Verdict | Condition |
|---------|-----------|
| STRONG | Conservative scenario NPV > 0 (profitable even in worst case) |
| MODERATE | Base case NPV > 0 but conservative NPV < 0 |
| CAUTIOUS | Only optimistic scenario NPV > 0 |
| WEAK | All three scenario NPVs are negative |

Each verdict comes with a headline, narrative summary, and a prioritized list of recommended next steps. The recommendation engine also generates risk mitigations specific to the user's profile (e.g., "Consider a phased pilot to validate the 60% automation assumption before full deployment").

### Data Dependencies

The report receives `formData`, `results` (from `runCalculations`), `recommendation` (from `getRecommendation`), and `mcResults` (from `runMonteCarlo`, may be null) as parameters. The report now produces 24 pages including 3 new pages added in V2. It formats all currency values using utility functions that handle millions/thousands abbreviation and percentage formatting.

### Formatting Utilities

The PDF and UI share formatting utilities from `formatters.js`:

- `formatCurrency(value)`: Formats numbers as `$1,234,567`
- `formatPercent(value)`: Formats decimals as `42.0%`
- `generateAssessmentId()`: Creates a unique identifier for each report (e.g., `AI-ROI-2026-02-A7X`)
- `formatCompactValue(value)`: Abbreviates large numbers (`$1.2M`, `$450K`)

These utilities handle edge cases including null values, NaN, negative numbers, and very small or very large values.

---

## 12. API & Data Persistence

This section documents the REST API, database schema, authentication model, and deployment configuration.

### API Framework

The API is built with Hono, a lightweight TypeScript web framework. It runs on Node.js and is deployed to Railway.

```javascript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { nanoid } from 'nanoid';
import { sql, initDatabase } from './db.js';

const app = new Hono();
```

### CORS Configuration

CORS is configured to allow requests from the frontend origins:

```javascript
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://ai-roi-modeler.vercel.app',
];
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : defaultOrigins;
```

### Rate Limiting

In-memory rate limiting is applied to all POST endpoints at 60 requests per minute per IP:

```javascript
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}
```

The rate limiter resets on server restart because it uses an in-memory Map. This is a known limitation documented in Section 15.

### Database Schema

Two tables in PostgreSQL:

**models table:**

```sql
CREATE TABLE IF NOT EXISTS models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token VARCHAR(10) UNIQUE NOT NULL,
  form_data JSONB NOT NULL,
  industry VARCHAR(100),
  company_size VARCHAR(100),
  process_type VARCHAR(100),
  project_archetype VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_share_token
  ON models(share_token) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_created_at
  ON models(created_at DESC) WHERE deleted_at IS NULL;
```

**leads table:**

```sql
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  industry VARCHAR(100),
  company_size VARCHAR(100),
  source VARCHAR(50) DEFAULT 'report_download',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
```

Key design decisions:

- **JSONB for form_data.** Stores the complete `formData` object as flexible JSON. Individual columns (`industry`, `company_size`, etc.) are denormalized for query convenience.
- **Soft delete.** The `deleted_at` column enables soft delete. All queries filter `WHERE deleted_at IS NULL`. No data is permanently removed.
- **UUID primary keys.** Generated by PostgreSQL's `gen_random_uuid()`. Prevents enumeration attacks.
- **Partial indexes.** Both indexes filter on `deleted_at IS NULL` so they remain compact.

### Share Token Mechanism

When a model is saved, a 7-character token is generated using nanoid:

```javascript
const shareToken = nanoid(7);
```

This produces tokens like `Xk9_vQr` that are URL-safe. The share URL format is `https://ai-roi-modeler.vercel.app/share/{token}`. Anyone with the URL can view the model. There is no authentication.

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/models` | Save a new model, returns id + shareToken |
| GET | `/api/models/:id` | Load model by UUID |
| PUT | `/api/models/:id` | Update model by UUID |
| DELETE | `/api/models/:id` | Soft delete model |
| GET | `/api/share/:token` | Load model by share token (public) |
| POST | `/api/leads` | Capture lead from report download |
| GET | `/health` | Health check |

All write endpoints return appropriate HTTP status codes (201 for creation, 200 for update, 404 for not found, 400 for validation errors, 429 for rate limit exceeded, 500 for server errors).

### Fallback URL Sharing

When the API is unavailable (network error, server down), the system falls back to hash-based URL sharing. The formData is base64-encoded and appended to the URL as a hash fragment:

```javascript
function encodeFormData(data) {
  const compact = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== DEFAULT_FORM_DATA[k] && v !== '' && v !== null
        && v !== 0 && v !== false) {
      compact[k] = v;
    }
  }
  return btoa(JSON.stringify(compact));
}
```

Only fields that differ from defaults are included in the encoded payload, keeping URLs manageable. This fallback ensures sharing works even without server connectivity, though the URLs are longer and less user-friendly than the API-based 7-character tokens.

### Lead Capture

The leads endpoint supports a lightweight email capture flow. When users download a PDF report, they may be prompted to provide their email address. The lead record stores:

- Email (required, validated with regex)
- Name (optional)
- Industry (optional, from formData)
- Company size (optional, from formData)
- Source (defaults to `report_download`)

Email validation is performed server-side: `!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)`. This is a basic format check, not a deliverability check.

### Deployment Configuration

**Frontend (Vercel):** The React app is deployed as a static site on Vercel. The `vercel.json` configuration handles SPA routing (all paths serve `index.html`) and proxies API requests.

**API (Railway):** The Hono server runs on Railway with a managed PostgreSQL instance. The `railway.toml` configuration specifies the build command and start command. The database connection URL is provided via the `DATABASE_URL` environment variable.

---

## 13. Benchmark Data & Sources

This section documents all benchmark constants used in the model, their sources, and their limitations.

### Research Sources

The model cites 31 research sources, all documented in the `BENCHMARK_SOURCES` array in `benchmarks.js`. The key sources are:

| # | Short Citation | Data Used |
|---|---------------|-----------|
| 1 | McKinsey 2025 | Automation potential (60-70% of time), adoption rates (78% of enterprises) |
| 2 | IBM 2023 | ROI benchmarks ($3.50 per $1 invested, 5.9% average enterprise ROI) |
| 3 | Gartner 2024 | Project success rate (48% reach production) |
| 4 | MIT/RAND | Failure rates (70-85% fail to meet expectations) |
| 5 | Deloitte 2026 | Enterprise AI maturity (70% have <30% experiments in production) |
| 6 | Bloomberg 2024 | Severance data ($40K average, Russell 3000) |
| 7 | Glassdoor 2026 | AI engineer salaries (US average $175,816) |
| 15 | SHRM 2025 | Total separation cost (1.0x-1.5x annual salary) |
| 16 | Forrester 2024 | Tool replacement rates (40-65%), legacy maintenance creep |
| 17 | BLS 2025 | Wage inflation (4.0% annually) |
| 18 | BCG 2025 | Revenue uplift (5-15%), competitive penalty |
| 20 | a16z 2024 | AI cost curves (sub-linear scaling), value realization phases |
| 22 | Forrester 2025 | Vendor lock-in costs (30-60% of implementation) |
| 26 | Damodaran 2025 | WACC by company lifecycle (8-18%) |

### Key Benchmark Tables

**Automation Potential Matrix (10 industries x 8 process types):**

Values range from 0.20 (Government / Content Creation) to 0.65 (Technology / Workflow Automation). All values were reduced by 10 percentage points from original estimates to align with observed enterprise deployment rates rather than theoretical maximums.

**Industry Success Rates:**

| Industry | Success Rate |
|----------|-------------|
| Technology / Software | 0.72 |
| Retail / E-Commerce | 0.68 |
| Financial Services / Banking | 0.65 |
| Professional Services / Consulting | 0.64 |
| Manufacturing / Industrial | 0.62 |
| Media / Entertainment | 0.60 |
| Healthcare / Life Sciences | 0.58 |
| Energy / Utilities | 0.55 |
| Other | 0.55 |
| Government / Public Sector | 0.45 |

**Discount Rate by Company Size (WACC Proxy):**

| Size | Discount Rate |
|------|--------------|
| Startup (1-50) | 18% |
| SMB (51-500) | 14% |
| Mid-Market (501-5,000) | 10% |
| Enterprise (5,001-50,000) | 9% |
| Large Enterprise (50,000+) | 8% |

Source: Damodaran 2025 -- WACC ranges from 8% for large-cap mature companies to 18%+ for early-stage startups.

**AI Team Salary by Location:**

| Location | Fully-Loaded Annual Cost |
|----------|------------------------|
| US - Major Tech Hub | $215,000 |
| US - Other | $155,000 |
| UK / Western Europe | $150,000 |
| Canada / Australia | $140,000 |
| Remote / Distributed | $145,000 |
| Eastern Europe | $80,000 |
| Latin America | $55,000 |
| India / South Asia | $40,000 |

Includes a 1.23-1.60x multiplier over base salary for benefits, taxes, and overhead.

**Return Ceilings:**

| Metric | Floor | Cap |
|--------|-------|-----|
| ROIC | -100% | 100% |
| IRR | -100% | 75% |

These caps prevent the model from producing unrealistic projections. The 100% ROIC cap aligns with IBM's finding that top-performing AI projects return $3.50 per $1 invested (approximately 117% annualized over 3 years), which represents the upper bound of realistic per-project returns.

### How Benchmark Values Were Derived

**Automation potential values** were derived from McKinsey's task-level automation analysis, then reduced by 10 percentage points to reflect observed enterprise deployment rates rather than theoretical capability. The rationale: McKinsey reports 60-70% of employee time is theoretically automatable, but Gartner finds only 48% of AI projects reach production, and Deloitte reports 70% of companies have moved fewer than 30% of experiments to production. The gap between theoretical potential and realized potential is substantial.

The original automation potential matrix used values ranging from 30% to 75%. These were uniformly reduced to 20% to 65% to better reflect observed rates. The code comments this explicitly: "Automation potential reduced by 10pp across the board (max 65%). Original values were 30-75%, now 20-65% -- closer to McKinsey task automation rates."

**Industry success rates** were derived from aggregated data across McKinsey, IBM, and Deloitte surveys, with technology industries showing the highest rates (72%) and government the lowest (45%), reflecting regulatory complexity, procurement bureaucracy, and institutional inertia.

**Separation cost multipliers** are derived from SHRM's 2025 total cost of separation analysis. The multiplier represents total separation cost as a fraction of annual salary, inclusive of severance pay (55%), benefits continuation / COBRA (15%), outplacement services (12%), administrative processing (10%), and legal review (8%). The multiplier ranges from 0.70x for startups (less formal packages) to 1.50x for large enterprises (more generous packages, stricter legal requirements). Bloomberg's 2024 analysis of Russell 3,000 companies corroborates average severance of approximately $40,000 per employee with a 72% increase in severance generosity from 2020 to 2025.

**AI team salaries** represent fully-loaded annual costs (salary plus benefits, payroll taxes, and overhead). The loading factor ranges from 1.23x (US tech hubs) to 1.60x (India/South Asia). These are based on Glassdoor 2026 salary data for AI/ML engineers, Alcor BPO 2025 for offshore locations, and cross-referenced with Motion Recruitment 2026 and Qubit Labs 2026 for European and Latin American markets.

**API cost benchmarks** are based on 2025-2026 enterprise pricing for major LLM providers: GPT-4o ($5/$15 per 1M tokens), Claude Opus 4.5 ($5/$25 per 1M tokens), and Gemini 2.5 Pro ($1.25/$10 per 1M tokens). Costs are converted to per-1,000-requests assuming typical token counts per request for each process type (e.g., document processing averages 4,000 tokens per request, customer communication averages 1,000 tokens).

**Vendor lock-in costs** are based on Forrester's 2025 research on AI vendor switching costs. The analysis found that switching costs average 30-60% of the initial implementation investment, with larger organizations facing higher switching costs due to deeper integration, more data migration, and longer parallel running periods. The annual cost escalation schedule (12% for Years 1-2, 7% for Years 3-5) reflects the typical pattern where AI vendors raise prices aggressively during the initial lock-in period, then moderate increases as competition and alternatives mature.

### Limitations of Benchmark Data

- All benchmark values are static snapshots. They are not dynamically updated from live data sources. As AI capabilities rapidly evolve, these values will become outdated.
- The automation potential matrix uses a single value per industry-process combination. In reality, automation potential varies significantly within an industry depending on the specific organization's data quality, process maturity, and use case complexity.
- Salary benchmarks represent fully-loaded costs, but the loading factor varies by geography and benefit structure. The model uses approximate multipliers.
- The 75% headcount reduction cap is a policy decision, not an empirical finding. Some processes may be fully automatable; others may resist automation beyond 30%. The cap prevents extreme projections but may under- or over-state reality for specific cases.

---

## 14. Testing & Validation

This section documents the test strategy, test fixtures, key test categories, and what is not tested.

### Test Infrastructure

Tests use Vitest (a Vite-native test runner) and run against the pure calculation functions. There are 234 tests across 6 test files:

| File | Tests | Coverage |
|------|-------|----------|
| `calculations.test.js` | 147 | Core calculation engine |
| `benchmarks.test.js` | 31 | Benchmark data integrity and lookup functions |
| `recommendations.test.js` | 13 | Verdict engine (STRONG/MODERATE/CAUTIOUS/WEAK) |
| `formatters.test.js` | 13 | Currency and percentage formatting |
| `statistics.test.js` | 19 | Statistical distribution functions (V2) |
| `monteCarlo.test.js` | 11 | Monte Carlo simulation engine (V2) |

All 234 tests pass. Total execution time is approximately 200ms.

### Test Fixtures

Six standard input profiles are defined in `testFixtures.js`:

**BASE_INPUTS:** Mid-market technology company with moderate readiness (changeReadiness=3, dataReadiness=3). 20-person team, $85K salary, 40 hours/week, 15% error rate, $50K tool costs, $200K budget, Internal Process Automation archetype. This is the primary profile used in most tests.

**STARTUP_INPUTS:** Small startup (5 people, $70K salary) with poor readiness (changeReadiness=2, dataReadiness=2, no exec sponsor). Tests minimum-viable and pessimistic scenarios.

**ENTERPRISE_INPUTS:** Large enterprise financial services (100 people, $120K salary, $2M budget) with strong readiness. Risk & Compliance archetype. Tests high-scale scenarios and enterprise-specific parameters.

**GOVERNMENT_INPUTS:** Large enterprise government (50 people, $75K salary) with the worst-case readiness profile (changeReadiness=1, dataReadiness=1, no exec sponsor). Tests the most conservative scenario the model can produce.

**NON_US_INPUTS:** UK/Western Europe team. Tests that R&D tax credits are correctly excluded for non-US locations.

**REVENUE_ELIGIBLE_INPUTS:** Customer Communication process type with $10M annual revenue. Tests revenue enablement eligibility logic.

### Key Test Categories

**Current State (4 tests).** Verifies basic arithmetic: labor cost = teamSize x salary, rework = labor x errorRate, total = labor + rework + tools, hourly = salary / 2080.

**One-Time Transition Costs (7 tests).** Verifies separation cost calculations: multiplier by company size, displaced FTEs = round(team x automation x adoption), total separation = displaced x salary x multiplier. Tests that separation is excluded from upfront investment (it is phased over Years 2-5).

**Value Breakdown (6 tests).** Verifies all four savings categories have gross and riskAdjusted properties, that riskAdjusted <= gross, that totalGross equals sum of categories, that headcount savings = displacedFTEs x avgSalary, and that tool replacement uses the assumptions.toolReplacementRate.

**Scenario Analysis (7 tests).** Verifies ordering invariant (conservative < base < optimistic for NPV and ROIC; reverse for payback), that each scenario has all required properties, that 5-year projections have 5 entries, and that caps are enforced (ROIC <= 100%, IRR <= 75%).

**Probability-Weighted Expected Value (3 tests).** Verifies expectedNPV and expectedROIC match the weighted average of scenarios, and that weights sum to 1.0.

**AI Cost Model (5 tests).** Verifies location-specific salary, that realistic implementation cost >= user budget, that ongoing cost >= user ongoing cost, that implementation team respects company-size caps, and that retraining/tech debt/insurance are included.

**Sensitivity Analysis (3 tests).** Verifies 3 basic sensitivity scenarios exist, 6 extended sensitivity rows, and that each row has npvLow and npvHigh.

**Archetype & Assumptions (10 tests).** Verifies that assumptions.automationPotential overrides benchmark lookup, that assumptions.toolReplacementRate overrides, that revenueEligible controls revenue pathway, that backward compatibility works (old processType-only inputs with no assumptions), and that all 5 archetypes produce valid results. A representative test:

```javascript
it('backward compat: old processType-only inputs still work', () => {
  const oldStyle = {
    industry: 'Technology / Software',
    companySize: 'Mid-Market (501-5,000)',
    processType: 'Document Processing',
    teamSize: 20, avgSalary: 85000,
    hoursPerWeek: 40, errorRate: 0.15,
    currentToolCosts: 50000, changeReadiness: 3,
    dataReadiness: 3, execSponsor: true,
    expectedTimeline: 6, implementationBudget: 200000,
    ongoingAnnualCost: 50000,
    teamLocation: 'US - Major Tech Hub',
    companyState: 'California',
  };
  const r = runCalculations(oldStyle);
  expect(r.currentState.totalCurrentCost).toBeGreaterThan(0);
  expect(r.scenarios.base.npv).toBeDefined();
  expect(isFinite(r.scenarios.base.npv)).toBe(true);
  expect(r.benchmarks.automationPotential).toBe(0.60);
  expect(r.valueBreakdown.toolReplacement.gross).toBe(50000 * 0.55);
});
```

This test is critical because it proves that models saved before the archetype migration produce the same results. It verifies that the fallback path (using processType benchmarks directly when no assumptions object is present) works correctly.

**Extreme Inputs (3 tests).** Verifies boundary conditions that could cause mathematical errors:

- `teamSize=1`: Ensures single-person teams produce valid results without division-by-zero or negative FTE displacement errors.
- `errorRate=0`: Ensures zero rework cost cascades correctly through the model (error reduction savings should be zero, total current cost should equal labor plus tools only).
- `teamSize=1000`: Ensures the model remains bounded at scale. ROIC must not exceed 100%, IRR must not exceed 75%, and displaced FTEs must not exceed 750 (75% of 1000).

**V3 Value Pathways (6 tests).** Verifies the three value creation pathways introduced in V3:

- Cost efficiency pathway ties to risk-adjusted savings
- Capacity creation pathway computes freed hours correctly (`annualHours x automationPotential x riskMultiplier`)
- Risk reduction pathway uses industry-specific regulatory event benchmarks
- Revenue acceleration is zero when no annual revenue is provided, positive when it is
- costOnlyAnnual exactly matches the cost efficiency pathway's risk-adjusted value

**Scenario Ordering Invariants (4 tests).** Verifies mathematical ordering that must always hold:

```javascript
it('conservative NPV <= base NPV <= optimistic NPV', () => {
  const r = runCalculations(BASE_INPUTS);
  expect(r.scenarios.conservative.npv)
    .toBeLessThanOrEqual(r.scenarios.base.npv);
  expect(r.scenarios.base.npv)
    .toBeLessThanOrEqual(r.scenarios.optimistic.npv);
});
```

These ordering tests catch subtle bugs where scenario multipliers might interact with other parameters in unexpected ways. They run across multiple input profiles (BASE, ENTERPRISE) to verify the invariant holds broadly.

**Executive Summary (7 tests).** Verifies the executive summary output object has all expected properties, that simpleROI matches the manual calculation `(totalGrossSavings - totalInvestment) / totalInvestment`, that topLevers has exactly 3 items sorted by NPV swing descending, and that the summary works across all input profiles.

**grossAnnualSavings Reconciliation (4 tests).** A critical integrity check: `grossAnnualSavings` (the sum used in the DCF) must exactly equal `valueBreakdown.totalGross` (the decomposed sum of the four categories). This is verified across all four input profiles:

```javascript
it('grossAnnualSavings equals valueBreakdown.totalGross', () => {
  const r = runCalculations(BASE_INPUTS);
  expect(r.savings.grossAnnualSavings)
    .toBeCloseTo(r.valueBreakdown.totalGross, 2);
});
```

This reconciliation catches any case where savings are double-counted or omitted during decomposition.

### What Is NOT Tested

**UI components.** React components are not unit tested. The wizard steps, result visualizations, landing page, and input components have no automated tests. Testing was conducted manually during development. The rationale: the UI is a presentation layer over pure calculation functions; testing the calculations thoroughly covers the high-risk logic. UI testing would require React Testing Library or Cypress, which adds complexity with modest incremental confidence.

**Excel generation.** The `generateExcelModel.js` file is not tested. Excel output has been verified manually by opening generated files in Microsoft Excel and Google Sheets and checking that formulas recalculate correctly. Automated testing would require parsing the `.xlsx` output, which is complex and fragile.

**PDF generation.** The `generateReport.js` file is not tested. PDF output has been verified manually by visual inspection. Automated testing would require PDF parsing or visual regression testing.

**API endpoints.** The Hono API has no automated tests. Endpoints were tested manually during development using `curl` and browser dev tools. An integration test script (`test-integration.mjs`) exists for ad-hoc verification.

**End-to-end flows.** There are no E2E tests covering the full user journey from landing page through wizard to results to Excel/PDF download. This is a gap that could be addressed with Playwright or Cypress.

---

## 15. What It Does vs. What It Doesn't

This section provides an honest assessment of the system's capabilities and limitations.

### What It Does

**Produces auditable, formula-driven financial models.** Every number in the Excel output traces back to an input cell through a chain of Excel formulas. Stakeholders can verify every step of the calculation.

**Risk-adjusts all projections.** Every savings figure is multiplied by a blended risk factor. The tool never presents an unadjusted "best case" as the primary output. The base case already includes risk discounting.

**Handles 10 industries, 5 company sizes, 5 archetypes.** The combination of 10 industries, 5 company sizes, and 5 project archetypes provides 250 distinct default profiles, each with industry-specific automation potential, success rates, cost parameters, and peer benchmarks.

**Generates live Excel models that recalculate when inputs change.** Unlike PDF reports or static spreadsheets, the Excel model uses real formulas. Users can change any input (team size, salary, automation potential, etc.) and see all downstream calculations update immediately.

**Provides 3 scenarios with probability weighting.** Conservative (0.75x savings, 25% weight), Base (1.0x, 50% weight), and Optimistic (1.25x, 25% weight) provide a range of outcomes. The probability-weighted expected value gives a single "most likely" NPV.

**Sensitivity analysis on 6 key variables.** The tornado analysis identifies which inputs have the greatest impact on NPV, helping stakeholders focus due diligence on the variables that matter most. The sensitivity variables are: automation potential, team size, average salary, implementation cost, ongoing AI cost, and discount rate.

**Runs 500-iteration Monte Carlo simulation.** Six *different* input variables are perturbed across probability distributions (normal, lognormal, triangular), and the full DCF engine runs for each combination. The Monte Carlo variables are: automation potential, change readiness, implementation budget, ongoing annual cost, cash realization percentage, and error rate. Note: the sensitivity tornado and Monte Carlo analyses deliberately use different (partially overlapping) variable sets — sensitivity tests direct input levers CFOs can control, while Monte Carlo captures environmental uncertainty and organizational factors that are harder to predict. This captures interaction effects between variables that the deterministic sensitivity analysis cannot.

**Revenue-based competitive erosion.** When annual revenue is provided, the opportunity cost of inaction uses industry-specific AI adoption rates and margin compression data rather than a simple cost-based penalty. This produces more realistic projections for revenue-generating organizations.

**AI maturity premium narrative.** Strategic context on the compounding benefits of successive AI deployments (30-45% cost reduction, 40-55% time compression on 2nd and 3rd projects). Deliberately excluded from the DCF to maintain conservative projections.

**Backward compatible with old process-type data.** Models saved before the archetype migration continue to work. The calculation engine falls back to process-type benchmark lookups when archetype assumptions are not present.

### What It Doesn't Do (Explicit Non-Goals)

**Does NOT predict actual AI performance.** The model uses industry benchmark averages, not machine learning predictions. It cannot account for the specific characteristics of a particular AI model, dataset, or use case. A 50% automation potential for "Document Processing in Financial Services" is a benchmark estimate, not a prediction for a specific bank's specific documents.

**Does NOT account for qualitative benefits.** Employee satisfaction, innovation culture, talent attraction, competitive positioning, and brand perception are all potentially significant impacts of AI adoption. The model does not quantify these because they are inherently subjective and difficult to defend in a financial review.

**Does NOT model multi-project portfolios.** The tool evaluates one AI project at a time. It cannot model the interaction effects between multiple AI initiatives (shared infrastructure, compounding learning, portfolio diversification of risk).

**Does NOT integrate with actual financial systems.** There is no connection to ERP, accounting, HRIS, or other enterprise systems. All inputs are manually entered.

**Does NOT provide legal or compliance advice.** The model includes compliance cost estimates but does not assess whether a specific AI implementation complies with GDPR, CCPA, SOX, HIPAA, or any other regulation.

**Does NOT guarantee results.** All projections are estimates based on industry benchmarks and user-provided inputs. Actual results will vary. The disclaimer on every PDF page states: "For Directional Guidance Only -- Not Financial or Investment Advice."

**Revenue enablement is informational only.** Revenue uplift estimates (time to market, customer experience, new capabilities) are shown but deliberately excluded from NPV and ROIC to maintain conservative projections. Including speculative revenue in the DCF would undermine credibility with finance teams. The code explicitly documents this decision:

```javascript
// REVENUE ENABLEMENT (informational - NOT in NPV/ROIC to stay conservative)
// Only computed when user provides annualRevenue - no speculative proxies
```

Revenue enablement is only calculated when (a) the archetype is customer-facing or revenue-growth, and (b) the user has provided their annual revenue. The model will not speculate about revenue when no revenue figure is provided. Even when calculated, revenue uplift is further discounted by a 50% "revenue risk discount" on top of the normal risk adjustment, reflecting the highly speculative nature of revenue projections from AI investments.

**Does NOT model custom AI architectures or specific vendor pricing.** API costs use blended averages across major providers (GPT-4o, Claude, Gemini). Actual costs depend on model selection, token volumes, and negotiated enterprise pricing.

### Known Limitations

**Benchmark data is static.** The benchmark values embedded in `benchmarks.js` are point-in-time estimates. They are not updated dynamically. AI capabilities and costs are changing rapidly; benchmarks from 2025 may not reflect 2027 reality.

**In-memory rate limiting resets on server restart.** The rate limiter uses a JavaScript Map that is lost when the server process restarts. This means a restart effectively clears rate limit state. For the current scale, this is acceptable. At higher scale, a Redis-backed rate limiter would be appropriate.

**No user authentication.** Share tokens are unguarded. Anyone with a 7-character share URL can view the model. There is no login, no access control, and no audit trail of who viewed a shared model.

**Excel model formulas may not be 100% identical to JS calculations due to rounding.** The JavaScript engine and ExcelJS use IEEE 754 double-precision floating point. Intermediate rounding decisions (when to `toFixed(2)`, when to `Math.round`) may cause minor discrepancies between the web-displayed results and the Excel model results. In testing, differences are typically less than $1 on any individual value.

**Sensitivity analysis and Monte Carlo use different variable sets.** The sensitivity tornado varies 6 direct input levers (automation potential, team size, salary, implementation cost, ongoing cost, discount rate) one at a time. The Monte Carlo varies 6 different environmental/organizational variables (automation potential, change readiness, implementation budget, ongoing cost, cash realization, error rate) simultaneously with structural correlation. This is deliberate — sensitivity tests what CFOs can control, while Monte Carlo captures environmental uncertainty. However, the two analyses are not directly comparable and may suggest different risk profiles.

**Separation costs use a single multiplier.** Total separation cost is modeled as a multiple of annual salary (0.70x to 1.50x depending on company size). In reality, separation costs vary significantly by role, tenure, jurisdiction, and negotiation. The model does not account for these individual-level variations.

---

## 16. Design Decisions & Trade-offs

This section explains the reasoning behind key architectural and methodological decisions.

### Why Browser-Based Computation

All calculations run in the user's browser. The server is used only for saving and loading models. This decision was driven by:

- **Simplicity.** No server-side calculation infrastructure to scale, monitor, or maintain.
- **Privacy.** Sensitive financial data (team sizes, salaries, budgets) never leaves the user's browser unless they explicitly save the model.
- **Performance.** The calculation engine completes in under 50ms. There is no benefit to server-side execution.
- **Offline capability.** Once the page is loaded, the calculation engine works without a network connection (save/share requires connectivity).

The trade-off: there is no server-side validation of calculations. If a bug is shipped in the JavaScript calculation engine, incorrect results will be served until the next deployment. Comprehensive testing (234 tests) mitigates this risk.

### Why Formula-Driven Excel

The Excel model uses real Excel formulas (e.g., `=Inputs!B4*Inputs!B8`) rather than computed static values. This was the single most requested feature from early stakeholders:

- **Auditability.** Finance teams can click any cell and trace the formula chain back to inputs. They do not need to trust opaque calculations.
- **What-if analysis.** Users can change inputs in the Excel file and see all downstream values recalculate. This is particularly valuable for scenario planning beyond the three built-in scenarios.
- **Credibility.** A formula-driven model carries more weight in budget approval processes than a static report.

The trade-off: generating formula-driven Excel is significantly more complex than writing static values. The `generateExcelModel.js` file is approximately 500 lines of ExcelJS code, much of it constructing cross-tab formula references. Formula syntax must match Excel's expectations exactly. Any formula error breaks the entire model.

### Why DCF Over Simpler Payback Models

Discounted cash flow analysis was chosen over simpler metrics (simple ROI, payback period only) because:

- **Time value of money.** A dollar saved in Year 5 is worth less than a dollar saved today. DCF discounts future cash flows at a rate appropriate to the company's cost of capital. This matters significantly for startups (18% discount rate) vs. large enterprises (8%).
- **Multi-year cost dynamics.** Implementation costs occur upfront, separation costs phase over 4 years, ongoing costs escalate, savings ramp up. DCF naturally handles these dynamics; simple ROI does not.
- **CFO credibility.** Finance teams expect DCF analysis for capital allocation decisions. Presenting a simple payback period without NPV would be insufficient for most approval processes.

The trade-off: DCF requires more inputs (discount rate, timeline, cost escalation assumptions) and is harder for non-financial users to understand. The model mitigates this by auto-calculating most of these parameters and providing executive-friendly summary metrics alongside the DCF details.

### Why 5 Archetypes (Not 3 or 7)

Five archetypes balance specificity with usability:

- **3 archetypes** (e.g., "Internal," "External," "Risk") would be too broad. The default assumptions would be too generic to be useful.
- **7+ archetypes** would reintroduce the usability problem we observed with 8 process types: user confusion about which category applies.
- **5 archetypes** cover the major strategic categories (operations, customer, analytics, revenue, compliance) without forcing users to over-specify.

Each archetype maps to 2-3 process types, providing enough specificity for meaningful benchmark defaults while remaining comprehensible to non-technical users.

### Why Risk-Adjust Everything (The "Honest Broker" Approach)

Every savings figure in the model is multiplied by the risk multiplier before being included in the DCF. This is a deliberate design choice:

- AI project failure rates are high (70-85% fail to meet expectations per MIT/RAND).
- The tool's credibility depends on not being perceived as an AI "hype calculator."
- Finance teams will apply their own skepticism discounts; if the model already accounts for risk, the double-discounting effect is reduced.
- Presenting risk-adjusted figures as the default positions the tool as a conservative, trustworthy analysis rather than an optimistic pitch.

### Why 3 Scenarios with 25/50/25 Weighting

The three-scenario approach (Conservative, Base, Optimistic) with 25%/50%/25% probability weights follows standard financial modeling practice:

- **Three scenarios** capture downside, expected, and upside without the complexity of continuous distributions.
- **25/50/25 weighting** gives the base case 50% weight (it is the most likely outcome), with equal 25% weight to upside and downside. This produces a slightly optimistic expected value (because the Optimistic multiplier of 1.2x is asymmetric with the Conservative 0.7x), which is intentional -- projects that are funded generally have some basis for optimism.

### Why Soft Delete for Saved Models

The API uses soft delete (`deleted_at` timestamp) rather than hard delete:

- **Data recovery.** Accidental deletions can be reversed by clearing the `deleted_at` column.
- **Analytics.** Soft-deleted records remain available for aggregate analysis of model usage patterns.
- **Audit trail.** The existence of a deleted record is itself a data point.

The trade-off: database storage grows monotonically. For the current scale (low thousands of models), this is not a concern. At high scale, a periodic archival process would be needed.

### Why nanoid for Share Tokens

The share token is a 7-character nanoid string. This was chosen over alternatives:

- **UUID (36 chars):** Too long for a shareable URL.
- **Sequential integer:** Enumerable (attacker can try model IDs 1, 2, 3...).
- **nanoid(7):** 128 billion possible values (64^7 effective keyspace with URL-safe alphabet). Short enough for sharing, large enough to be impractical to enumerate.

---

## 17. Future Considerations

This section outlines potential enhancements that are not currently planned but would add significant value.

### Multi-Project Portfolio Modeling

Currently, the tool evaluates one AI project at a time. Organizations typically have multiple AI initiatives competing for budget. A portfolio view would allow users to:

- Model 3-5 projects simultaneously
- Compare NPV, ROIC, and payback across projects
- Identify shared infrastructure costs (amortized across projects)
- Assess portfolio-level risk diversification (if one project fails, others may succeed)

This would require a project collection data model and UI for cross-project comparison.

### Dynamic Benchmark Updates

Benchmark values are currently static constants in `benchmarks.js`. As AI capabilities and costs evolve rapidly, these values will become outdated. A dynamic update mechanism could:

- Pull updated benchmarks from a curated data source
- Allow administrators to update benchmark values without code deployment
- Version benchmark datasets so models can be compared under different benchmark assumptions
- Display the benchmark version date alongside projections

### User Authentication and Saved Dashboards

The current system has no authentication. Adding user accounts would enable:

- Saving multiple models to a personal dashboard
- Comparing models over time (re-run quarterly, track how assumptions change)
- Access control on shared models (view-only vs. edit)
- Usage analytics per user and organization

### ~~Monte Carlo Simulation~~ (Completed in V2)

Monte Carlo simulation was implemented in V2 and enhanced in V2.1. The engine runs 500 correlated iterations with 6 perturbed variables across normal, lognormal, and triangular distributions. V2.1 added structural correlation via shared environment shock (ε), VaR/tail risk metrics (P5, probability of capital loss, probability of payback >60mo), weighted change readiness perturbation (anchoring bias), and wider implementation budget variance (σ=0.30). See Section 6 for full documentation.

Potential future enhancements to the Monte Carlo engine:
- Increase to 5,000-10,000 iterations for smoother distributions
- Add user-configurable distribution parameters (let users specify their own uncertainty ranges)
- Implement Sobol or Latin Hypercube sampling for more efficient coverage

### Integration with Financial Planning Tools

Exporting to Excel is a pragmatic first step. Deeper integrations could include:

- Direct export to financial planning platforms (Anaplan, Adaptive Insights)
- Integration with project management tools (Jira, Asana) for timeline tracking
- Webhook notifications when models are shared or updated
- API for programmatic model creation (batch analysis)

### Custom Archetype Creation

Currently, users must choose from 5 predefined archetypes. A custom archetype feature would allow users to:

- Select their own combination of process types
- Manually set all default assumptions
- Save custom archetypes for reuse across models
- Share custom archetypes within an organization

### Historical Tracking

The most powerful validation of any ROI model is comparing projected outcomes against actual results. Historical tracking would:

- Allow users to re-run a model quarterly with updated actuals
- Track projected vs. actual savings, costs, timeline, and adoption
- Identify where the model over- or under-estimates
- Use actuals data to improve benchmark accuracy over time

This is arguably the most valuable future feature. Without actuals tracking, the model produces projections that are never verified. With it, the model becomes a living financial instrument that improves its accuracy over time.

### Improved Sensitivity: Interaction Effects

The deterministic sensitivity analysis varies one variable at a time while holding all others constant. The V2 Monte Carlo simulation partially addresses interaction effects by varying 6 variables simultaneously, but does not yet provide:

- Bivariate sensitivity heat maps (vary pairs explicitly)
- Identification of the most impactful variable pairs
- Contribution-to-variance analysis (which variable explains the most NPV spread)
- "Worst realistic case" where the 3 most impactful variables all move adversely simultaneously

### Enhanced Excel Model Features

Potential enhancements to the Excel model:

- **Data validation with error messages:** When users enter values outside valid ranges, show explanatory messages
- **Named ranges:** Replace cell references with named ranges for readability (`=TeamSize*AvgSalary` instead of `=B4*B8`)
- **Conditional formatting:** Highlight cells that exceed benchmark thresholds or trigger warnings
- **Chart sheets:** Add embedded charts for the 5-year cash flow waterfall and scenario comparison
- **VBA macros (optional):** For users who want automated scenario switching or parameter reset to defaults

### Multi-Currency Support

The model currently assumes all values are in a single currency (implicitly USD). Organizations with global operations may need:

- Currency selection per input field
- Exchange rate assumptions
- Currency-adjusted salary benchmarks
- Multi-currency consolidated NPV

---

## Appendix A: Complete Formula Reference

| # | Formula Name | Mathematical Formula | Code Reference | Excel Cell |
|---|-------------|---------------------|----------------|------------|
| 1 | Hourly Rate | `avgSalary / 2080` | `calculations.js:107` | `'Key Formulas'!B[row]` |
| 2 | Annual Labor Cost | `teamSize x avgSalary` | `calculations.js:108` | `=Inputs!B4*Inputs!B8` |
| 3 | Annual Rework Cost | `annualLaborCost x errorRate` | `calculations.js:111` | `=KF!B2*Inputs!B7` |
| 4 | Total Current Cost | `labor + rework + toolCosts` | `calculations.js:112` | `=KF!B2+KF!B3+Inputs!B9` |
| 5 | Adoption Rate | `ADOPTION_MULTIPLIERS[changeReadiness]` | `calculations.js:123` | `=VLOOKUP(Inputs!B5,Lookups!A29:B33,2)` |
| 6 | Sponsor Adjustment | `execSponsor ? 1.0 : 0.85` | `calculations.js:124` | `=IF(Inputs!B6="Yes",1,0.85)` |
| 7 | Org Readiness | `adoptionRate x sponsorAdjust` | `calculations.js:131` | `=KF!B5*KF!B6` |
| 8 | Risk Multiplier | `(orgReadiness + industrySuccess) / 2` | `calculations.js:132` | `=(KF!B7+KF!B8)/2` |
| 9 | Raw Displaced FTEs | `round(teamSize x automation x adoption)` | `calculations.js:142` | `=ROUND(Inputs!B4*KF!B9*KF!B5,0)` |
| 10 | Max Displaced | `floor(teamSize x 0.75)` | `calculations.js:143` | `=FLOOR(Inputs!B4*0.75,1)` |
| 11 | Displaced FTEs | `min(rawDisplaced, maxDisplaced)` | `calculations.js:144` | `=MIN(KF!B10,KF!B11)` |
| 12 | Scope Min Engineers | `max(1, ceil(teamSize / 12))` | `calculations.js:171` | `=MAX(1,CEILING(Inputs!B4/12,1))` |
| 13 | Impl Engineering Cost | `engineers x salary x years` | `calculations.js:184` | `=KF!B14*KF!B15*KF!B16` |
| 14 | Impl PM Cost | `PMs x (salary x 0.85) x years` | `calculations.js:185` | `=KF!B17*(KF!B15*0.85)*KF!B16` |
| 15 | Impl Infra Cost | `(eng + PM) x 0.12` | `calculations.js:186` | `=(KF!B13+KF!B14)*0.12` |
| 16 | Impl Training Cost | `(eng + PM) x 0.08` | `calculations.js:187` | `=(KF!B13+KF!B14)*0.08` |
| 17 | Computed Impl Cost | `eng + PM + infra + training` | `calculations.js:188` | `=SUM(KF!B13:B16)` |
| 18 | Realistic Impl Cost | `max(userAdjusted, computed)` | `calculations.js:189` | `=MAX(KF!B18,KF!B17)` |
| 19 | Monthly API Volume | `team x hours x 4.33 x reqPerHour` | `calculations.js:197` | Formula chain |
| 20 | Annual API Cost | `(volume/1000) x costPerK x 12` | `calculations.js:200` | Formula chain |
| 21 | Base Ongoing Cost | `max(userOngoing, computedOngoing)` | `calculations.js:219` | `=MAX(Inputs!B12,KF!B21)` |
| 22 | Headcount Savings | `displacedFTEs x avgSalary` | `calculations.js:365` | `=KF!B11*Inputs!B8` |
| 23 | Efficiency Savings | `max(0, labor x automation - headcount)` | `calculations.js:366` | `=MAX(0,KF!B2*KF!B9-KF!B22)` |
| 24 | Error Reduction | `reworkCost x automation` | `calculations.js:367` | `=KF!B3*KF!B9` |
| 25 | Tool Replacement | `toolCosts x toolReplRate` | `calculations.js:368` | `=Inputs!B9*KF!B25` |
| 26 | Gross Savings | `head + eff + error + tool` | `calculations.js:374` | `=SUM(KF!B22:B25)` |
| 27 | Risk-Adjusted Savings | `grossSavings x riskMultiplier` | `calculations.js:375` | `=KF!B26*KF!B8` |
| 28 | Separation Cost/FTE | `avgSalary x separationMultiplier` | `calculations.js:271` | Formula chain |
| 29 | Total Separation | `displacedFTEs x sepCostPerFTE` | `calculations.js:272` | Formula chain |
| 30 | Upfront Investment | `implCost + hidden + oneTime` | `calculations.js:354` | `=KF!B18+KF!B30+KF!B31` |
| 31 | Total Investment | `upfront + totalSeparation` | `calculations.js:357` | `=KF!B30+KF!B29` |
| 32 | NPV | `-upfront + SUM(CF/(1+r)^t)` | `calculations.js:466-472` | `=-PL!B1+NPV(rate,CF1:CF5)` |
| 33 | ROIC | `(totalNetReturn - upfront) / totalInvest` | `calculations.js:531-535` | Formula chain |
| 34 | Expected NPV | `cons x 0.25 + base x 0.50 + opt x 0.25` | `calculations.js:577-579` | `=SE!B2*0.25+SE!B3*0.5+SE!B4*0.25` |

---

## Appendix B: Benchmark Data Tables

### B.1 Automation Potential Matrix

| Industry | DocProc | CustComm | DataAnalysis | Research | Workflow | Content | QualComp | Other |
|----------|---------|----------|-------------|----------|----------|---------|----------|-------|
| Technology / Software | 60% | 50% | 55% | 45% | 65% | 40% | 50% | 40% |
| Financial Services | 55% | 45% | 50% | 40% | 55% | 35% | 60% | 35% |
| Healthcare | 45% | 35% | 40% | 45% | 40% | 25% | 50% | 30% |
| Manufacturing | 50% | 40% | 45% | 35% | 60% | 30% | 55% | 35% |
| Retail / E-Commerce | 55% | 60% | 50% | 40% | 60% | 45% | 45% | 40% |
| Professional Services | 50% | 40% | 45% | 50% | 45% | 40% | 40% | 35% |
| Media / Entertainment | 45% | 50% | 40% | 45% | 45% | 50% | 35% | 35% |
| Energy / Utilities | 45% | 40% | 45% | 35% | 50% | 25% | 55% | 30% |
| Government | 40% | 30% | 35% | 30% | 35% | 20% | 45% | 25% |
| Other | 45% | 40% | 40% | 35% | 45% | 30% | 40% | 30% |

### B.2 Company Size Parameters

| Parameter | Startup | SMB | Mid-Market | Enterprise | Large Enterprise |
|-----------|---------|-----|------------|------------|------------------|
| Size Multiplier | 0.70 | 0.85 | 1.00 | 1.30 | 1.60 |
| Discount Rate (WACC) | 18% | 14% | 10% | 9% | 8% |
| Max Impl Team | 3 | 5 | 10 | 15 | 25 |
| Separation Multiplier | 0.70x | 1.00x | 1.15x | 1.30x | 1.50x |
| Platform License | $12K | $24K | $48K | $96K | $180K |
| Legal/Compliance | $25K | $50K | $100K | $175K | $300K |
| Security Audit | $20K | $40K | $75K | $125K | $200K |
| Annual Compliance | $8K | $15K | $30K | $60K | $100K |
| Cyber Insurance | $2K | $5K | $12K | $25K | $50K |
| Vendor Switching | 30% | 35% | 40% | 50% | 60% |
| Severance Weeks | 4 | 8 | 10 | 12 | 12 |

### B.3 Process Type Parameters

| Process Type | API $/1K Requests | Requests/Hour | Tool Replacement Rate |
|-------------|-------------------|---------------|----------------------|
| Document Processing | $20 | 12 | 55% |
| Customer Communication | $8 | 25 | 45% |
| Data Analysis & Reporting | $15 | 8 | 50% |
| Research & Intelligence | $25 | 6 | 40% |
| Workflow Automation | $5 | 30 | 65% |
| Content Creation | $20 | 10 | 45% |
| Quality & Compliance | $12 | 15 | 50% |
| Other | $10 | 12 | 40% |

### B.4 Readiness Multipliers

| Level | Adoption Rate | Timeline Multiplier | Cost Multiplier |
|-------|--------------|-------------------|-----------------|
| 1 (Very Low) | 40% | 1.40x | 1.30x |
| 2 (Low) | 55% | 1.25x | 1.20x |
| 3 (Moderate) | 70% | 1.10x | 1.10x |
| 4 (High) | 85% | 1.00x | 1.00x |
| 5 (Very High) | 95% | 0.90x | 1.00x |

### B.5 Year-by-Year Schedules

| Year | HR Reduction | Cumulative HR | Adoption Ramp | Cost Escalation | Cumulative Escalation |
|------|-------------|---------------|--------------|-----------------|----------------------|
| 1 | 0% | 0% | 75% | 0% | 1.000 |
| 2 | 20% | 20% | 90% | 12% | 1.120 |
| 3 | 25% | 45% | 100% | 12% | 1.254 |
| 4 | 20% | 65% | 100% | 7% | 1.342 |
| 5 | 10% | 75% | 100% | 7% | 1.436 |

### B.6 Model Constants

| Constant | Value | Source |
|----------|-------|--------|
| DCF Years | 5 | Standard practice |
| Max Headcount Reduction | 75% | Engineering judgment |
| Contingency Rate | 20% | PMI |
| Cultural Resistance Rate | 12% | McKinsey Change 2025 |
| Wage Inflation Rate | 4% | BLS 2025 |
| Legacy Maintenance Creep | 7% | Forrester 2024 |
| Model Retraining Rate | 7% | IDC 2025 |
| Retained Retraining Rate | 3% | SHRM 2025 |
| Tech Debt Rate | 5% | IDC 2025 |
| Adjacent Product Rate | 25% | Forrester 2024 |
| Revenue Risk Discount | 50% | Conservative haircut |
| R&D Qualification Rate | 65% | IRS guidance |
| Federal R&D Credit Rate | 6.5% | IRS Section 41 |
| Max ROIC Cap | 100% | IBM 2023 benchmark |
| Max IRR Cap | 75% | Research-backed ceiling |
| Change Management Rate | 15% | McKinsey Change 2025 |
| Infrastructure Cost Rate | 12% | Industry standard |
| Training Cost Rate | 8% | Industry standard |
| PM Salary Factor | 0.85x | Market data |
| Effective Tax Rate | 21% | US corporate rate |

### B.7 Separation Cost Breakdown

| Component | Percentage | Source |
|-----------|-----------|--------|
| Severance Pay | 55% | SHRM 2025 |
| Benefits Continuation (COBRA) | 15% | SHRM 2025 |
| Outplacement Services | 12% | SHRM 2025 |
| Administrative / HR Processing | 10% | SHRM 2025 |
| Legal Review per Separation | 8% | SHRM 2025 |

---

## Appendix C: API Endpoint Reference

### POST /api/models

Save a new model.

**Request:**
```json
{
  "formData": {
    "industry": "Technology / Software",
    "companySize": "Mid-Market (501-5,000)",
    "projectArchetype": "internal-process-automation",
    "teamSize": 20,
    "avgSalary": 85000,
    ...
  }
}
```

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "shareToken": "Xk9_vQr"
}
```

**Errors:** 400 (invalid formData), 429 (rate limited), 500 (server error)

---

### GET /api/models/:id

Load a model by UUID.

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "shareToken": "Xk9_vQr",
  "formData": { ... },
  "industry": "Technology / Software",
  "companySize": "Mid-Market (501-5,000)",
  "processType": "Document Processing",
  "projectArchetype": "internal-process-automation",
  "createdAt": "2026-02-01T12:00:00Z",
  "updatedAt": "2026-02-01T12:00:00Z"
}
```

**Errors:** 404 (not found or soft-deleted), 500 (server error)

---

### PUT /api/models/:id

Update a model by UUID.

**Request:**
```json
{
  "formData": { ... }
}
```

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "shareToken": "Xk9_vQr"
}
```

**Errors:** 400 (invalid formData), 404 (not found), 500 (server error)

---

### DELETE /api/models/:id

Soft delete a model. Sets `deleted_at` to current timestamp.

**Response (200):**
```json
{
  "success": true
}
```

**Errors:** 404 (not found or already deleted), 500 (server error)

---

### GET /api/share/:token

Load a model by 7-character share token. This is the public endpoint used when someone opens a shared URL.

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "shareToken": "Xk9_vQr",
  "formData": { ... },
  "industry": "Technology / Software",
  "companySize": "Mid-Market (501-5,000)",
  "processType": "Document Processing",
  "projectArchetype": "internal-process-automation",
  "createdAt": "2026-02-01T12:00:00Z"
}
```

**Errors:** 404 (not found or soft-deleted), 500 (server error)

---

### POST /api/leads

Capture a lead from the report download flow.

**Request:**
```json
{
  "email": "user@example.com",
  "name": "Jane Doe",
  "industry": "Technology / Software",
  "companySize": "Mid-Market (501-5,000)",
  "source": "report_download"
}
```

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Errors:** 400 (invalid email), 429 (rate limited), 500 (server error)

---

### GET /health

Health check endpoint.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-02-01T12:00:00.000Z"
}
```

---

### Rate Limiting

All POST endpoints are rate limited to 60 requests per minute per IP address. The IP is extracted from the `x-forwarded-for` or `x-real-ip` header. If the limit is exceeded, the API returns HTTP 429 with the message "Too many requests. Please try again later."

### CORS

The API accepts requests from configured origins only. Default allowed origins are `localhost:5173`, `localhost:4173`, and `ai-roi-modeler.vercel.app`. Additional origins can be configured via the `CORS_ORIGINS` environment variable (comma-separated).

---

*End of document.*
