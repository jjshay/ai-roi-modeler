import { motion } from 'framer-motion';

export default function ProgressBar({ currentStep = 1, totalSteps = 5 }) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full px-4 py-3 sm:px-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-navy">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm font-medium text-navy/60">
          {Math.round(progress)}%
        </span>
      </div>

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
