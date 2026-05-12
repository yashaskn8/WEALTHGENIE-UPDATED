/**
 * Chat Routes — POST /api/chat/message, GET /api/chat/history, DELETE /api/chat/session/:sessionId
 */
import express from 'express';
import crypto from 'crypto';
import { verifyJWT } from '../middleware/authMiddleware.js';
import { processChat } from '../services/geminiChatService.js';
import ConversationHistory from '../models/ConversationHistory.js';

const router = express.Router();

// ── POST /api/chat/message ─────────────────────────────────────────
router.post('/message', verifyJWT, async (req, res) => {
  try {
    const { message, session_id } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required.' });
    }
    if (message.trim().length === 0) {
      return res.status(400).json({ error: 'message cannot be empty.' });
    }
    if (message.length > 1000) {
      return res.status(400).json({ error: 'Message too long. Maximum 1000 characters.' });
    }

    const sessionId = session_id || crypto.randomUUID();

    const result = await processChat({
      userId: req.user.userId,
      user: req.user,
      message: message.trim(),
      sessionId,
    });

    return res.status(200).json(result);
  } catch (err) {
    if (err.status === 429) return res.status(429).json({ error: 'Rate limit exceeded. Please wait before sending another message.' });
    if (err.status === 400) return res.status(400).json({ error: 'Invalid message format.' });
    if (err.status === 502) return res.status(502).json({ error: 'AI advisory service temporarily unavailable.' });
    console.error('[Chat] Error:', err);
    return res.status(500).json({ error: 'Genie is temporarily unavailable. Please try again.' });
  }
});

// ── GET /api/chat/history ──────────────────────────────────────────
router.get('/history', verifyJWT, async (req, res) => {
  try {
    const { session_id, limit = 50 } = req.query;
    const query = { userId: req.user.userId, is_active: true };
    if (session_id) query.session_id = session_id;

    const conversations = await ConversationHistory
      .find(query)
      .sort({ updated_at: -1 })
      .limit(parseInt(limit))
      .select('session_id messages message_count created_at updated_at')
      .lean();

    return res.status(200).json({ conversations });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve history.' });
  }
});

// ── DELETE /api/chat/session/:sessionId ───────────────────────────
router.delete('/session/:sessionId', verifyJWT, async (req, res) => {
  try {
    await ConversationHistory.findOneAndUpdate(
      { userId: req.user.userId, session_id: req.params.sessionId },
      { is_active: false },
    );
    return res.status(200).json({ message: 'Session cleared.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to clear session.' });
  }
});

export default router;
