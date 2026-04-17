import { motion } from 'framer-motion';

const differentiators = [
  {
    icon: '🎯',
    text: 'Includes failure rates most vendors hide',
  },
  {
    icon: '📊',
    text: 'Risk-adjusted NPV, not fantasy projections',
  },
  {
    icon: '📄',
    text: 'Board-ready PDF output in 3 minutes',
  },
];

const outputHighlights = [
  '5-Year DCF with 3 Scenarios',
  'Monte Carlo Simulation',
  'Board Decision Package',
  'Risk Register with Owners',
  'Quarterly Cash Flow',
  'Exportable PDF & Excel',
];

export default function LandingPage({ onStart, hasDraft }) {
  return (
    <div className="min-h-screen bg-navy-dark flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl w-full text-center"
        >
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            AI ROI.
            <br />
            <span className="text-gold">No Bullshit.</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-xl mx-auto leading-relaxed">
            Risk-adjusted 5-year DCF. Board-ready in 2 minutes.
          </p>

          {/* Trust signals — above CTA */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-gray-400 text-sm mb-6"
          >
            No login required · No data stored · No sales pitch
          </motion.p>

          {/* CTA */}
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStart}
            className="bg-gold text-navy font-bold py-4 px-10 rounded-xl text-lg md:text-xl shadow-lg shadow-gold/20 cursor-pointer transition-colors hover:bg-gold-light"
          >
            {hasDraft ? 'Resume Assessment →' : 'Start Free Assessment →'}
          </motion.button>

          {hasDraft && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-gold/70 text-xs mt-2"
            >
              You have a saved draft — pick up where you left off
            </motion.p>
          )}

          {/* Differentiators */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-10 mb-10">
            {differentiators.map((d, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.15, duration: 0.4 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-4 flex-1"
              >
                <div className="text-2xl mb-2">{d.icon}</div>
                <p className="text-sm text-gray-200 font-medium">{d.text}</p>
              </motion.div>
            ))}
          </div>

          {/* What you get — output preview */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="border border-white/10 rounded-xl p-5 max-w-lg mx-auto"
          >
            <p className="text-xs font-bold text-gold uppercase tracking-widest mb-3">What You Get</p>
            <div className="flex flex-wrap justify-center gap-2">
              {outputHighlights.map((h) => (
                <span key={h} className="text-xs text-gray-300 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                  {h}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-8 text-gray-500 text-xs space-y-1"
          >
            <p>Benchmarks from McKinsey, Deloitte, Gartner, BCG, and 22 more sources</p>
            <p>Used by finance teams, consultants, and C-suite executives</p>
          </motion.div>
        </motion.div>
      </div>

      <footer className="text-center py-6 px-4 border-t border-white/10">
        <p className="text-gray-400 text-xs leading-relaxed">
          Created by JJ Shay | 15+ years M&A experience | MIT AI Executive Program
          <br />
          Global Gauntlet AI
        </p>
      </footer>
    </div>
  );
}
