# Strategic Summary

**Document:** Product strategy and market positioning
**Version:** 1.0
**Date:** April 2026
**Status:** Stakeholder review

---

## Executive Summary

The AI ROI Calculator is a decision-grade financial model that helps executives, boards, and M&A professionals evaluate AI investments with the same rigor they would apply to any other capital allocation decision.

It was built in response to a specific market failure: **the existing AI ROI calculators are sales tools, not decision tools.** They are produced by vendors, consultants, and platform companies whose commercial interest is biased toward saying "yes." The result is a predictable pattern — breathless 300% returns, implementation costs understated by an order of magnitude, failure rates omitted entirely, and ongoing costs hidden in footnotes.

This tool takes the opposite stance. It is designed to be an **honest broker** — conservative by default, transparent about assumptions, and structurally incapable of producing a number without also producing the downside case and the sensitivity around it.

**Who it's for:** CFOs evaluating capital requests. Boards reviewing major initiatives. M&A professionals doing diligence on AI-forward acquisition targets. Corporate development teams prioritizing a portfolio of AI bets. Internal champions who need to defend a project to a skeptical finance function.

**Who it's not for:** Vendors trying to close a sale. Consultants trying to justify an engagement fee. Anyone looking for confirmation rather than analysis.

---

## Problem Statement

### The ROI industry has a credibility problem

Three patterns appear in virtually every vendor-produced ROI model we reviewed:

1. **Survivorship bias.** Case studies only reference the 20-30% of AI projects that succeed. The 70-80% that fail, stall, or deliver below expectations are invisible. *(MIT/RAND research 2022-2024)*
2. **Cost understatement.** Implementation costs are framed as platform + integration, excluding change management (10-15%), data cleanup (30-65% of build), cultural resistance (15%), and the productivity dip during transition (up to 6 months).
3. **Optimistic adoption curves.** Most vendor models assume 100% adoption on day one, or a linear ramp to 100% within a year. Real adoption follows an S-curve and plateaus below 100% — typically 75-85% for knowledge worker tools *(Worklytics 2025)*.

The downstream effect: projects get approved on bad numbers, fail to deliver the promised returns, and contribute to the industry-wide skepticism that now haunts new AI initiatives. 73% of enterprises report struggling to scale AI beyond pilots *(HBR 2025)*.

### What's missing from the market

- **Risk-adjustment built into the math, not tacked on.** Every savings projection should be multiplied by a blended risk factor — not "add 20% contingency at the end."
- **Scenario triangulation.** A single-number ROI is meaningless. Users need Conservative / Base / Optimistic with probability weighting.
- **Dated, sourced benchmarks.** "Industry data shows..." is not a citation. Every assumption needs a retrieval date and a source URL.
- **Transparent unit economics.** AI has a real, ongoing per-token cost that scales with usage. Most models abstract this into a single "ongoing cost" line item and hide the math.
- **Auditable outputs.** The decision-maker should be able to trace every dollar in the final NPV back to a specific input and a specific formula. The Excel model has to work when the CFO's analyst changes an assumption.

---

## Solution

### Principles

1. **Conservative by default.** Defaults favor the skeptic. Users can opt into more optimistic assumptions but must do so explicitly.
2. **Every number traces to a source.** The `BENCHMARK_SOURCES` table in the code base is the single source of truth, with 48 cited references. PDF Appendix B renders the complete list.
3. **Transparent unit economics.** Token costs are modeled from published MSRP down through a four-step discount waterfall (enterprise volume discount → contract commitment → prompt caching) to an effective rate. Every step is shown.
4. **Failure is a first-class variable.** Industry success rates are applied as a multiplier. A project that the model says returns $2M base is already a risk-weighted number — not a before-risk figure.
5. **Browser-side, no account required.** Zero-friction access. The tool cannot extract value from user data because it doesn't have user data.

### Architecture

- **Pure-client calculation engine.** All math runs in the browser. No server dependency for the core model. This eliminates a class of trust concerns ("what are they doing with my inputs?") and keeps the infrastructure simple.
- **Optional backend for save/share.** Users who want to save a model or share a URL can opt in. The backend stores the inputs only.
- **Single source of truth for benchmarks.** One file (`src/logic/benchmarks.js`) contains every benchmark used in every surface — UI, PDF, Excel. Updating one constant propagates everywhere.
- **Structured archetype model.** Six distinct economic patterns (Internal Process, Customer-Facing, Data Analytics, Revenue & Growth, Risk/Compliance/Legal, Knowledge Management) each with archetype-specific inputs and value drivers. The model picks the right structure based on what the user is actually doing.

---

## Differentiation

### Versus vendor-produced ROI tools

| Dimension | Typical vendor tool | This tool |
|---|---|---|
| **Who built it** | Vendor with incentive to close | Independent, no affiliation with any provider |
| **Failure rates** | Omitted or buried | Multiplied into every savings figure |
| **Sources** | "Industry research" | 48 dated, cited references |
| **Scenarios** | Single "ROI" number | Conservative / Base / Optimistic + Monte Carlo P10/P50/P90 |
| **Hidden costs** | Implementation only | 12 categories including change management, data cleanup, vendor lock-in, model drift |
| **Token costs** | Flat or abstracted | Per-provider, per-tier, full discount waterfall with MSRP disclosure |
| **Output** | PDF marketing sheet | 24-page PDF with Appendix C methodology + Excel with 40+ audit checks |
| **Audit trail** | Opaque | Every cell in Excel is a real formula referencing a real input |

### Versus generic financial modeling

| Dimension | Build-your-own spreadsheet | This tool |
|---|---|---|
| **Time to first result** | Days-to-weeks | 5 minutes |
| **Benchmarks** | Analyst research required | Pre-populated and dated |
| **Risk adjustment** | Manual | Automatic blended risk factor |
| **Monte Carlo** | Requires @RISK or similar | 500-iteration built-in |
| **Archetype library** | None — start from scratch | 6 pre-modeled patterns |
| **Provider pricing** | Requires external research | 4 providers × 3 tiers, updated quarterly |
| **Share/collaborate** | Email the file | Shareable URL |

---

## Intended Use Cases

### 1. Capital allocation review
A CFO is evaluating a $500K-$5M AI capex request. Uses this tool to produce a risk-adjusted NPV with three scenarios and a Monte Carlo distribution. Takes the output into the approval committee instead of the vendor's 300% ROI deck.

### 2. Board presentation
A CEO needs to present an AI strategy to the board. Uses this tool to frame the opportunity with an honest downside case. Board decisions benefit from the Monte Carlo P10/P90 bands because they set expectations for the range of outcomes.

### 3. M&A diligence
A PE firm or corporate development team is evaluating an acquisition target that claims to have an "AI-transformed" operation. Uses this tool to stress-test the target's claimed efficiency gains against industry benchmarks and to identify which cost lines are likely understated.

### 4. Investment committee
A venture or PE investment committee is evaluating a company whose business case depends on AI-driven cost structure changes. Uses the Monte Carlo output to understand the range of returns under realistic adoption assumptions.

### 5. Project portfolio prioritization
A corporate innovation or digital team is ranking 10 AI opportunities for the upcoming year. Runs each through the tool and ranks by risk-adjusted NPV per dollar of capital deployed. The `PortfolioCompare` feature enables side-by-side comparison.

### 6. Internal champion armor
A department head has a project they believe in. Uses this tool to produce a credible financial case that will survive CFO review — showing that they've already considered the downsides, the adoption curve, and the failure rate.

---

## Data Integrity Principles

### Single source of truth

Every benchmark, every pricing table, every discount rate lives in exactly one file: `src/logic/benchmarks.js`. The UI, the PDF, and the Excel output all read from the same constants. Updating a provider's pricing means changing one number in one place, and every downstream surface updates automatically.

### Dated sources

Every data point has a retrieval date. The `PROVIDER_PRICING_AS_OF` constant (currently `April 2026`) is shown wherever provider rates appear. The `BENCHMARK_SOURCES` table has dated entries for all 48 citations.

### MSRP disclosure

Published provider rates are explicitly labeled as MSRP. The footnote states: *"Does not include enterprise discounts, volume commitments, promotional credits, or negotiated contracts — which can reduce effective cost 20-60%."* The enterprise discount waterfall is then applied separately and transparently.

### Audit trail

The Excel model's "Model Audit" tab runs 40+ conditional checks against the generated output — bounds, ordering, reconciliation (e.g., Displaced FTEs + Retained FTEs = Team Size). Any cell that returns `"ERROR"` flags a model inconsistency that should be investigated before trusting the output.

### Test coverage

1,185 automated tests run in under 3 seconds. The `full-audit.test.js` sweep runs every archetype × every company size × every provider (150 scenarios) and asserts math consistency, scenario ordering, and bounds. The test suite is not just regression protection — it's the primary quality gate for a decision-grade model.

---

## Roadmap Considerations

### Short-term (next 3 months)
- **Company logo upload** for PDF branding — users can drop in their own logo for reports
- **Scenario library** — save common configurations ("mid-market SaaS + Claude Sonnet + 18-month rollout") for reuse
- **Multi-archetype modeling** — some companies are deploying 2-3 archetypes in parallel; the model should handle the interaction effects

### Medium-term (3-9 months)
- **Sensitivity snapshot** on the executive summary — surface the top 3 levers visually at the top of the results page
- **Cohort comparison** — benchmark results against a dataset of anonymized prior model runs
- **Vendor-specific cost profiles** — beyond token pricing, model the actual platform license + API + support costs for each major provider

### Long-term (9+ months)
- **Actuals tracker** integration — let users record actual deployment outcomes and compare against modeled projections, feeding back into the benchmark library
- **Industry benchmarks from live data** — publish aggregated (anonymized) outcomes by industry as a public benchmark dataset
- **Multi-year portfolio view** — for organizations deploying AI across 5-10 projects over a 3-year roadmap

---

## Non-Goals

This tool explicitly does **not** do the following, by design:

- **Produce procurement recommendations.** It will show you that Gemini is cheaper than Opus for your workload, but it won't tell you which one to buy. That requires judgment about accuracy, latency, compliance, and fit.
- **Replace a financial model for the whole company.** This is a single-project ROI tool. It does not model corporate cash flow, working capital, or enterprise-level DCF.
- **Predict AI technology evolution.** The 5-year horizon assumes current model capabilities and current pricing. A dramatic shift in either (e.g., inference costs collapse 90%) would invalidate the forecasts. The model tells you what's likely given today's data; it does not tell you what the future holds.
- **Validate vendor claims.** If a vendor tells you their product will double your sales team's productivity, this tool won't confirm or deny that. It will show you what that level of productivity gain would need to be worth to clear your cost of capital — a meaningful inversion, but not validation.

---

## Success Metrics

The tool is successful if:

1. **Decisions change because of it.** At least one capital allocation decision per month is modified (approved, denied, or repriced) based on output from this tool rather than a vendor-produced projection.
2. **The CFO trusts it.** Finance functions accept the Excel model as a starting point for their own analysis, rather than treating it as marketing material to be redone from scratch.
3. **Zero false positives.** The tool never produces a result that looks better than reality. The Monte Carlo P10 and the Conservative scenario are the outputs that matter, and they need to be defensibly pessimistic.
4. **Benchmarks stay current.** Provider pricing updates within 30 days of any major price change. Industry benchmark sources are refreshed annually.

---

## Author

**JJ Shay** · 15+ years M&A experience · MIT AI Executive Program · [Global Gauntlet AI](https://globalgauntletai.com)

For questions, feedback, or to report a methodology issue, open an issue on [GitHub](https://github.com/jjshay/ai-roi-modeler/issues).
