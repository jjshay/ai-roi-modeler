import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { runCalculations } from '../logic/calculations';
import { getRecommendation } from '../logic/recommendations';
import { formatCurrency, formatPercent, formatCompact } from '../utils/formatters';

export default function ShareCard({ formData, onBuildOwn }) {
  const results = useMemo(() => runCalculations(formData), [formData]);
  const recommendation = useMemo(() => getRecommendation(results), [results]);
  const base = results.scenarios.base;
  const cons = results.scenarios.conservative;
  const opt = results.scenarios.optimistic;
  const topLevers = results.executiveSummary?.topLevers || [];
  const isPositive = base.npv >= 0;

  return (
    <div className="min-h-screen bg-navy-dark flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full"
      >
        {/* Brand */}
        <p className="text-gold text-xs font-bold tracking-widest text-center mb-6 uppercase">
          Global Gauntlet
        </p>

        {/* Main card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Verdict header */}
          <div className={`px-6 py-5 text-center ${isPositive ? 'bg-emerald-600' : 'bg-red-600'}`}>
            <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-1">AI Investment Verdict</p>
            <p className="text-white text-2xl font-bold">{recommendation.headline}</p>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-px bg-gray-100">
            <div className="bg-white p-4 text-center">
              <p className="text-gray-500 text-[10px] uppercase tracking-wide">NPV (Base)</p>
              <p className={`font-mono text-xl font-bold ${base.npv >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCompact(base.npv)}
              </p>
            </div>
            <div className="bg-white p-4 text-center">
              <p className="text-gray-500 text-[10px] uppercase tracking-wide">Payback</p>
              <p className="font-mono text-xl font-bold text-navy">
                {base.paybackMonths <= 60 ? `${base.paybackMonths}mo` : '60+mo'}
              </p>
            </div>
            <div className="bg-white p-4 text-center">
              <p className="text-gray-500 text-[10px] uppercase tracking-wide">ROIC</p>
              <p className="font-mono text-xl font-bold text-navy">{Math.round(base.roic * 100)}%</p>
            </div>
            <div className="bg-white p-4 text-center">
              <p className="text-gray-500 text-[10px] uppercase tracking-wide">Investment</p>
              <p className="font-mono text-xl font-bold text-navy">{formatCompact(results.upfrontInvestment)}</p>
            </div>
          </div>

          {/* Scenario range */}
          <div className="px-6 py-4 border-t border-gray-100">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">NPV Range</p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-red-600 font-mono font-bold">{formatCompact(cons.npv)}</span>
              <div className="flex-1 mx-3 h-2 rounded-full bg-gray-100 relative overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-400 via-amber-400 to-emerald-400 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
              <span className="text-emerald-600 font-mono font-bold">{formatCompact(opt.npv)}</span>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-1">Conservative → Optimistic</p>
          </div>

          {/* Top levers */}
          {topLevers.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-100">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Top Value Drivers</p>
              {topLevers.slice(0, 3).map((lever, i) => (
                <div key={i} className="flex items-center justify-between py-1 text-xs">
                  <span className="text-navy font-medium">{lever.label}</span>
                  <span className="font-mono text-gold font-bold">{formatCompact(lever.npvSwing)} swing</span>
                </div>
              ))}
            </div>
          )}

          {/* Context */}
          <div className="px-6 py-3 bg-gray-50 text-[10px] text-gray-400 text-center">
            {formData.industry} · {formData.companySize} · {formData.teamSize} people
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-6">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={onBuildOwn}
            className="bg-gold text-navy font-bold py-3 px-8 rounded-xl text-sm shadow-lg shadow-gold/20 cursor-pointer transition-colors hover:bg-gold-light"
          >
            Build Your Own Model →
          </motion.button>
          <p className="text-gray-500 text-xs mt-3">Free · No login · 2 minutes</p>
        </div>

        {/* Disclaimer */}
        <p className="text-gray-600 text-[9px] text-center mt-6 max-w-sm mx-auto leading-relaxed">
          For directional guidance only. Not financial advice. All projections are risk-adjusted estimates
          based on industry benchmarks from McKinsey, Deloitte, Gartner, and 22+ sources.
        </p>
      </motion.div>
    </div>
  );
}
