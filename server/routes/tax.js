import { Router } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { validateQuery, taxComputeSchema, taxCompareSchema } from '../validation/schemas.js';
import { computeTax, compareTaxRegimes } from '../services/taxEngine.js';

const router = Router();

/**
 * GET /api/tax/compute?income=1200000&regime=new
 * Compute tax for a specific income and regime.
 */
router.get('/compute', validateQuery(taxComputeSchema), asyncHandler(async (req, res) => {
  // Joi coerces query strings to numbers via taxComputeSchema
  const income = Number(req.query.income);
  const regime = req.query.regime || 'new';

  if (!Number.isFinite(income) || income < 0) {
    return res.status(400).json({ error: 'Income must be a valid positive number.' });
  }

  const result = computeTax(income, regime);
  res.json(result);
}));

/**
 * GET /api/tax/compare?income=1200000
 * Compare both tax regimes and return the recommended one.
 */
router.get('/compare', validateQuery(taxCompareSchema), asyncHandler(async (req, res) => {
  const income = Number(req.query.income);

  if (!Number.isFinite(income) || income < 0) {
    return res.status(400).json({ error: 'Income must be a valid positive number.' });
  }

  const { newRegime, oldRegime, recommended } = compareTaxRegimes(income);

  res.json({
    income,
    new_regime: {
      tax: newRegime.taxAmount,
      effective_rate: newRegime.effectiveRate,
      rebate_applied: newRegime.rebateApplied,
      taxable_income: newRegime.taxableIncome,
      standard_deduction: newRegime.standardDeduction,
    },
    old_regime: {
      tax: oldRegime.taxAmount,
      effective_rate: oldRegime.effectiveRate,
      rebate_applied: oldRegime.rebateApplied,
      taxable_income: oldRegime.taxableIncome,
      standard_deduction: oldRegime.standardDeduction,
    },
    recommended_regime: recommended,
    saving: Math.abs(newRegime.taxAmount - oldRegime.taxAmount),
    saving_with: recommended,
  });
}));

export default router;
