/**
 * WealthGenie XIRR Calculator — Newton-Raphson Implementation
 *
 * XIRR (Extended Internal Rate of Return) computes the annualized return
 * for a series of irregular cash flows. This is the gold standard for
 * evaluating SIP performance since each installment has a different
 * holding period.
 *
 * Mathematical basis:
 *   Solve for r in: Σ C_i / (1 + r)^((D_i - D_0) / 365) = 0
 *   Using Newton-Raphson: r_{n+1} = r_n - f(r_n) / f'(r_n)
 *
 * Convergence: typically 5-15 iterations for tolerance = 1e-10.
 */

/**
 * Compute NPV (Net Present Value) for a given rate.
 *
 * @param {number} rate - Annual rate (decimal)
 * @param {Array<{amount: number, date: Date}>} cashflows - Array of {amount, date}
 * @returns {number} NPV at the given rate
 */
function npv(rate, cashflows) {
  const d0 = cashflows[0].date.getTime();
  let total = 0;
  for (let i = 0; i < cashflows.length; i++) {
    const daysDiff = (cashflows[i].date.getTime() - d0) / 86400000; // ms → days
    const exponent = daysDiff / 365;
    total += cashflows[i].amount / Math.pow(1 + rate, exponent);
  }
  return total;
}

/**
 * Compute derivative of NPV with respect to rate (for Newton-Raphson).
 *
 * @param {number} rate - Annual rate (decimal)
 * @param {Array<{amount: number, date: Date}>} cashflows
 * @returns {number} dNPV/dRate
 */
function npvDerivative(rate, cashflows) {
  const d0 = cashflows[0].date.getTime();
  let total = 0;
  for (let i = 0; i < cashflows.length; i++) {
    const daysDiff = (cashflows[i].date.getTime() - d0) / 86400000;
    const exponent = daysDiff / 365;
    total -= exponent * cashflows[i].amount / Math.pow(1 + rate, exponent + 1);
  }
  return total;
}

/**
 * Compute XIRR using Newton-Raphson iteration.
 *
 * @param {Array<{amount: number, date: Date|string}>} cashflows
 *   First entry should be negative (investment), last should be positive (redemption/current value).
 * @param {number} [guess=0.1] - Initial guess for rate (10%)
 * @param {number} [tolerance=1e-10] - Convergence threshold
 * @param {number} [maxIterations=100] - Max Newton-Raphson iterations
 * @returns {{
 *   rate: number,
 *   converged: boolean,
 *   iterations: number,
 *   npvResidual: number,
 *   annualizedReturn: string
 * }}
 */
export function computeXIRR(cashflows, guess = 0.1, tolerance = 1e-10, maxIterations = 100) {
  // Input validation
  if (!Array.isArray(cashflows) || cashflows.length < 2) {
    return { rate: 0, converged: false, iterations: 0, npvResidual: NaN, error: 'Need at least 2 cashflows' };
  }

  // Normalize dates to Date objects
  const normalized = cashflows.map(cf => ({
    amount: Number(cf.amount),
    date: cf.date instanceof Date ? cf.date : new Date(cf.date),
  }));

  // Validate: at least one positive and one negative cashflow
  const hasPositive = normalized.some(cf => cf.amount > 0);
  const hasNegative = normalized.some(cf => cf.amount < 0);
  if (!hasPositive || !hasNegative) {
    return { rate: 0, converged: false, iterations: 0, npvResidual: NaN, error: 'Need both positive and negative cashflows' };
  }

  // Sort by date (ascending)
  normalized.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Newton-Raphson iteration
  let rate = guess;
  let iterations = 0;

  for (let i = 0; i < maxIterations; i++) {
    iterations = i + 1;
    const f = npv(rate, normalized);
    const fPrime = npvDerivative(rate, normalized);

    // Avoid division by zero
    if (Math.abs(fPrime) < 1e-15) {
      // Try bisection fallback
      rate = rate * 0.9;
      continue;
    }

    const newRate = rate - f / fPrime;

    // Convergence check
    if (Math.abs(newRate - rate) < tolerance) {
      return {
        rate: parseFloat(newRate.toFixed(8)),
        converged: true,
        iterations,
        npvResidual: parseFloat(npv(newRate, normalized).toFixed(6)),
        annualizedReturn: `${(newRate * 100).toFixed(2)}%`,
      };
    }

    // Guard: clamp rate to prevent divergence
    rate = Math.max(-0.99, Math.min(newRate, 10)); // -99% to 1000%
  }

  // Failed to converge — return best estimate
  return {
    rate: parseFloat(rate.toFixed(8)),
    converged: false,
    iterations,
    npvResidual: parseFloat(npv(rate, normalized).toFixed(6)),
    annualizedReturn: `${(rate * 100).toFixed(2)}%`,
    warning: 'Newton-Raphson did not converge within max iterations',
  };
}

/**
 * Compute XIRR for a SIP investment.
 * Convenience wrapper that generates cashflows from SIP parameters.
 *
 * @param {number} monthlySIP - Monthly SIP amount (₹)
 * @param {number} months - Total months of investment
 * @param {number} currentValue - Current portfolio value (₹)
 * @param {Date} [startDate] - SIP start date (defaults to `months` months ago)
 * @returns {object} XIRR result
 */
export function computeSIPXIRR(monthlySIP, months, currentValue, startDate) {
  if (!Number.isFinite(monthlySIP) || monthlySIP <= 0) return { rate: 0, converged: false, error: 'Invalid SIP amount' };
  if (!Number.isFinite(months) || months < 1) return { rate: 0, converged: false, error: 'Invalid months' };
  if (!Number.isFinite(currentValue) || currentValue <= 0) return { rate: 0, converged: false, error: 'Invalid current value' };

  const start = startDate || new Date(Date.now() - months * 30.4375 * 86400000);
  const cashflows = [];

  // Each SIP installment is a negative cashflow (money going out)
  for (let i = 0; i < months; i++) {
    const date = new Date(start.getTime() + i * 30.4375 * 86400000);
    cashflows.push({ amount: -monthlySIP, date });
  }

  // Current value is a positive cashflow (money coming back)
  cashflows.push({ amount: currentValue, date: new Date() });

  return computeXIRR(cashflows);
}
