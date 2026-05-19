import { Router } from 'express';
import { verifyJWT } from '../middleware/authMiddleware.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { validate, profileSchema } from '../validation/schemas.js';
import { computeTax, getTaxSlab, compareTaxRegimes } from '../services/taxEngine.js';
import { getRiskProfile } from '../services/riskProfiler.js';
import FinancialProfile from '../models/FinancialProfile.js';
import { delCache } from '../config/redis.js';

const router = Router();

/**
 * POST /api/profile/build [Protected]
 * Builds a financial profile with tax computation and risk profiling.
 */
router.post('/build', verifyJWT, validate(profileSchema), asyncHandler(async (req, res) => {
  const { monthly_income, age, monthly_savings, regime, investment_horizon } = req.body;

  const annualIncome = monthly_income * 12;
  const taxRegime = regime || 'new';

  // Compute tax
  const taxResult = computeTax(annualIncome, taxRegime);
  const marginalRate = getTaxSlab(annualIncome, taxRegime);
  const taxComparison = compareTaxRegimes(annualIncome);

  // Compute risk profile
  const riskProfile = getRiskProfile(age, annualIncome);

  // Investable amount = monthly savings (pre-validated to be < income)
  const investableAmount = monthly_savings;

  // Self-check invariant: riskScore must align with riskCategory
  const SCORE_RANGES = {
    'Aggressive': [80, 100], 'Moderate-Aggressive': [60, 79],
    'Moderate': [40, 59], 'Conservative-Moderate': [20, 39], 'Conservative': [0, 19],
  };
  const expectedRange = SCORE_RANGES[riskProfile.category];
  if (expectedRange && (riskProfile.riskScore < expectedRange[0] || riskProfile.riskScore > expectedRange[1])) {
    console.error(`[Profile INVARIANT] riskScore ${riskProfile.riskScore} does not match category '${riskProfile.category}' (expected ${expectedRange[0]}-${expectedRange[1]})`);
  }

  // Save to MongoDB
  const profile = await FinancialProfile.create({
    userId: req.user.userId,
    income: monthly_income,
    age,
    savings: monthly_savings,
    annualIncome,
    taxSlab: marginalRate,
    effectiveTaxRate: taxResult.effectiveRate,
    taxRegime,
    riskCategory: riskProfile.category,
    riskScore: riskProfile.riskScore,
    riskDescription: riskProfile.description,
    recommendedEquityAllocation: riskProfile.recommendedEquityAllocation,
    investableAmount,
    investmentHorizon: investment_horizon,
  });

  // Invalidate chatbot system prompt cache so the AI gets the latest numbers
  // Use pattern-based deletion via scan (safer than KEYS in production)
  try {
    const prefix = `chat:sysprompt_v3:${req.user.userId}:`;
    await delCache(prefix + profile._id);
  } catch (redisErr) {
    console.warn('[Profile] Cache invalidation failed (non-critical):', redisErr.message);
  }

  res.status(201).json({
    profileId: profile._id,
    taxSlab: marginalRate,
    effectiveTaxRate: taxResult.effectiveRate,
    taxDetails: taxResult,
    taxComparison,
    riskCategory: riskProfile.category,
    riskScore: riskProfile.riskScore,
    riskDescription: riskProfile.description,
    recommendedEquityAllocation: riskProfile.recommendedEquityAllocation,
    annual_income: annualIncome,
    investable_amount: investableAmount,
  });
}));

export default router;
