import { Router } from 'express';
import { verifyJWT } from '../middleware/authMiddleware.js';
import { computeTax, getTaxSlab, compareTaxRegimes } from '../services/taxEngine.js';
import { getRiskProfile } from '../services/riskProfiler.js';
import FinancialProfile from '../models/FinancialProfile.js';

const router = Router();

// POST /api/profile/build [Protected]
router.post('/build', verifyJWT, async (req, res) => {
  try {
    const { monthly_income, age, monthly_savings, regime } = req.body;

    if (!monthly_income || !age || !monthly_savings) {
      return res.status(400).json({ error: 'monthly_income, age, and monthly_savings are required.' });
    }
    if (age < 18 || age > 80) {
      return res.status(400).json({ error: 'Age must be between 18 and 80.' });
    }
    if (monthly_savings >= monthly_income) {
      return res.status(400).json({ error: 'Savings must be less than income.' });
    }

    const annualIncome = monthly_income * 12;
    const taxRegime = regime || 'new';

    // Compute tax
    const taxResult = computeTax(annualIncome, taxRegime);
    const marginalRate = getTaxSlab(annualIncome, taxRegime);
    const taxComparison = compareTaxRegimes(annualIncome);

    // Compute risk profile
    const riskProfile = getRiskProfile(age, annualIncome);

    // Investable amount (post-tax monthly savings)
    const monthlyTax = taxResult.taxAmount / 12;
    const investableAmount = Math.max(0, monthly_savings);

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
      riskDescription: riskProfile.description,
      recommendedEquityAllocation: riskProfile.recommendedEquityAllocation,
      investableAmount,
    });

    res.status(201).json({
      profileId: profile._id,
      taxSlab: marginalRate,
      effectiveTaxRate: taxResult.effectiveRate,
      taxDetails: taxResult,
      taxComparison,
      riskCategory: riskProfile.category,
      riskDescription: riskProfile.description,
      recommendedEquityAllocation: riskProfile.recommendedEquityAllocation,
      annual_income: annualIncome,
      investable_amount: investableAmount,
    });
  } catch (err) {
    res.status(500).json({ error: 'Profile build failed: ' + err.message });
  }
});

export default router;
