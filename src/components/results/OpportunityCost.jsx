import { motion } from 'framer-motion';
import { formatCurrency } from '../../utils/formatters';

const COLORS = {
  forgoneSavings: '#ef4444',
  wageInflation: '#f97316',
  legacyCreep: '#eab308',
  competitiveLoss: '#8b5cf6',
  complianceRisk: '#6366f1',
};

const LABELS = {
  forgoneSavings: 'Forgone savings',
  wageInflation: 'Wage inflation',
  legacyCreep: 'Legacy creep',
  competitiveLoss: 'Competitive penalty',
  complianceRisk: 'Compliance risk',
};

function CumulativeLineChart({ yearlyBreakdown, delay }) {
  // Build cumulative data (Year 0 = $0, then accumulate)
  const keys = ['forgoneSavings', 'wageInflation', 'legacyCreep', 'competitiveLoss', 'complianceRisk'];
  const cumulativeData = [{ year: 0, total: 0 }];
  let runningTotal = 0;
  yearlyBreakdown.forEach((yr) => {
    runningTotal += yr.total;
    cumulativeData.push({ year: yr.year, total: runningTotal });
  });

  // Also build per-component cumulative for the stacked area
  const componentCumulative = keys.map((key) => {
    let running = 0;
    const points = [{ year: 0, value: 0 }];
    yearlyBreakdown.forEach((yr) => {
      running += yr[key] || 0;
      points.push({ year: yr.year, value: running });
    });
    return { key, points };
  });

  const maxVal = cumulativeData[cumulativeData.length - 1]?.total || 1;
  const years = cumulativeData.length - 1; // 5

  // SVG dimensions
  const W = 480;
  const H = 220;
  const PAD_L = 70;
  const PAD_R = 20;
  const PAD_T = 15;
  const PAD_B = 30;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  function x(yr) { return PAD_L + (yr / years) * chartW; }
  function y(val) { return PAD_T + chartH - (val / maxVal) * chartH; }

  // Build total line path
  const totalPath = cumulativeData.map((d, i) =>
    `${i === 0 ? 'M' : 'L'}${x(d.year).toFixed(1)},${y(d.total).toFixed(1)}`
  ).join(' ');

  // Build stacked area paths (bottom to top)
  const areaPaths = [];
  const stackedCum = Array.from({ length: cumulativeData.length }, () => 0);

  keys.forEach((key) => {
    const comp = componentCumulative.find(c => c.key === key);
    const prevStack = [...stackedCum];

    comp.points.forEach((pt, i) => {
      stackedCum[i] += pt.value;
    });

    // Area path: forward along top, backward along bottom
    const topPoints = stackedCum.map((val, i) => `${x(i).toFixed(1)},${y(val).toFixed(1)}`);
    const bottomPoints = prevStack.map((val, i) => `${x(i).toFixed(1)},${y(val).toFixed(1)}`).reverse();

    areaPaths.push({
      key,
      d: `M${topPoints.join(' L')} L${bottomPoints.join(' L')} Z`,
      color: COLORS[key],
    });
  });

  // Y-axis tick marks
  const yTicks = [];
  const tickCount = 4;
  for (let i = 0; i <= tickCount; i++) {
    const val = (maxVal / tickCount) * i;
    yTicks.push(val);
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-lg mx-auto" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {yTicks.map((val) => (
          <line key={val} x1={PAD_L} x2={W - PAD_R} y1={y(val)} y2={y(val)} stroke="#e5e7eb" strokeWidth="0.5" />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((val) => (
          <text key={`label-${val}`} x={PAD_L - 6} y={y(val) + 3} textAnchor="end" fontSize="9" fill="#6b7280" fontFamily="monospace">
            {val >= 1000000 ? `$${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `$${(val / 1000).toFixed(0)}K` : '$0'}
          </text>
        ))}

        {/* Stacked area fills */}
        {areaPaths.map((area) => (
          <motion.path
            key={area.key}
            d={area.d}
            fill={area.color}
            opacity={0.2}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            transition={{ delay: delay + 0.3, duration: 0.6 }}
          />
        ))}

        {/* Total cumulative line */}
        <motion.path
          d={totalPath}
          fill="none"
          stroke="#dc2626"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: delay + 0.2, duration: 1.2, ease: 'easeOut' }}
        />

        {/* Data points on the total line */}
        {cumulativeData.map((d, i) => i > 0 && (
          <motion.circle
            key={d.year}
            cx={x(d.year)}
            cy={y(d.total)}
            r="4"
            fill="#dc2626"
            stroke="white"
            strokeWidth="1.5"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: delay + 0.3 + i * 0.15, duration: 0.3 }}
          />
        ))}

        {/* Value labels at each year point */}
        {cumulativeData.map((d, i) => i > 0 && (
          <motion.text
            key={`val-${d.year}`}
            x={x(d.year)}
            y={y(d.total) - 10}
            textAnchor="middle"
            fontSize="9"
            fontWeight="600"
            fontFamily="monospace"
            fill="#991b1b"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.4 + i * 0.15, duration: 0.3 }}
          >
            {d.total >= 1000000 ? `$${(d.total / 1000000).toFixed(1)}M` : formatCurrency(d.total)}
          </motion.text>
        ))}

        {/* X-axis labels */}
        {cumulativeData.map((d) => (
          <text key={`x-${d.year}`} x={x(d.year)} y={H - 6} textAnchor="middle" fontSize="10" fill="#6b7280">
            {d.year === 0 ? 'Now' : `Yr ${d.year}`}
          </text>
        ))}

        {/* Baseline */}
        <line x1={PAD_L} x2={W - PAD_R} y1={y(0)} y2={y(0)} stroke="#d1d5db" strokeWidth="1" />
      </svg>
    </div>
  );
}

export default function OpportunityCost({ opportunityCost, delay = 0 }) {
  const { costOfWaiting12Months, costOfWaiting24Months, yearlyBreakdown } = opportunityCost;
  const yr1 = yearlyBreakdown?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-red-50 border border-red-200 rounded-xl p-5 md:p-6"
    >
      <h3 className="font-heading font-bold text-navy text-lg uppercase tracking-wide mb-1">
        Cost of Inaction
      </h3>
      <div className="h-0.5 bg-red-300/40 mt-1 mb-4" />

      {/* Headline numbers */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white/70 rounded-lg p-3 text-center">
          <span className="text-gray-500 text-xs block mb-1">12-month delay</span>
          <span className="font-mono font-bold text-red-600 text-lg">{formatCurrency(costOfWaiting12Months)}</span>
        </div>
        <div className="bg-white/70 rounded-lg p-3 text-center">
          <span className="text-gray-500 text-xs block mb-1">24-month delay</span>
          <span className="font-mono font-bold text-red-700 text-lg">{formatCurrency(costOfWaiting24Months)}</span>
        </div>
      </div>

      {/* Line chart */}
      {yearlyBreakdown && yearlyBreakdown.length > 1 && (
        <div className="mb-4">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">
            Cumulative Cost of Delay
          </p>
          <CumulativeLineChart yearlyBreakdown={yearlyBreakdown} delay={delay + 0.2} />
        </div>
      )}

      {/* Legend */}
      {yr1 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mb-3">
          {Object.entries(LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[key], opacity: 0.7 }} />
              <span className="text-gray-500 text-xs">{label}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-gray-400 text-xs mt-3 text-center">
        Includes wage inflation [17], legacy maintenance creep [16], competitive penalty [18], and compliance risk escalation
      </p>
    </motion.div>
  );
}
