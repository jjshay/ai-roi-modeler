import { motion } from 'framer-motion';
import { formatPercent } from '../../utils/formatters';

export default function PeerComparison({ peerComparison, industry, companySize, delay = 0 }) {
  const { percentileRank, peerMedian, peerP25, peerP75, userROIC, vsMedian } = peerComparison;
  const isAboveMedian = vsMedian >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 md:p-6"
    >
      <h3 className="font-heading font-bold text-navy text-lg uppercase tracking-wide mb-1">
        Industry Peer Comparison
      </h3>
      <div className="h-0.5 bg-navy/20 mt-1 mb-4" />

      {/* Percentile display */}
      <div className="text-center mb-5">
        <div className={`text-4xl md:text-5xl font-mono font-bold mb-1 ${isAboveMedian ? 'text-emerald-600' : 'text-amber-600'}`}>
          P{percentileRank}
        </div>
        <div className="text-gray-500 text-sm">
          Your projected ROIC ranks in the <strong>{percentileRank}th percentile</strong>
        </div>
        <div className="text-gray-400 text-xs mt-1">
          vs. {industry} / {companySize} peers
        </div>
      </div>

      {/* Gauge bar */}
      <div className="relative mb-4">
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isAboveMedian ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: `${Math.min(percentileRank, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>P0</span>
          <span>P25</span>
          <span>P50</span>
          <span>P75</span>
          <span>P100</span>
        </div>
      </div>

      {/* Peer data */}
      <div className="space-y-1 mb-3">
        <div className="flex justify-between items-center py-1">
          <span className="text-gray-600 text-sm">Peer P25</span>
          <span className="font-mono font-semibold text-sm text-navy">{formatPercent(peerP25)}</span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="text-gray-600 text-sm">Peer Median</span>
          <span className="font-mono font-semibold text-sm text-navy">{formatPercent(peerMedian)}</span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="text-gray-600 text-sm">Peer P75</span>
          <span className="font-mono font-semibold text-sm text-navy">{formatPercent(peerP75)}</span>
        </div>
      </div>

      <div className="flex justify-between items-center py-1 border-t border-gray-100 pt-2">
        <span className="text-gray-600 text-sm font-medium">Your ROIC</span>
        <span className={`font-mono font-semibold text-sm ${isAboveMedian ? 'text-emerald-600' : 'text-amber-600'}`}>
          {formatPercent(userROIC)} ({isAboveMedian ? '+' : ''}{formatPercent(vsMedian)} vs median)
        </span>
      </div>

      <p className="text-gray-400 text-xs mt-3 text-center">
        Based on aggregate industry benchmarks [1][2][5]
      </p>
    </motion.div>
  );
}
