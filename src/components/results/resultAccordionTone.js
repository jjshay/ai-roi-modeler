/**
 * Shared presentation states for result guidance, guardrails, and detail.
 * The label is deliberately visible as well as colour-coded so the meaning is
 * available to people who do not perceive the border colour.
 */
export const RESULT_ACCORDION_TONES = {
  positive: {
    label: 'Improves the case',
    container: 'border-emerald-200 bg-emerald-50/45',
    heading: 'text-emerald-950',
    copy: 'text-emerald-800/75',
    value: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200',
    icon: 'text-emerald-600',
    hover: 'hover:bg-emerald-50/70',
  },
  'material-negative': {
    label: 'Material downside',
    container: 'border-red-200 bg-red-50/45',
    heading: 'text-red-950',
    copy: 'text-red-800/75',
    value: 'text-red-600',
    badge: 'bg-red-100 text-red-800 ring-1 ring-inset ring-red-200',
    icon: 'text-red-600',
    hover: 'hover:bg-red-50/70',
  },
  'minor-negative': {
    label: 'Small downside',
    container: 'border-amber-200 bg-amber-50/45',
    heading: 'text-amber-950',
    copy: 'text-amber-800/75',
    value: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200',
    icon: 'text-amber-600',
    hover: 'hover:bg-amber-50/70',
  },
  neutral: {
    label: 'No model change',
    container: 'border-gray-200 bg-white/70',
    heading: 'text-gray-900',
    copy: 'text-gray-500',
    value: 'text-gray-900',
    badge: 'bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-200',
    icon: 'text-gray-500',
    hover: 'hover:bg-white/90',
  },
};

export function getResultAccordionTone(status = 'neutral') {
  return RESULT_ACCORDION_TONES[status] || RESULT_ACCORDION_TONES.neutral;
}
