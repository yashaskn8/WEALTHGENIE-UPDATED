/**
 * WealthGenie Projection Engine
 * Generates wealth projections using Lump Sum (compound interest) and SIP formulas.
 * Output is structured for direct consumption by Recharts multi-line charts.
 */

/**
 * Lump Sum (Compound Interest) Future Value.
 * FV = P × (1 + r)^n
 *
 * @param {number} principal - One-time investment amount (₹)
 * @param {number} annualRate - Post-tax annual return rate (decimal, e.g. 0.07)
 * @param {number} years - Number of years
 * @returns {number} Future value
 */
export function lumpSumFV(principal, annualRate, years) {
  if (!principal || principal <= 0 || !years || years <= 0) return 0;
  return principal * Math.pow(1 + annualRate, years);
}

/**
 * SIP (Systematic Investment Plan) Future Value.
 * FV = P × [((1 + r/12)^(12×n) - 1) / (r/12)] × (1 + r/12)
 *
 * @param {number} monthlyInvestment - Monthly SIP amount (₹)
 * @param {number} annualRate - Post-tax annual return rate (decimal, e.g. 0.07)
 * @param {number} years - Number of years
 * @returns {number} Future value
 */
export function sipFV(monthlyInvestment, annualRate, years) {
  if (!monthlyInvestment || monthlyInvestment <= 0 || !years || years <= 0) return 0;
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return monthlyInvestment * n;
  return monthlyInvestment * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}

/**
 * Generate multi-instrument projections for Recharts consumption.
 *
 * @param {number} monthlyInvestment - Monthly SIP amount per instrument (₹)
 * @param {Array<{name: string, type: string}>} instruments - Array of instrument objects
 * @param {Object} postTaxRates - Map of instrument name → post-tax annual rate (decimal)
 * @param {number[]} years - Projection years (default: [5, 10, 15, 20])
 * @returns {{ labels, series, totalInvested }}
 *
 * @example
 * generateProjections(10000, [{name:'HDFC FD'}], {'HDFC FD': 0.05}, [5,10,15,20])
 * → {
 *     labels: [5, 10, 15, 20],
 *     series: [{ name: 'HDFC FD', data: [680000, 1550000, 2890000, 4920000] }],
 *     totalInvested: { 5: 600000, 10: 1200000, 15: 1800000, 20: 2400000 }
 *   }
 */
export function generateProjections(
  monthlyInvestment,
  instruments,
  postTaxRates,
  years = [5, 10, 15, 20]
) {
  const labels = [...years];

  // Total invested at each year mark
  const totalInvested = {};
  labels.forEach(y => {
    totalInvested[y] = monthlyInvestment * 12 * y;
  });

  // Build series for each instrument
  const series = instruments.map(inst => {
    const rate = postTaxRates[inst.name] || postTaxRates[inst.type] || 0;
    const data = labels.map(y => Math.round(sipFV(monthlyInvestment, rate, y)));

    return {
      name: inst.name,
      type: inst.type || 'Unknown',
      postTaxRate: parseFloat((rate * 100).toFixed(2)),
      data,
    };
  });

  // Recharts-friendly dataset (array of objects per year)
  const chartData = labels.map((year, idx) => {
    const point = { year, invested: totalInvested[year] };
    series.forEach(s => {
      point[s.name] = s.data[idx];
    });
    return point;
  });

  return {
    labels,
    series,
    totalInvested,
    chartData,
  };
}

/**
 * Format large INR values in Lakhs/Crores for chart display.
 *
 * @param {number} value
 * @returns {string}
 */
export function formatINR(value) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
}
