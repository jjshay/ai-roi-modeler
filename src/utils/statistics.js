// Statistical utility functions for Monte Carlo simulation
// Box-Muller, lognormal, triangular distributions + descriptive stats

/**
 * Generate a standard normal random variate using the Box-Muller transform.
 * Returns N(mean, stdDev).
 */
export function gaussianRandom(mean = 0, stdDev = 1) {
  let u1, u2;
  do { u1 = Math.random(); } while (u1 === 0); // avoid log(0)
  u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

/**
 * Generate a lognormal random variate.
 * The underlying normal has the given mean and stdDev (i.e. log of result ~ N(mean, stdDev)).
 */
export function lognormalRandom(meanOfUnderlying, stdDevOfUnderlying) {
  return Math.exp(gaussianRandom(meanOfUnderlying, stdDevOfUnderlying));
}

/**
 * Generate a triangular-distributed random variate using inverse CDF.
 * @param {number} low  - minimum
 * @param {number} mid  - mode (peak)
 * @param {number} high - maximum
 */
export function triangularRandom(low, mid, high) {
  const u = Math.random();
  const fc = (mid - low) / (high - low);
  if (u < fc) {
    return low + Math.sqrt(u * (high - low) * (mid - low));
  }
  return high - Math.sqrt((1 - u) * (high - low) * (high - mid));
}

/**
 * Compute the p-th percentile of a *sorted* array via linear interpolation.
 * @param {number[]} sortedArr - ascending-sorted numeric array
 * @param {number} p - percentile in [0, 100]
 */
export function percentile(sortedArr, p) {
  if (!sortedArr.length) return 0;
  if (sortedArr.length === 1) return sortedArr[0];
  const idx = (p / 100) * (sortedArr.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedArr[lo];
  const frac = idx - lo;
  return sortedArr[lo] * (1 - frac) + sortedArr[hi] * frac;
}

/**
 * Arithmetic mean of an array.
 */
export function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}

/**
 * Population standard deviation.
 */
export function stdDev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

/**
 * Clamp a value between min and max.
 */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}
