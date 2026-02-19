import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CurrencyInput from '../inputs/CurrencyInput';
import SliderInput from '../inputs/SliderInput';
import { formatCurrency } from '../../utils/formatters';

const slideVariants = {
  enter: { x: 80, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -80, opacity: 0 },
};

export default function Step4_CurrentCosts({ formData, updateField }) {
  const [subStep, setSubStep] = useState(0);

  const teamSize = formData.teamSize || 10;
  const avgSalary = formData.avgSalary ?? 100000;
  const errorRate = formData.errorRate ?? 0.10;

  const annualLaborCost = teamSize * avgSalary;
  const reworkCost = annualLaborCost * errorRate;
  const totalCost = annualLaborCost + reworkCost;

  const handleSalaryChange = (val) => {
    updateField('avgSalary', val);
  };

  const handleToolCostsChange = (val) => {
    updateField('currentToolCosts', val);
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <h2 className="mb-2 text-2xl font-bold text-navy sm:text-3xl">
        Now let's talk dollars
      </h2>
      <div className="mb-8 h-1 w-16 rounded bg-gold" />

      <AnimatePresence mode="wait">
        {subStep === 0 && (
          <motion.div
            key="avgSalary"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="space-y-4">
              <CurrencyInput
                label="What's the average fully-loaded annual cost per person on this process?"
                value={formData.avgSalary ?? 100000}
                onChange={handleSalaryChange}
                presets={[100000, 125000, 150000, 200000, 250000, 300000]}
                defaultValue={100000}
                helperText="Fully-loaded = salary + benefits + overhead. Rule of thumb: multiply base salary by 1.3-1.5x"
              />

              {formData.avgSalary != null && (
                <div className="rounded-xl border border-navy/10 bg-navy/5 p-4 space-y-2">
                  <p className="text-sm font-semibold text-navy">
                    Current Annual Process Cost
                  </p>
                  <div className="space-y-1 text-sm text-navy/80">
                    <p>
                      Labor: {formatCurrency(annualLaborCost)}{' '}
                      <span className="text-navy/50">
                        ({teamSize} people x {formatCurrency(avgSalary)})
                      </span>
                    </p>
                    <p>
                      + Rework Cost: {formatCurrency(reworkCost)}
                    </p>
                    <div className="mt-2 border-t border-navy/10 pt-2">
                      <p className="text-base font-bold text-navy">
                        Total: {formatCurrency(totalCost)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSubStep(1)}
                className="
                  mt-4 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold
                  text-navy shadow-sm transition-all duration-150
                  hover:bg-gold/90 focus:outline-none focus-visible:ring-2
                  focus-visible:ring-gold focus-visible:ring-offset-2
                "
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {subStep === 1 && (
          <motion.div
            key="toolCosts"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="space-y-4">
              <CurrencyInput
                label="Annual spend on current tools/software for this process?"
                value={formData.currentToolCosts ?? 0}
                onChange={handleToolCostsChange}
                presets={[0, 10000, 25000, 50000, 100000]}
                defaultValue={0}
                helperText="Include licenses, subscriptions, and maintenance costs"
              />

              <button
                type="button"
                onClick={() => setSubStep(2)}
                className="
                  mt-4 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold
                  text-navy shadow-sm transition-all duration-150
                  hover:bg-gold/90 focus:outline-none focus-visible:ring-2
                  focus-visible:ring-gold focus-visible:ring-offset-2
                "
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {subStep === 2 && (
          <motion.div
            key="vendorsReplaced"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="space-y-4">
              <SliderInput
                label="How many existing vendors/tools will AI replace?"
                value={formData.vendorsReplaced ?? 0}
                onChange={(val) => updateField('vendorsReplaced', val)}
                min={0}
                max={3}
                step={1}
                helperText="Count major software vendors or service contracts that will be terminated when AI is implemented"
              />

              <button
                type="button"
                onClick={() => {
                  if ((formData.vendorsReplaced ?? 0) > 0) {
                    setSubStep(3);
                  }
                  // If 0 vendors, this is the last sub-step — wizard handles "Next"
                }}
                className={`
                  mt-4 rounded-lg px-6 py-2.5 text-sm font-semibold
                  shadow-sm transition-all duration-150
                  focus:outline-none focus-visible:ring-2
                  focus-visible:ring-gold focus-visible:ring-offset-2
                  ${(formData.vendorsReplaced ?? 0) > 0
                    ? 'bg-gold text-navy hover:bg-gold/90'
                    : 'hidden'
                  }
                `}
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {subStep === 3 && (
          <motion.div
            key="vendorTerminationCost"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="space-y-4">
              <CurrencyInput
                label={`Estimated cost to terminate ${formData.vendorsReplaced} vendor contract${formData.vendorsReplaced > 1 ? 's' : ''}?`}
                value={formData.vendorTerminationCost ?? 0}
                onChange={(val) => updateField('vendorTerminationCost', val)}
                presets={[0, 25000, 50000, 100000, 250000]}
                defaultValue={0}
                helperText="Include early termination fees, remaining contract obligations, migration costs, and data extraction fees"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
