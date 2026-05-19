/**
 * WealthGenie Tax Engine — FY2025-26 Indian Income Tax Calculator
 * Supports both New Tax Regime (default) and Old Tax Regime.
 * Includes 4% Health & Education Cess and Section 87A rebate.
 */

// ─── FY2025-26 NEW TAX REGIME SLABS ───────────────────────────────
const NEW_REGIME_SLABS = [
  { min: 0,        max: 400000,   rate: 0    },
  { min: 400000,   max: 800000,   rate: 0.05 },
  { min: 800000,   max: 1200000,  rate: 0.10 },
  { min: 1200000,  max: 1600000,  rate: 0.15 },
  { min: 1600000,  max: 2000000,  rate: 0.20 },
  { min: 2000000,  max: 2400000,  rate: 0.25 },
  { min: 2400000,  max: Infinity, rate: 0.30 },
];

// ─── OLD TAX REGIME SLABS ─────────────────────────────────────────
const OLD_REGIME_SLABS = [
  { min: 0,        max: 250000,   rate: 0    },
  { min: 250000,   max: 500000,   rate: 0.05 },
  { min: 500000,   max: 1000000,  rate: 0.20 },
  { min: 1000000,  max: Infinity, rate: 0.30 },
];

const CESS_RATE = 0.04; // 4% Health & Education Cess

/**
 * Calculate tax from slab structure.
 * @param {number} taxableIncome
 * @param {Array} slabs
 * @returns {number} tax before cess
 */
function calculateFromSlabs(taxableIncome, slabs) {
  let tax = 0;
  for (const slab of slabs) {
    if (taxableIncome <= slab.min) break;
    const taxableInSlab = Math.min(taxableIncome, slab.max) - slab.min;
    tax += taxableInSlab * slab.rate;
  }
  return tax;
}

/**
 * Compute surcharge on base tax for high-income individuals.
 * Surcharge applies to base tax (before cess), based on taxable income.
 *
 * New regime surcharge rates (Finance Act 2023 onwards):
 *   ₹50L – ₹1Cr:    10%
 *   ₹1Cr – ₹2Cr:    15%
 *   Above ₹2Cr:     25% (capped at 25% for new regime)
 *
 * Old regime surcharge rates:
 *   ₹50L – ₹1Cr:    10%
 *   ₹1Cr – ₹2Cr:    15%
 *   ₹2Cr – ₹5Cr:    25%
 *   Above ₹5Cr:     37%
 *
 * @param {number} taxBeforeSurcharge - Base tax amount
 * @param {number} taxableIncome - Taxable income after deductions
 * @param {string} regime - 'new' or 'old'
 * @returns {number} surcharge amount
 */
function computeSurcharge(taxBeforeSurcharge, taxableIncome, regime) {
  if (taxableIncome <= 5000000) return 0; // Below ₹50L: no surcharge

  let surchargeRate = 0;

  if (regime === 'new') {
    if (taxableIncome <= 10000000)       surchargeRate = 0.10;
    else if (taxableIncome <= 20000000)  surchargeRate = 0.15;
    else                                 surchargeRate = 0.25;
  } else {
    // Old regime
    if (taxableIncome <= 10000000)       surchargeRate = 0.10;
    else if (taxableIncome <= 20000000)  surchargeRate = 0.15;
    else if (taxableIncome <= 50000000)  surchargeRate = 0.25;
    else                                 surchargeRate = 0.37;
  }

  return taxBeforeSurcharge * surchargeRate;
}

/**
 * Compute full tax breakdown for a given annual income.
 *
 * @param {number} annualIncome - Gross annual income in ₹
 * @param {string} regime - 'new' (default) or 'old'
 * @returns {{ taxAmount, effectiveRate, regime, rebateApplied, surchargeApplied, surchargeAmount, cess, taxBeforeCess, taxableIncome }}
 */
export function computeTax(annualIncome, regime = 'new') {
  // Input guard: reject non-finite or negative income
  if (!Number.isFinite(annualIncome) || annualIncome < 0) {
    console.warn(`[TaxEngine] Invalid annualIncome: ${annualIncome}. Treating as 0.`);
    annualIncome = 0;
  }
  if (regime !== 'new' && regime !== 'old') regime = 'new';

  const slabs = regime === 'new' ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;

  // Standard deduction
  const standardDeduction = regime === 'new' ? 75000 : 50000;
  const taxableIncome = Math.max(0, annualIncome - standardDeduction);

  let taxBeforeCess = calculateFromSlabs(taxableIncome, slabs);

  // Section 87A rebate
  let rebateApplied = false;
  if (regime === 'new' && taxableIncome <= 1200000) {
    taxBeforeCess = 0;
    rebateApplied = true;
  } else if (regime === 'old' && taxableIncome <= 500000) {
    taxBeforeCess = 0;
    rebateApplied = true;
  }

  // Surcharge (applied on base tax before cess)
  const surcharge = computeSurcharge(taxBeforeCess, taxableIncome, regime);
  const taxAfterSurcharge = taxBeforeCess + surcharge;

  // 4% Health & Education Cess (applied on tax + surcharge)
  const cess = taxAfterSurcharge * CESS_RATE;
  const taxAmount = taxAfterSurcharge + cess;
  const effectiveRate = annualIncome > 0
    ? parseFloat(((taxAmount / annualIncome) * 100).toFixed(2))
    : 0;

  return {
    taxAmount: Math.round(taxAmount),
    effectiveRate,
    regime,
    rebateApplied,
    surchargeApplied: surcharge > 0,
    surchargeAmount: Math.round(surcharge),
    cess: Math.round(cess),
    taxBeforeCess: Math.round(taxBeforeCess),
    taxableIncome,
    annualIncome,
    standardDeduction,
  };
}


/**
 * Get the marginal (highest applicable) tax slab percentage.
 *
 * @param {number} annualIncome - Gross annual income in ₹
 * @param {string} regime - 'new' or 'old'
 * @returns {number} marginal tax rate as decimal (e.g. 0.30 for 30%)
 */
export function getTaxSlab(annualIncome, regime = 'new') {
  // Input guard
  if (!Number.isFinite(annualIncome) || annualIncome < 0) annualIncome = 0;
  if (regime !== 'new' && regime !== 'old') regime = 'new';

  const standardDeduction = regime === 'new' ? 75000 : 50000;
  const taxableIncome = Math.max(0, annualIncome - standardDeduction);
  const slabs = regime === 'new' ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;

  let marginalRate = 0;
  for (const slab of slabs) {
    if (taxableIncome > slab.min) {
      marginalRate = slab.rate;
    }
  }

  // If rebate applies, effective marginal rate is 0 for FD-interest-type calculations
  // But we return the *statutory* marginal rate for post-tax calculations on *incremental* income
  return marginalRate;
}

/**
 * Compare both regimes and return the better one.
 *
 * @param {number} annualIncome
 * @returns {{ newRegime, oldRegime, recommended }}
 */
export function compareTaxRegimes(annualIncome) {
  // Input guard
  if (!Number.isFinite(annualIncome) || annualIncome < 0) annualIncome = 0;

  const newRegime = computeTax(annualIncome, 'new');
  const oldRegime = computeTax(annualIncome, 'old');
  const recommended = newRegime.taxAmount <= oldRegime.taxAmount ? 'new' : 'old';
  return { newRegime, oldRegime, recommended };
}
