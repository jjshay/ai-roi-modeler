import { motion } from 'framer-motion';

const BENEFITS = [
  {
    category: 'Decision Speed',
    description: 'AI-augmented analysis accelerates decisions from days to hours',
  },
  {
    category: 'Employee Experience',
    description: 'Teams shift from repetitive tasks to higher-value strategic work',
  },
  {
    category: 'Institutional Knowledge',
    description: 'AI captures and scales tribal knowledge that otherwise leaves with attrition',
  },
  {
    category: 'Consistency & Quality',
    description: 'Standardized outputs reduce variation and improve client-facing deliverables',
  },
  {
    category: '24/7 Availability',
    description: 'AI processes continue outside business hours with no overtime cost',
  },
  {
    category: 'Competitive Positioning',
    description: 'Early AI adoption signals innovation to clients, partners, and talent',
  },
];

export default function QualitativeBenefits({ delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 md:p-6"
    >
      <h3 className="font-heading font-bold text-navy text-lg uppercase tracking-wide mb-1">
        Qualitative Benefits
      </h3>
      <div className="h-0.5 bg-navy/20 mt-1 mb-4" />

      <div className="space-y-3">
        {BENEFITS.map(({ category, description }, i) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + 0.1 + i * 0.08 }}
            className="flex gap-3"
          >
            <span className="text-navy font-semibold text-sm whitespace-nowrap">{category}</span>
            <span className="text-gray-500 text-sm">{description}</span>
          </motion.div>
        ))}
      </div>

      <p className="text-gray-400 text-xs mt-3">
        These benefits are not included in NPV calculations but are frequently cited in executive decision-making
      </p>
    </motion.div>
  );
}
