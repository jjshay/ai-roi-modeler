import { motion } from 'framer-motion';

export default function ProgressBar({ currentStep = 1, totalSteps = 3, stepLabels }) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full px-4 py-2 sm:py-3 sm:px-6">
      {/* Step labels */}
      {stepLabels && (
        <div className="mb-2 flex justify-between">
          {stepLabels.map((label, i) => {
            const stepNum = i + 1;
            const isActive = stepNum === currentStep;
            const isDone = stepNum < currentStep;
            return (
              <span
                key={label}
                className={`text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-navy'
                    : isDone
                    ? 'text-emerald-600'
                    : 'text-gray-400'
                }`}
              >
                {isDone ? '\u2713 ' : ''}{label}
              </span>
            );
          })}
        </div>
      )}

      <div className="h-2 w-full overflow-hidden rounded-full bg-navy-dark/20">
        <motion.div
          className="h-full rounded-full bg-gold"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}
