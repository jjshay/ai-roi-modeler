import { motion } from 'framer-motion';
import { formatCurrency } from '../../utils/formatters';

const phaseColors = [
  'bg-blue-100 border-blue-300',
  'bg-amber-100 border-amber-300',
  'bg-emerald-100 border-emerald-300',
  'bg-purple-100 border-purple-300',
];

export default function PhasedTimeline({ phasedTimeline, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 md:p-6"
    >
      <h3 className="font-heading font-bold text-navy text-lg uppercase tracking-wide mb-1">
        Value Realization Timeline
      </h3>
      <div className="h-0.5 bg-navy/20 mt-1 mb-4" />

      <div className="space-y-3">
        {phasedTimeline.map((phase, i) => (
          <motion.div
            key={phase.phase}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + 0.1 + i * 0.15 }}
            className={`rounded-lg border p-4 ${phaseColors[i]}`}
          >
            <div className="flex justify-between items-start mb-1">
              <div>
                <span className="text-navy font-bold text-sm">
                  Phase {phase.phase}: {phase.label}
                </span>
                <span className="text-gray-500 text-xs ml-2">
                  Months {phase.monthRange[0]}-{phase.monthRange[1]}
                </span>
              </div>
              <span className="font-mono font-bold text-navy">
                {formatCurrency(phase.estimatedValue)}
              </span>
            </div>
            <p className="text-gray-500 text-xs">{phase.description}</p>
          </motion.div>
        ))}
      </div>

      <p className="text-gray-400 text-xs mt-3">
        Based on 4-phase enterprise AI value realization model [20]
      </p>
    </motion.div>
  );
}
