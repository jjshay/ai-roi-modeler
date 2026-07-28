"""Smoke-test the live results sensitivity grid for every supported use case.

Run with the webapp-testing helper so Vite is started and stopped safely:

python /path/to/with_server.py --server "npm run dev -- --host 127.0.0.1" --port 5173 -- \
  python scripts/verify_sensitivity_ui.py
"""

import base64
import json
from urllib.parse import quote

from playwright.sync_api import sync_playwright


CASE_INPUTS = {
    "internal-process-automation": {
        "processVolume": 5000,
        "handlingTimeMin": 15,
        "pctAutomatable": 0.65,
        "integrationComplexity": 3,
        "humanInLoopPct": 0.20,
    },
    "customer-facing-ai": {
        "ticketsPerMonth": 3000,
        "resolutionTimeMin": 25,
        "eligibleIntentPct": 0.75,
        "deflectionTarget": 0.35,
        "costPerResolvedTicket": 12,
        "humanEscalationPct": 0.20,
        "supportCostValidated": True,
        "supportCostCashRealizable": True,
    },
    "data-analytics-automation": {
        "reportsPerMonth": 40,
        "hoursPerReport": 6,
        "dataSources": 8,
        "accuracyRate": 0.92,
        "manualDataPrepPct": 0.55,
        "analystUtilization": 0.85,
    },
    "risk-compliance-legal-ai": {
        "reviewsPerMonth": 200,
        "hoursPerReview": 4,
        "pctAutomatable": 0.35,
        "findingsPerYear": 15,
        "fineExposure": 250000,
        "preventableFindingPct": 0.20,
    },
}


def results_form(project_archetype):
    return {
        "industry": "Technology / Software",
        "companySize": "Mid-Market (501-5,000)",
        "role": "CFO / Finance Executive",
        "projectArchetype": project_archetype,
        "assumptions": {"automationPotential": 0.60, "adoptionRate": 0.70},
        "archetypeInputs": CASE_INPUTS[project_archetype],
        "directEmployeeCount": 10,
        "employeeFullyBurdenedCost": 120000,
        "offshoreContractorCount": 0,
        "contractorFullyBurdenedCost": 0,
        "hoursPerWeek": 40,
        "teamSize": 10,
        "avgSalary": 120000,
        "totalEfficiencyGainPct": 0.75,
        "employeesToMakeRedundant": 10,
        "employeesToRetrain": 0,
        "changeReadiness": 3,
        "dataReadiness": 3,
        "execSponsor": True,
        "implementationBudget": 200000,
        "ongoingAnnualCost": 50000,
        "expectedTimeline": 6,
    }


def hash_for(payload):
    return base64.b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode()


def verify_case(page, project_archetype):
    url = "http://127.0.0.1:5173/#" + quote(hash_for(results_form(project_archetype)), safe="")
    page.goto(url)
    page.wait_for_load_state("networkidle")
    page.get_by_role("button", name="View Detailed Analysis").click()
    page.get_by_role("heading", name="Two-Driver Sensitivity").wait_for(timeout=15000)

    matrix = page.get_by_role("heading", name="Two-Driver Sensitivity").locator("xpath=../..")
    grid = matrix.get_by_role("grid")
    assert grid.get_by_role("gridcell").count() == 100, project_archetype
    assert "P25" in matrix.inner_text() and "P75" in matrix.inner_text(), project_archetype
    assert "Team Size" not in matrix.inner_text(), project_archetype
    assert "Avg Cost per Person" not in matrix.inner_text(), project_archetype


def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1400})
        for case_id in CASE_INPUTS:
            verify_case(page, case_id)
        page.screenshot(path="/tmp/ai-roi-two-driver-sensitivity.png", full_page=True)
        browser.close()
    print("Verified 4 use cases × 100 cells; screenshot: /tmp/ai-roi-two-driver-sensitivity.png")


if __name__ == "__main__":
    main()
