import { Router } from 'express';
import Instrument from '../models/Instrument.js';
import { getCache, setCache } from '../config/redis.js';

const router = Router();

// GET /api/instruments [Public]
router.get('/', async (req, res) => {
  try {
    const { type, sort, order, limit, page } = req.query;
    const cacheKey = `instruments:${type || 'all'}:${sort || 'name'}:${order || 'asc'}:${page || 1}`;

    // Check Redis cache
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ ...cached, fromCache: true });

    // Build query
    const query = {};
    if (type) query.type = type.toUpperCase();

    const sortField = sort === 'rate' ? 'interestRate' : sort || 'name';
    const sortOrder = order === 'desc' ? -1 : 1;
    const pageSize = Math.min(parseInt(limit) || 20, 100);
    const pageNum = parseInt(page) || 1;
    const skip = (pageNum - 1) * pageSize;

    const [instruments, total] = await Promise.all([
      Instrument.find(query).sort({ [sortField]: sortOrder }).skip(skip).limit(pageSize).lean(),
      Instrument.countDocuments(query),
    ]);

    const result = { instruments, total, page: pageNum, totalPages: Math.ceil(total / pageSize) };

    // Cache for 24 hours
    await setCache(cacheKey, result, 86400);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch instruments: ' + err.message });
  }
});

export default router;
