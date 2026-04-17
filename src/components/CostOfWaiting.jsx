import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { formatCurrency, formatCompact } from '../utils/formatters';
import { COMPETITIVE_PENALTY, COMPLIANCE_ESCALATION_RATE, WAGE_INFLATION_BY_INDUSTRY } from '../logic/benchmarks';

const INDUSTRIES = [
  'Technology / Software', 'Financial Services / Banking', 'Healthcare / Life Sciences',
  'Manufacturing / Industrial', 'Retail / E-Commerce', 'Professional Services / Consulting',
  'Media / Entertainment', 'Energy / Utilities', 'Government / Public Sector', 'Other',
];

export default function CostOfWaiting({ onStartFull, onBack }) {
  const [industry, setIndustry] = useState('');
  const [teamSize, setTeamSize] = useState(25);
  const [avgSalary, setAvgSalary] = useState(130000);

  const result = useMemo(() => {
    if (!industry) return null;
    const annualLabor = teamSize * avgSalary;
    const wageRate = WAGE_INFLATION_BY_INDUSTRY[industry] || 0.035;
    const penalty = COMPETITIVE_PENALTY[industry] || 0.02;
    const compliance = COMPLIANCE_ESCALATION_RATE;

    let total = 0;
    for (let yr = 1; yr <= 5; yr++) {
      const wageInflation = annualLabor * (Math.pow(1 + wageRate, yr) - 1);
      const competitiveLoss = annualLabor * (Math.pow(1 + penalty, yr) - 1);
      const complianceRisk = annualLabor * (Math.pow(1 + compliance, yr) - 1) * 0.1;
      total += wageInflation + competitiveLoss + complianceRisk;
    }
    return {
      total: Math.round(total),
      monthly: Math.round(total / 60),
      annualLabor,
    };
  }, [industry, teamSize, avgSalary]);

  return (
    <div className="min-h-screen bg-navy-dark flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <p className="text-gold text-xs font-bold tracking-widest text-center mb-4 uppercase">
          Global Gauntlet
        </p>
        <h1 className="text-white text-2xl md:text-3xl font-bold text-center mb-2">
          What's Your Cost of Waiting?
        </h1>
        <p className="text-gray-400 text-sm text-center mb-8">
          3 inputs. 10 seconds. One number that changes the conversation.
        </p>

        <div className="bg-white rounded-2xl shadow-2xl p-6 space-y-5">
          {/* Industry */}
          <div>
            <label className="block text-xs font-semibold text-navy mb-1.5">Industry</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
            >
              <option value="">Select your industry</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          {/* Team size */}
          <div>
            <label className="block text-xs font-semibold text-navy mb-1.5">
              Team size <span className="font-mono text-gold">{teamSize}</span>
            </label>
            <input
              type="range"
              min={5} max={200} step={5}
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              className="w-full accent-gold"
            />
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>5</span><span>200</span>
            </div>
          </div>

          {/* Avg salary */}
          <div>
            <label className="block text-xs font-semibold text-navy mb-1.5">
              Avg cost/person <span className="font-mono text-gold">{formatCurrency(avgSalary)}</span>
            </label>
            <input
              type="range"
              min={50000} max={300000} step={10000}
              value={avgSalary}
              onChange={(e) => setAvgSalary(Number(e.target.value))}
              className="w-full accent-gold"
            />
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>$50K</span><span>$300K</span>
            </div>
          </div>

          {/* Result */}
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border-2 border-red-200 rounded-xl p-5 text-center"
            >
              <p className="text-red-600 text-xs font-semibold uppercase tracking-wide mb-1">
                5-Year Cost of Doing Nothing
              </p>
              <p className="text-red-700 text-3xl font-bold font-mono">
                {formatCompact(result.total)}
              </p>
              <p className="text-red-500 text-sm mt-1">
                That's <span className="font-bold">{formatCompact(result.monthly)}/month</span> you're leaving on the table
              </p>
            </motion.div>
          )}

          {/* CTA */}
          {result && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStartFull}
              className="w-full bg-gold text-navy font-bold py-3 rounded-xl text-sm shadow-md cursor-pointer transition-colors hover:bg-gold-light"
            >
              Get Your Full ROI Analysis →
            </motion.button>
          )}
        </div>

        <button
          onClick={onBack}
          className="text-gray-500 text-xs mt-4 block mx-auto hover:text-white transition-colors cursor-pointer"
        >
          ← Back to calculator
        </button>
      </motion.div>
    </div>
  );
}
