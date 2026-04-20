# AI ROI Calculator

> **Honest projections, not vendor fantasies.**
> A decision-grade financial model for AI investments — built by an M&A executive, not by a vendor trying to close a sale.

**Live:** [ai-roi-modeler.vercel.app](https://ai-roi-modeler.vercel.app)

---

## Why This Exists

Most AI ROI calculators are sales tools. They promise 300% returns, hide the implementation risks, ignore the 70% of AI projects that fail to reach production, and never mention the change-management cost of displacing people who do the work today.

This one doesn't. It's built to answer the question a CFO actually asks: **"Will this investment clear our cost of capital, and what's the downside?"**

- 5-year discounted cash flow (DCF) analysis across three scenarios
- Risk-adjusted NPV, IRR, ROIC, and payback — not gross "savings"
- Monte Carlo simulation (500 iterations) with P10/P50/P90 confidence bands
- Industry-specific failure rates baked into the model
- Every output traceable to a dated, cited benchmark source
- **No account required. No email gate. No sales call.**

---

## The 6 Project Archetypes

Real AI investments fall into six distinct economic patterns. The model detects which one applies and loads the right cost structure, value drivers, and risk profile:

| # | Archetype | What it looks like | Example |
|---|---|---|---|
| 1 | **Internal Process Automation** | Document handling, back-office workflows, data entry | JPMorgan COiN loan processing |
| 2 | **Customer-Facing AI** | Support chatbots, sales agents, personalization | Klarna's AI assistant |
| 3 | **Data Analytics & FP&A** | Reporting, forecasting, financial close, reconciliation | Siemens FP&A modernization |
| 4 | **Revenue & Growth AI** | Sales intelligence, market research, targeting | Salesforce Einstein |
| 5 | **Risk, Compliance & Legal AI** | Contract review, AML monitoring, audit trails | HSBC AML monitoring |
| 6 | **Knowledge Management AI** | Enterprise search, onboarding, institutional memory | Novo Nordisk onboarding |

Each archetype has its own automation-potential ceiling, error-rate baseline, revenue eligibility, and 8 archetype-specific inputs (e.g., "claims processed per month" for compliance, "tickets per month" for customer-facing).

---

## What You Get

### On-Screen Results
- **Executive scorecard:** 5-FY ROIC, payback period, net return with color-coded verdict
- **Scenario toggle:** Conservative / Base / Optimistic — see the whole picture, not just the sales pitch
- **"What Drives This Result?":** top 3 levers ranked by NPV swing
- **FY-by-FY breakdown:** 5-year cash flows with cumulative totals
- **Volume Sensitivity table** — how volume changes affect NPV
- **Provider comparison widget** — "what if you chose Claude instead of OpenAI?" (only appears when the delta is material)
- **Tornado chart sensitivity** — which variables matter most
- **Break-even unit economics** — what input thresholds must you clear?
- **Capital-allocation comparison** — AI vs hiring vs outsourcing vs doing nothing
- **Monte Carlo distribution** with probability of positive NPV
- **Peer benchmarking** — your percentile rank against industry data

### Downloadable Artifacts
- **PDF report** (up to 24 pages, tier-dependent) — board-ready, fully sourced, includes Appendix C with the complete token cost discount waterfall
- **Excel model** — real formulas (not static values) so stakeholders can change inputs and watch everything recalculate. Includes a dedicated **Model Audit** tab with 40+ conditional checks.

---

## The Token Cost Model

Most ROI tools ignore the fact that AI has a real, ongoing unit cost that scales with usage. This one doesn't.

### Pick Your Provider

Choose from four major AI providers — each with dated, MSRP-sourced rates for economy / standard / premium tiers:

| Provider | Economy | Standard | Premium |
|---|---|---|---|
| **Anthropic** | Haiku 4.5 · $1 / $5 | Sonnet 4.6 · $3 / $15 | Opus 4.7 · $5 / $25 |
| **OpenAI** | GPT-4o-mini · $0.15 / $0.60 | GPT-4o · $2.50 / $10 | o3 · $10 / $40 |
| **Google** | Flash 2.0 · $0.10 / $0.40 | Gemini 2.5 Pro · $0.50 / $3 | Gemini 3 Pro · $0.50 / $3 |
| **xAI** | Grok 4.1 Fast · $0.20 / $0.50 | Grok 4 · $3 / $15 | Grok 3 · $3 / $15 |

*Rates per 1M tokens, input / output, retrieved April 2026. These are published MSRP — enterprise discounts are applied separately.*

### The Discount Waterfall

The model walks the cost from list price down to effective rate, transparently:

```
MSRP (published list price)
  × (1 − enterprise volume discount)   ← based on company size
  × contract commitment discount         ← monthly / annual / multi-year
  = Base rate
  × (1 − caching rate × 90%)             ← input tokens only
  = Effective rate
```

Enterprise volume discounts by company size:

| Size | Discount |
|---|---|
| Startup (1-50) | 0% — pay list |
| SMB (51-500) | 5% |
| Mid-Market (501-5,000) | 15% |
| Enterprise (5,001-50,000) | 25% |
| Large Enterprise (50,000+) | 35% |

The waterfall is rendered inline in the UI, in Appendix C of the PDF, and on the Excel assumptions sheet — with the dated source footnote attached.

---

## Methodology Highlights

- **Risk-adjusted savings.** Every savings projection is multiplied by a blended risk factor derived from organizational readiness (change readiness × sponsor support × data readiness) and industry success rate. Optimism is bounded.
- **Adoption ramp.** No AI delivers full value on day one. The model phases value realization over 8 quarters with user-editable curves.
- **Hidden cost model.** Cultural resistance (15%), data cleanup (30-65% of build cost), productivity dip during transition, retained talent premium, vendor lock-in, model drift, tech debt, cyber insurance escalation, and severance/separation costs — all modeled, all sourced.
- **Competitive erosion.** Late adopters face 2-5% annual margin compression (BCG 2025). Baked into the "cost of doing nothing" calculation.
- **R&D tax credit.** Federal 6.5% Section 41 credit plus state credits. Only claimed when work qualifies.
- **No revenue assumptions without eligibility.** Cost efficiency is always modeled. Revenue acceleration is only claimed for customer-facing and revenue/growth archetypes, and only when the user provides annual revenue and contribution margin.

---

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Framer Motion
- **Backend:** Hono (TypeScript), PostgreSQL — optional, only for save/share
- **Reports:** jsPDF + jspdf-autotable (PDF), ExcelJS (spreadsheet)
- **Testing:** Vitest (1,185 tests as of latest commit)
- **Hosting:** Vercel (frontend), Railway (API)

---

## Development

```bash
# Clone and install
git clone https://github.com/jjshay/ai-roi-modeler.git
cd ai-roi-modeler
npm install

# Run dev server
npm run dev
# → http://localhost:5173

# Run tests
npm test

# Build production bundle
npm run build
```

Optional API (for save/share functionality):

```bash
cd api
npm install
export DATABASE_URL="postgres://..."
npm run dev
```

---

## Project Structure

```
src/
├── App.jsx                          # Wizard state + step orchestration
├── components/
│   ├── LandingPage.jsx
│   ├── StepWizard.jsx               # 5-step flow container
│   ├── steps/                       # Step1-5 wizard components
│   ├── inputs/                      # Shared form controls
│   ├── results/
│   │   ├── LiveCalculation.jsx      # Main results page
│   │   ├── RiskRegister.jsx
│   │   ├── BoardActions.jsx
│   │   └── ...
│   └── providerLogos.js             # Shared logo lookup
├── logic/
│   ├── calculations.js              # The calculation engine (2.2K lines)
│   ├── benchmarks.js                # Single source of truth for all benchmarks
│   ├── archetypes.js                # 6 archetype definitions
│   ├── archetypeInputs.js           # Archetype-specific input schemas
│   ├── monteCarlo.js                # 500-iteration simulation
│   └── __tests__/                   # 1,000+ model tests
├── pdf/
│   └── generateReport.js            # PDF generator
├── excel/
│   └── generateExcelModel.js        # Excel generator (10 tabs)
└── utils/
    ├── outputTier.js                # Role-based output tier config
    ├── formatters.js
    └── statistics.js

public/
└── logos/                           # Provider logo SVGs

docs/
├── AI_ROI_Modeler_Technical_Paper.md   # Deep technical reference (2,500+ lines)
└── STRATEGY.md                          # Product strategy and positioning
```

---

## Testing

The test suite covers every archetype, every scenario, every pricing path, and every benchmark table.

```bash
npm test                                            # full suite (1,185 tests)
npm test -- --run src/logic/__tests__/full-audit.test.js   # 150-scenario sweep
npm test -- --run src/logic/__tests__/v5-features.test.js  # token/provider/agent
```

Notable test files:
- `full-audit.test.js` — runs every archetype × company size × provider combination (150 scenarios) and asserts waterfall math, scenario ordering, headcount reconciliation, and bounds checks
- `all-archetypes-audit.test.js` — summary table with NPV/IRR/ROIC/Payback for each archetype
- `modelAudit-actual.test.js` — generates a real Excel buffer and inspects the Model Audit sheet rows
- `breakage.test.js` — stress tests with extreme inputs (team of 1, massive salaries, etc.)
- `sanity-check.test.js` — ordering and monotonicity assertions

---

## Documentation

- **[Technical Reference Paper](docs/AI_ROI_Modeler_Technical_Paper.md)** — 2,500+ lines covering calculation formulas, Monte Carlo design, competitive erosion, AI maturity premium, and complete benchmark tables
- **[Strategy & Positioning](docs/STRATEGY.md)** — why this tool exists, who it's for, and how it's different
- **Appendix C** inside every PDF export — 4 schedules showing the complete cost assumption tables with cited sources

---

## Benchmarks & Sources

All benchmarks are sourced from **48 industry references** including McKinsey, Deloitte, Gartner, IBM, SHRM, Forrester, BCG, BLS, BCG, Bain, Capgemini, PwC, KPMG, Stanford HAI, and provider-published pricing pages. Every citation includes a retrieval date.

The `BENCHMARK_SOURCES` table in `src/logic/benchmarks.js` is the single source of truth. Every benchmark used in the model is footnoted with a numeric reference to that table, and the PDF Appendix B renders the full citation list.

---

## Contributing

Bug reports and pull requests welcome. Please:

1. Run `npm test` before submitting — the suite is fast (~2s) and catches most regressions
2. Keep benchmark changes in `benchmarks.js` — don't hardcode numbers elsewhere
3. Update the relevant test when adding a new calculation path

---

## License

Proprietary — see LICENSE file.

---

## Author

**JJ Shay** · 15+ years M&A experience · MIT AI Executive Program · [Global Gauntlet AI](https://globalgauntletai.com)

Built because every other AI ROI calculator I saw was a sales tool. If you're evaluating an AI investment and want an honest second opinion, this is for you.
