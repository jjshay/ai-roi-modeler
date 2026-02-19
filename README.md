# AI ROI Calculator

The AI ROI calculator that doesn't lie. Built by an M&A executive, not a vendor trying to sell you something.

**Live:** [ai-roi-modeler.vercel.app](https://ai-roi-modeler.vercel.app)

## What It Does

A 5-step wizard that builds a custom AI ROI model based on your company's actual context:

1. **Company Context** - Industry, size, team location
2. **Risk & Readiness** - Change readiness, data quality, executive sponsorship
3. **Process Details** - Process type, team size, hours, error rates
4. **Current Costs** - Salaries, existing tool costs, vendor contracts
5. **AI Investment** - Auto-suggested budget, timeline, and ongoing costs

## Output

- **5-Year DCF Analysis** with risk-adjusted NPV, IRR, ROIC, and payback period
- **Three Scenarios** (Conservative / Base / Optimistic) with probability-weighted expected value
- **Sensitivity Analysis** - Tornado chart showing which variables matter most
- **Hidden Cost Model** - Change management, data cleanup, cultural resistance, productivity dip
- **Value Creation Pathways** - Cost efficiency, capacity creation, risk reduction
- **Capital Efficiency Metrics** - EVA, cash-on-cash, ROIC vs WACC
- **Industry Peer Comparison** - Percentile ranking against benchmarks
- **Phased Gate Structure** - Go/no-go thresholds at each deployment stage
- **PDF Report** - Board-ready output with all calculations and sourced benchmarks
- **Excel Model** - Editable spreadsheet with full 5-year projections

## Benchmarks

All benchmarks are sourced from 26 industry references including McKinsey, Deloitte, Gartner, IBM, SHRM, Forrester, BCG, and BLS data.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Framer Motion
- **Backend:** Hono (TypeScript), PostgreSQL
- **Reports:** jsPDF + jspdf-autotable (PDF), ExcelJS (spreadsheet)
- **Hosting:** Vercel (frontend), Railway (API)

## Development

```bash
# Frontend
npm install
npm run dev

# API (requires DATABASE_URL)
cd api
npm install
npm run dev

# Tests
npm test
```

## Author

JJ Shay | 15+ years M&A experience | MIT AI Executive Program | [Global Gauntlet AI](https://globalgauntletai.com)
