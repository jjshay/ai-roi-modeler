export const formatCurrency = (value) => {
  if (value == null || isNaN(value)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatPercent = (value) => {
  if (value == null || isNaN(value)) return '0%';
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value);
};

export const formatNumber = (value) => {
  if (value == null || isNaN(value)) return '0';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatCompact = (value) => {
  if (value == null || isNaN(value)) return '$0';
  if (Math.abs(value) >= 1_000_000) {
    return '$' + (value / 1_000_000).toFixed(1) + 'M';
  }
  if (Math.abs(value) >= 1_000) {
    return '$' + (value / 1_000).toFixed(0) + 'K';
  }
  return formatCurrency(value);
};

export const generateAssessmentId = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
