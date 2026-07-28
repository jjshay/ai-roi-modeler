import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getResultAccordionTone } from './resultAccordionTone';

/**
 * A single, accessible pattern for any result explanation that is not needed
 * to make the initial investment decision. The first screen stays focused on
 * the decision and its key numbers; the evidence remains one click away.
 */
export default function ResultsAccordion({
  title,
  subtitle,
  value,
  status = 'neutral',
  defaultOpen = false,
  children,
  id,
  compact = false,
  className = '',
}) {
  const [open, setOpen] = useState(defaultOpen);
  const generatedId = useId().replace(/:/g, '');
  const accordionId = id || `result-accordion-${generatedId}`;
  const panelId = `${accordionId}-panel`;
  const tone = getResultAccordionTone(status);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      id={accordionId}
      data-result-accordion
      data-status={status}
      className={`overflow-hidden rounded-2xl border shadow-sm backdrop-blur-xl ${tone.container} ${className}`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className={`flex w-full items-center justify-between gap-4 text-left transition-colors cursor-pointer ${tone.hover} ${compact ? 'px-4 py-3.5' : 'px-6 py-5'}`}
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className={`text-sm font-semibold tracking-tight ${tone.heading}`}>{title}</span>
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${tone.badge}`}>
              {tone.label}
            </span>
          </span>
          {subtitle && <span className={`mt-1 block text-[11px] leading-relaxed ${tone.copy}`}>{subtitle}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {value && <span className={`font-mono text-sm font-bold text-right ${tone.value}`}>{value}</span>}
          <motion.svg
            aria-hidden="true"
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className={`h-5 w-5 ${tone.icon}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </motion.svg>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={`${compact ? 'px-4 pb-4' : 'px-6 pb-6'}`}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
