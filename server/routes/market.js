import { Router } from 'express';
import { verifyJWT } from '../middleware/authMiddleware.js';
import { getMarketDataSummary, getLiveInstrumentParams, fetchIndexStatistics } from '../services/marketDataService.js';
import { delCache } from '../config/redis.js';

const router = Router();

/**
 * GET /api/market/rates
 * Returns live market data summary with instrument data source transparency.
 */
router.get('/rates', async (req, res) => {
  try {
    const summary = await getMarketDataSummary();
    const liveParams = await getLiveInstrumentParams();

    // Build instrument_data_sources map for frontend transparency
    const instrument_data_sources = {};
    if (liveParams?.params) {
      for (const [key, val] of Object.entries(liveParams.params)) {
        instrument_data_sources[key] = {
          source: val.source || 'static',
          rate: val.mean,
          ...(val.source === 'live'
            ? { based_on: 'Nifty 3yr trailing' }
            : { last_reviewed: '2026-04-01', note: `Rate: ${(val.mean * 100).toFixed(1)}%` }
          ),
        };
      }
    }

    res.json({
      ...summary,
      instrument_data_sources,
      last_live_refresh: summary.last_refresh,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch market data.' });
  }
});

/**
 * GET /api/market/params
 * Returns live Monte Carlo instrument parameters.
 */
router.get('/params', async (req, res) => {
  try {
    const result = await getLiveInstrumentParams();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch instrument params.' });
  }
});

/**
 * POST /api/market/refresh [Protected]
 * Invalidates Redis cache for live market data and triggers a background refresh.
 * Returns 202 immediately — does not block on the actual fetch.
 * Client should wait ~3s before re-fetching /api/market/rates.
 */
router.post('/refresh', verifyJWT, async (req, res) => {
  try {
    // Invalidate cached live data
    await Promise.allSettled([
      delCache('index:stats:^NSEI'),
      delCache('index:stats:^BSESN'),
      delCache('mc:instrument:params:live'),
    ]);

    // Trigger background refresh (non-blocking)
    fetchIndexStatistics('^NSEI').catch(() => {});
    fetchIndexStatistics('^BSESN').catch(() => {});

    res.status(202).json({
      status: 'refresh_initiated',
      estimated_completion_ms: 3000,
      message: 'Live data cache invalidated. New data will be fetched in background.',
    });
  } catch (err) {
    res.status(500).json({ error: 'Refresh failed.' });
  }
});

export default router;
