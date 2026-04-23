import { Router } from 'express';
import { verifyJWT } from '../middleware/authMiddleware.js';
import Goal from '../models/Goal.js';
import FinancialProfile from '../models/FinancialProfile.js';
import Recommendation from '../models/Recommendation.js';
import { reverseSIP, runMonteCarloWithGoal, getInstrumentVolatility } from '../services/monteCarloEngine.js';
import { chatWithGemini } from '../services/geminiService.js';

const router = Router();

/**
 * POST /api/goals/create [Protected]
 * Create a new financial goal with automated SIP computation and Monte Carlo analysis.
 */
router.post('/create', verifyJWT, async (req, res) => {
  try {
    const { goal_name, target_amount, target_date, current_savings, profileId } = req.body;

    if (!goal_name || !target_amount || !target_date) {
      return res.status(400).json({ error: 'goal_name, target_amount, and target_date are required.' });
    }

    // Calculate years remaining
    const targetDateObj = new Date(target_date);
    const now = new Date();
    const yearsRemaining = Math.max(1, Math.round((targetDateObj - now) / (365.25 * 24 * 60 * 60 * 1000)));

    // Find the user's latest profile and recommendation
    const profile = profileId
      ? await FinancialProfile.findById(profileId)
      : await FinancialProfile.findOne({ userId: req.user.userId }).sort({ createdAt: -1 });

    const latestRec = await Recommendation.findOne({ userId: req.user.userId }).sort({ createdAt: -1 });
    const recommendedInstrument = latestRec?.instruments?.[0]?.type || 'Equity_MF';

    // Get volatility params for the recommended instrument
    const vol = getInstrumentVolatility(recommendedInstrument);

    // Compute required monthly SIP using reverse formula
    const requiredSIP = Math.round(reverseSIP(target_amount, vol.mean, yearsRemaining, current_savings || 0));

    // Run Monte Carlo with the required SIP
    const mcResult = runMonteCarloWithGoal({
      monthlyInvestment: requiredSIP,
      postTaxAnnualReturn: vol.mean,
      annualVolatility: vol.stdDev,
      years: yearsRemaining,
      simulations: 5000,  // fewer simulations for speed on goal creation
      targetAmount: target_amount,
    });

    // Determine gap and status
    const userMonthlySavings = profile?.savings || 10000;
    const gap = requiredSIP - userMonthlySavings;

    let status;
    if (gap <= 0) {
      status = 'on_track';
    } else if (gap <= userMonthlySavings * 0.25) {
      status = 'at_risk';
    } else {
      status = 'off_track';
    }

    // Generate Gemini advice for this goal
    let geminiAdvice = '';
    try {
      const profileContext = {
        age: profile?.age || 30,
        annualIncome: profile?.annualIncome || 600000,
        riskCategory: profile?.riskCategory || 'Moderate',
      };
      geminiAdvice = await chatWithGemini(
        `User is ${status.replace('_', ' ')} for goal "${goal_name}" worth ₹${target_amount.toLocaleString('en-IN')} in ${yearsRemaining} years. Required SIP: ₹${requiredSIP.toLocaleString('en-IN')}/month. Their current savings capacity: ₹${userMonthlySavings.toLocaleString('en-IN')}/month. Suggest one specific actionable financial adjustment in 2 sentences.`,
        profileContext
      );
    } catch (_) {
      geminiAdvice = `To stay on track for your "${goal_name}" goal, maintain a monthly SIP of ₹${requiredSIP.toLocaleString('en-IN')} in ${recommendedInstrument.replace('_', ' ')}.`;
    }

    // Save goal to MongoDB
    const goal = await Goal.create({
      userId: req.user.userId,
      profileId: profile?._id,
      goal_name,
      target_amount,
      target_date: targetDateObj,
      current_savings: current_savings || 0,
      recommended_sip: requiredSIP,
      recommended_instrument: recommendedInstrument,
      probability_of_success: mcResult.goal_probability,
      gap_amount: Math.max(0, gap),
      status,
      monte_carlo_summary: {
        p10: mcResult.p10[mcResult.p10.length - 1],
        p25: mcResult.p25[mcResult.p25.length - 1],
        p50: mcResult.p50[mcResult.p50.length - 1],
        p75: mcResult.p75[mcResult.p75.length - 1],
        p90: mcResult.p90[mcResult.p90.length - 1],
        simulations_run: mcResult.simulations_run,
      },
      gemini_advice: geminiAdvice,
    });

    // Build Recharts chart data
    const chartData = mcResult.years_array.map((yr, i) => ({
      year: yr,
      p10: mcResult.p10[i],
      p25: mcResult.p25[i],
      p50: mcResult.p50[i],
      p75: mcResult.p75[i],
      p90: mcResult.p90[i],
    }));

    res.status(201).json({
      goalId: goal._id,
      ...goal.toObject(),
      chartData,
      years_remaining: yearsRemaining,
    });
  } catch (err) {
    res.status(500).json({ error: 'Goal creation failed: ' + err.message });
  }
});

/**
 * GET /api/goals [Protected]
 * List all goals for the current user.
 */
router.get('/', verifyJWT, async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user.userId }).sort({ target_date: 1 });
    res.json({ goals });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch goals: ' + err.message });
  }
});

/**
 * DELETE /api/goals/:goalId [Protected]
 */
router.delete('/:goalId', verifyJWT, async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.goalId, userId: req.user.userId });
    if (!goal) return res.status(404).json({ error: 'Goal not found.' });
    res.json({ deleted: true, goalId: req.params.goalId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete goal: ' + err.message });
  }
});

export default router;
