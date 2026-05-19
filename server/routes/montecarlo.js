import { Router } from 'express';
import { verifyJWT, isOwner, isValidObjectId } from '../middleware/authMiddleware.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { validate, monteCarloSchema } from '../validation/schemas.js';
import { runMonteCarloWithGoal, getInstrumentVolatility } from '../services/monteCarloEngine.js';
import { getLiveInstrumentParams } from '../services/marketDataService.js';
import { calculatePostTaxReturn } from '../services/postTaxCalculator.js';
import FinancialProfile from '../models/FinancialProfile.js';
import { getCache, setCache } from '../config/redis.js';

const router = Router();

/**
 * POST /api/montecarlo/montecarlo [Protected]
 * Run Monte Carlo simulation for a specific instrument.
 *
 * When a profileId is provided, the simulation uses:
 *   1. Live Nifty-derived volatility params (from AMFI/Yahoo Finance)
 *   2. Post-tax adjusted returns (from the user's marginal slab)
 */
router.post('/montecarlo', verifyJWT, validate(monteCarloSchema), asyncHandler(async (req, res) => {
  const { instrument, monthly_investment, years, target_amount, profileId } = req.body;

  // ── Step 1: Fetch live instrument parameters (Nifty-derived for equity) ──
  const liveResult = await getLiveInstrumentParams();
  const liveParams = liveResult.params[instrument]
    || getInstrumentVolatility(instrument);

  let effectiveRate = liveParams.mean;
  let effectiveVolatility = liveParams.stdDev;
  let dataSource = liveParams.source || 'static';
  let postTaxInfo = null;

  // ── Step 2: If profileId provided, compute post-tax adjusted rate ──
  if (profileId) {
    if (!isValidObjectId(profileId)) {
      throw createError(400, 'Invalid profileId in montecarlo', 'Invalid profile ID.');
    }

    const profile = await FinancialProfile.findById(profileId).lean();
    if (profile) {
      // Authorization check
      if (!isOwner(profile, req.user.userId)) {
        throw createError(403, `Unauthorized MC profile access: ${profileId}`, 'Access denied.');
      }

      const annualIncome = profile.annualIncome || (profile.income * 12);
      const regime = profile.taxRegime || 'new';

      try {
        const postTaxResult = calculatePostTaxReturn(
          instrument,
          liveParams.mean,
          annualIncome,
          years,
          regime
        );

        effectiveRate = postTaxResult.postTaxReturn;
        postTaxInfo = {
          nominal_rate: liveParams.mean,
          post_tax_rate: postTaxResult.postTaxReturn,
          tax_type: postTaxResult.taxType,
          tax_rate: postTaxResult.taxRate,
          regime,
        };
      } catch (taxErr) {
        console.warn('[MonteCarlo] Post-tax calculation failed, using pre-tax rate:', taxErr.message);
      }
    }
  }

  // ── Step 3: Check Redis cache ──
  // Round effectiveRate to 4 decimal places to avoid cache fragmentation from float precision
  const rateKey = effectiveRate.toFixed(4);
  const cacheKey = `mc:${req.user.userId}:${instrument}:${years}:${monthly_investment}:${rateKey}`;
  const cached = await getCache(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  // ── Step 4: Run Monte Carlo simulation with live + post-tax params ──
  const result = runMonteCarloWithGoal({
    monthlyInvestment: monthly_investment,
    postTaxAnnualReturn: effectiveRate,
    annualVolatility: effectiveVolatility,
    years,
    simulations: 10000,
    targetAmount: target_amount || null,
  });

  // ── Step 5: Build Recharts-friendly chart data ──
  const chartData = result.years_array.map((yr, i) => ({
    year: yr,
    p10: result.p10[i],
    p25: result.p25[i],
    p50: result.p50[i],
    p75: result.p75[i],
    p90: result.p90[i],
    mean: result.mean[i],
  }));

  const response = {
    instrument,
    years,
    monthly_investment,
    chartData,
    goal_probability: result.goal_probability,
    target_amount: result.target_amount,
    simulations_run: result.simulations_run,
    percentile_summary: {
      p10: result.p10[result.p10.length - 1],
      p25: result.p25[result.p25.length - 1],
      p50: result.p50[result.p50.length - 1],
      p75: result.p75[result.p75.length - 1],
      p90: result.p90[result.p90.length - 1],
    },
    data_source: dataSource,
    post_tax_rate_used: effectiveRate,
    volatility_used: effectiveVolatility,
    nifty_derived: dataSource === 'live',
    post_tax_info: postTaxInfo,
    cached: false,
  };

  // Cache for 30 minutes
  await setCache(cacheKey, response, 1800);
  res.json(response);
}));

export default router;
