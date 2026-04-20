import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { runCalculations } from '../logic/calculations';
import { PROJECT_ARCHETYPES, getArchetypeDefaults } from '../logic/archetypes';
import { getArchetypeInputDefaults, mapArchetypeInputs } from '../logic/archetypeInputs';
import { formatCompact, formatPercent } from '../utils/formatters';

const DEFAULT_PROJECT = {
  label: '',
  archetype: '',
  teamSize: 25,
  avgSalary: 130000,
};

function buildProjectInputs(project, baseFormData) {
  const archetype = PROJECT_ARCHETYPES.find(a => a.id === project.archetype);
  if (!archetype) return null;
  const archetypeDefaults = getArchetypeDefaults(project.archetype, baseFormData.industry || 'Other');
  const archetypeInputs = getArchetypeInputDefaults(project.archetype);
  const overrides = mapArchetypeInputs(project.archetype, archetypeInputs);
  return {
    ...baseFormData,
    projectArchetype: project.archetype,
    processType: archetype.sourceProcessTypes[0] || 'Other',
    assumptions: archetypeDefaults,
    archetypeInputs,
    teamSize: project.teamSize,
    avgSalary: project.avgSalary,
    hoursPerWeek: overrides.hoursPerWeek || 40,
    errorRate: overrides.errorRate || 0.08,
  };
}

export default function PortfolioCompare({ baseFormData, onBack }) {
  const [projects, setProjects] = useState([
    { ...DEFAULT_PROJECT, label: 'Project A' },
    { ...DEFAULT_PROJECT, label: 'Project B' },
  ]);

  const updateProject = (idx, field, value) => {
    setProjects(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const addProject = () => {
    if (projects.length < 5) {
      setProjects(prev => [...prev, { ...DEFAULT_PROJECT, label: `Project ${String.fromCharCode(65 + prev.length)}` }]);
    }
  };

  const removeProject = (idx) => {
    if (projects.length > 2) {
      setProjects(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const results = useMemo(() => {
    return projects.map(p => {
      if (!p.archetype) return null;
      try {
        const inputs = buildProjectInputs(p, baseFormData);
        if (!inputs) return null;
        return { project: p, calc: runCalculations(inputs) };
      } catch {
        return null;
      }
    });
  }, [projects, baseFormData]);

  const validResults = results.filter(Boolean);
  const bestIdx = validResults.length > 0
    ? results.indexOf(validResults.reduce((best, r) => !best || r.calc.scenarios.base.npv > best.calc.scenarios.base.npv ? r : best, null))
    : -1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-gold text-xs font-bold tracking-widest uppercase">Global Gauntlet</p>
            <h1 className="text-navy text-2xl font-bold">Portfolio Comparison</h1>
            <p className="text-gray-500 text-sm">Compare up to 5 AI projects side-by-side</p>
          </div>
          <button
            onClick={onBack}
            className="text-sm text-navy hover:text-gold transition-colors cursor-pointer"
          >
            ← Back to results
          </button>
        </div>

        {/* Project inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {projects.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`bg-white rounded-xl shadow-md p-4 border-2 ${
                i === bestIdx ? 'border-gold' : 'border-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <input
                  type="text"
                  value={p.label}
                  onChange={(e) => updateProject(i, 'label', e.target.value)}
                  className="font-bold text-navy text-sm bg-transparent border-b border-dashed border-navy/20 focus:border-gold focus:outline-none w-32"
                />
                {projects.length > 2 && (
                  <button onClick={() => removeProject(i)} className="text-gray-300 hover:text-red-400 text-xs cursor-pointer">Remove</button>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Use Case</label>
                  <select
                    value={p.archetype}
                    onChange={(e) => updateProject(i, 'archetype', e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-gold focus:outline-none"
                  >
                    <option value="">Select archetype</option>
                    {PROJECT_ARCHETYPES.map(a => (
                      <option key={a.id} value={a.id}>{a.icon} {a.label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase">Team Size</label>
                    <input
                      type="number"
                      value={p.teamSize}
                      onChange={(e) => updateProject(i, 'teamSize', Number(e.target.value))}
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs font-mono focus:ring-1 focus:ring-gold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase">Avg Salary</label>
                    <input
                      type="number"
                      value={p.avgSalary}
                      onChange={(e) => updateProject(i, 'avgSalary', Number(e.target.value))}
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs font-mono focus:ring-1 focus:ring-gold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Results preview */}
              {results[i] && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">NPV</span>
                    <span className={`font-mono font-bold ${results[i].calc.scenarios.base.npv >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCompact(results[i].calc.scenarios.base.npv)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">ROIC</span>
                    <span className="font-mono font-bold text-navy">{Math.round(results[i].calc.scenarios.base.roic * 100)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Payback</span>
                    <span className="font-mono font-bold text-navy">{results[i].calc.scenarios.base.paybackMonths}mo</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Investment</span>
                    <span className="font-mono font-bold text-navy">{formatCompact(results[i].calc.upfrontInvestment)}</span>
                  </div>
                  {i === bestIdx && (
                    <div className="text-center mt-2">
                      <span className="bg-gold/20 text-gold text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Best NPV</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}

          {projects.length < 5 && (
            <button
              onClick={addProject}
              className="bg-white/50 rounded-xl border-2 border-dashed border-gray-200 p-4 flex items-center justify-center text-gray-400 hover:text-navy hover:border-navy/30 transition-colors cursor-pointer min-h-[200px]"
            >
              <span className="text-sm font-medium">+ Add Project</span>
            </button>
          )}
        </div>

        {/* Comparison table */}
        {validResults.length >= 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl shadow-lg overflow-hidden"
          >
            <div className="bg-navy px-6 py-3">
              <p className="text-white font-bold text-sm">Side-by-Side Comparison</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Metric</th>
                    {results.map((r, i) => r && (
                      <th key={i} className={`text-right px-4 py-3 font-medium ${i === bestIdx ? 'text-gold' : 'text-navy'}`}>
                        {r.project.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'NPV (Base)', fn: r => formatCompact(r.calc.scenarios.base.npv) },
                    { label: 'NPV (Conservative)', fn: r => formatCompact(r.calc.scenarios.conservative.npv) },
                    { label: 'ROIC', fn: r => Math.round(r.calc.scenarios.base.roic * 100) + '%' },
                    { label: 'IRR', fn: r => isFinite(r.calc.scenarios.base.irr) ? Math.round(r.calc.scenarios.base.irr * 100) + '%' : 'N/A' },
                    { label: 'Payback (months)', fn: r => r.calc.scenarios.base.paybackMonths },
                    { label: 'Upfront Investment', fn: r => formatCompact(r.calc.upfrontInvestment) },
                    { label: 'Annual Savings', fn: r => formatCompact(r.calc.savings.grossAnnualSavings) },
                    { label: 'Risk Multiplier', fn: r => Math.round(r.calc.riskAdjustments.riskMultiplier * 100) + '%' },
                    { label: 'Automation Potential', fn: r => Math.round(r.calc.benchmarks.automationPotential * 100) + '%' },
                  ].map((row, ri) => (
                    <tr key={ri} className={`border-b border-gray-100 ${ri % 2 === 0 ? 'bg-gray-50' : ''}`}>
                      <td className="px-4 py-2 font-medium text-navy">{row.label}</td>
                      {results.map((r, i) => r && (
                        <td key={i} className={`px-4 py-2 text-right font-mono ${i === bestIdx ? 'font-bold text-gold' : ''}`}>
                          {row.fn(r)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
