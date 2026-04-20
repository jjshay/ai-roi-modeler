// Generates a real Excel file, loads it back, and reports which rows on
// the Model Audit sheet evaluate to "ERROR" — the checks the user sees
// as red on the Model Audit tab when opening the Excel output.
import { describe, it } from 'vitest';
import ExcelJS from 'exceljs';
import { generateExcelModel } from '../generateExcelModel';
import { runCalculations } from '../../logic/calculations';
import { PROJECT_ARCHETYPES } from '../../logic/archetypes';
import { getArchetypeInputDefaults } from '../../logic/archetypeInputs';

function makeInputs(archetypeId) {
  return {
    industry: 'Technology / Software',
    companySize: 'Mid-Market (501-5,000)',
    role: 'CFO / Finance Executive',
    teamLocation: 'US - Major Tech Hub',
    teamSize: 15, avgSalary: 120000, hoursPerWeek: 25, errorRate: 0.10,
    changeReadiness: 3, dataReadiness: 3, execSponsor: true,
    projectArchetype: archetypeId,
    processType: 'Document Processing',
    archetypeInputs: getArchetypeInputDefaults(archetypeId) || {},
    aiProvider: 'Anthropic Claude',
    implementationBudget: 500000, expectedTimeline: 6, ongoingAnnualCost: 50000,
    cashRealizationPct: 0.40,
  };
}

describe('Model Audit sheet: surface ERROR rows per archetype', () => {
  for (const arch of PROJECT_ARCHETYPES) {
    it(`${arch.label}: dump audit issues`, async () => {
      const formData = makeInputs(arch.id);
      const results = runCalculations(formData);
      const buffer = await generateExcelModel(formData, null, results);

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      const au = wb.getWorksheet('Model Audit');
      if (!au) {
        console.log(`[${arch.label}] No Model Audit sheet`);
        return;
      }

      const failing = [];
      const suspect = [];
      au.eachRow((row, rowNum) => {
        const label = row.getCell(1).value;
        const valueCell = row.getCell(2);
        const statusCell = row.getCell(4);
        // statusCell stores either a plain value or { formula, result }
        const status = typeof statusCell.value === 'object' && statusCell.value !== null
          ? statusCell.value.result
          : statusCell.value;
        const value = typeof valueCell.value === 'object' && valueCell.value !== null
          ? valueCell.value.result
          : valueCell.value;
        if (status === 'ERROR') {
          failing.push({ rowNum, label, value, status });
        } else if (status !== undefined && status !== null && status !== 'ok' && status !== '—' && typeof status === 'string' && status.includes && status.includes('ERR')) {
          suspect.push({ rowNum, label, value, status });
        }
      });

      console.log(`\n[${arch.label}]`);
      console.log(`  ERROR rows: ${failing.length}`);
      failing.forEach(f => {
        console.log(`    row ${f.rowNum}: "${f.label}" = ${JSON.stringify(f.value)} → ${f.status}`);
      });
      if (suspect.length > 0) {
        console.log(`  Suspect: ${suspect.length}`);
        suspect.forEach(s => console.log(`    row ${s.rowNum}: "${s.label}" → ${s.status}`));
      }
    });
  }
});
