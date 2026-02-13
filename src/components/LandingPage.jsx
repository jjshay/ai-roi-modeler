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

export default function LandingPage({ onStart }) {
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
            The AI ROI Calculator
            <br />
            <span className="text-gold">That Doesn't Lie</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-xl mx-auto leading-relaxed">
            Built by an M&A executive who's closed $4B+ in deals.
            <br className="hidden md:block" />
            Not by a vendor trying to sell you something.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            {differentiators.map((d, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.4 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-4 flex-1"
              >
                <div className="text-2xl mb-2">{d.icon}</div>
                <p className="text-sm text-gray-200 font-medium">{d.text}</p>
              </motion.div>
            ))}
          </div>

          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.3 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStart}
            className="bg-gold text-navy font-bold py-4 px-10 rounded-xl text-lg md:text-xl shadow-lg shadow-gold/20 cursor-pointer transition-colors hover:bg-gold-light"
          >
            Start Free Assessment →
          </motion.button>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="text-gray-400 text-sm mt-6"
          >
            No login required · No data stored · No sales pitch
          </motion.p>
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
