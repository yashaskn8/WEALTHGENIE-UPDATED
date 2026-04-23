import { Router } from 'express';
import { verifyJWT } from '../middleware/authMiddleware.js';
import { runMonteCarloWithGoal, getInstrumentVolatility } from '../services/monteCarloEngine.js';
import { getCache, setCache } from '../config/redis.js';

const router = Router();

/**
 * POST /api/projection/montecarlo
 * Run Monte Carlo simulation for a specific instrument.
 *
 * Body: { instrument, monthly_investment, years, target_amount?, post_tax_rate? }
 */
router.post('/montecarlo', verifyJWT, async (req, res) => {
  try {
    const { instrument, monthly_investment, years, target_amount, post_tax_rate } = req.body;

    if (!instrument || !monthly_investment || !years) {
      return res.status(400).json({ error: 'instrument, monthly_investment, and years are required.' });
    }

    // Check Redis cache (30 min TTL)
    const cacheKey = `mc:${req.user.userId}:${instrument}:${years}:${monthly_investment}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    // Get volatility params for the instrument
    const vol = getInstrumentVolatility(instrument, post_tax_rate);

    const result = runMonteCarloWithGoal({
      monthlyInvestment: monthly_investment,
      postTaxAnnualReturn: vol.mean,
      annualVolatility: vol.stdDev,
      years,
      simulations: 10000,
      targetAmount: target_amount || null,
    });

    // Build Recharts-friendly chart data
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
      cached: false,
    };

    // Cache for 30 minutes
    await setCache(cacheKey, response, 1800);
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'Monte Carlo simulation failed: ' + err.message });
  }
});

export default router;
