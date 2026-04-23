/**
 * WealthGenie Post-Tax Return Calculator
 * Computes real after-tax returns for every instrument type under Indian tax law.
 * FY2025-26 rates.
 */

/**
 * Calculate post-tax return for a specific investment instrument.
 *
 * @param {string} instrument - Instrument type: 'FD', 'ELSS', 'Equity_MF', 'ETF', 'Debt_MF', 'RBI_Bond', 'G_Sec'
 * @param {number} nominalRate - Pre-tax annual return rate (e.g. 7.25 for 7.25%)
 * @param {number} marginalTaxRate - User's marginal tax rate as decimal (e.g. 0.30)
 * @param {number} holdingPeriodYears - Investment holding period in years
 * @param {number} annualInvestment - Annual investment amount in ₹
 * @returns {{ nominalReturn, taxAmount, postTaxReturn, effectiveYield, notes }}
 */
export function calculatePostTaxReturn(
  instrument,
  nominalRate,
  marginalTaxRate,
  holdingPeriodYears,
  annualInvestment
) {
  const rate = nominalRate / 100;
  const annualReturn = annualInvestment * rate;
  let taxAmount = 0;
  let notes = '';

  switch (instrument.toUpperCase()) {
    // ─── FIXED DEPOSITS ─────────────────────────────────────────────
    case 'FD':
    case 'FIXED_DEPOSIT': {
      // Interest fully taxable at marginal slab rate
      taxAmount = annualReturn * marginalTaxRate;

      // TDS note
      const tdsThreshold = 40000; // ₹50,000 for senior citizens
      if (annualReturn > tdsThreshold) {
        notes = `TDS at 10% applies on FD interest above ₹${tdsThreshold.toLocaleString('en-IN')}/yr. ` +
                `Claim excess TDS back when filing ITR.`;
      } else {
        notes = 'No TDS applicable as interest is below ₹40,000 threshold.';
      }
      break;
    }

    // ─── ELSS MUTUAL FUNDS ──────────────────────────────────────────
    case 'ELSS': {
      // 3-year mandatory lock-in
      // LTCG: 10% on gains above ₹1,00,000/yr (legacy) → updated to 12.5% above ₹1,25,000
      const totalGain = annualInvestment * Math.pow(1 + rate, Math.max(holdingPeriodYears, 3)) - annualInvestment;
      const annualizedGain = totalGain / Math.max(holdingPeriodYears, 3);
      const exemptGain = 125000; // FY2025-26 updated LTCG exemption
      const taxableGain = Math.max(0, annualizedGain - exemptGain);
      taxAmount = taxableGain * 0.125; // 12.5% LTCG
      notes = `ELSS: 3-year lock-in. LTCG at 12.5% on gains above ₹1,25,000/yr. ` +
              `Section 80C deduction up to ₹1,50,000 available under old regime.`;
      break;
    }

    // ─── EQUITY MUTUAL FUNDS & ETFs ─────────────────────────────────
    case 'EQUITY_MF':
    case 'ETF': {
      if (holdingPeriodYears < 1) {
        // STCG: 20% flat
        taxAmount = annualReturn * 0.20;
        notes = `STCG at 20% (holding < 1 year).`;
      } else {
        // LTCG: 12.5% on gains above ₹1,25,000
        const exemptGain = 125000;
        const taxableGain = Math.max(0, annualReturn - exemptGain);
        taxAmount = taxableGain * 0.125;
        notes = `LTCG at 12.5% on gains above ₹1,25,000/yr (FY2025-26). Gains below threshold are tax-free.`;
      }
      break;
    }

    // ─── DEBT MUTUAL FUNDS ──────────────────────────────────────────
    case 'DEBT_MF': {
      // Post April 2023: gains taxed at income slab rate (no indexation)
      taxAmount = annualReturn * marginalTaxRate;
      notes = `Debt MF gains taxed at income slab rate (${(marginalTaxRate * 100).toFixed(0)}%). ` +
              `No indexation benefit after April 2023.`;
      break;
    }

    // ─── RBI SAVINGS BONDS ──────────────────────────────────────────
    case 'RBI_BOND':
    case 'RBI_BONDS': {
      // Interest fully taxable at slab rate, no TDS
      taxAmount = annualReturn * marginalTaxRate;
      notes = `RBI Bond interest fully taxable at slab rate. No TDS deducted — must declare in ITR. ` +
              `7-year lock-in with sovereign guarantee.`;
      break;
    }

    // ─── GOVERNMENT SECURITIES / G-SECS ─────────────────────────────
    case 'G_SEC':
    case 'GSEC': {
      if (holdingPeriodYears < 1) {
        // STCG at slab rate
        taxAmount = annualReturn * marginalTaxRate;
        notes = `G-Sec STCG taxed at slab rate (${(marginalTaxRate * 100).toFixed(0)}%).`;
      } else {
        // Interest taxable at slab, capital gains LTCG at 10% without indexation
        const interestComponent = annualReturn * 0.7; // approximate split
        const capitalGainComponent = annualReturn * 0.3;
        taxAmount = (interestComponent * marginalTaxRate) + (capitalGainComponent * 0.10);
        notes = `G-Sec: Interest taxed at slab rate. Capital gains LTCG at 10% without indexation.`;
      }
      break;
    }

    default: {
      // Generic: tax at slab rate
      taxAmount = annualReturn * marginalTaxRate;
      notes = `Taxed at marginal slab rate (${(marginalTaxRate * 100).toFixed(0)}%).`;
    }
  }

  // Add 4% cess on computed tax
  taxAmount = taxAmount * 1.04;

  const postTaxReturn = annualReturn - taxAmount;
  const effectiveYield = annualInvestment > 0
    ? parseFloat(((postTaxReturn / annualInvestment) * 100).toFixed(2))
    : 0;

  return {
    instrument,
    nominalReturn: parseFloat(annualReturn.toFixed(2)),
    taxAmount: parseFloat(taxAmount.toFixed(2)),
    postTaxReturn: parseFloat(postTaxReturn.toFixed(2)),
    effectiveYield,
    nominalRate,
    marginalTaxRate,
    holdingPeriodYears,
    annualInvestment,
    notes,
  };
}

/**
 * Batch calculate post-tax returns for multiple instruments.
 *
 * @param {Array<{name, type, nominalRate}>} instruments
 * @param {number} marginalTaxRate
 * @param {number} holdingPeriodYears
 * @param {number} annualInvestment
 * @returns {Array}
 */
export function batchCalculatePostTaxReturns(instruments, marginalTaxRate, holdingPeriodYears, annualInvestment) {
  return instruments.map(inst => ({
    name: inst.name,
    ...calculatePostTaxReturn(inst.type, inst.nominalRate, marginalTaxRate, holdingPeriodYears, annualInvestment),
  }));
}
