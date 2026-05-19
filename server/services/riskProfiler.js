/**
 * WealthGenie Risk Profiler
 * Categorizes users into risk buckets based on age + annual income.
 *
 * Uses a composite scoring model:
 *   - Age score: younger → higher risk capacity (0–50 points)
 *   - Income score: higher income → higher risk capacity (0–50 points)
 *   - Total score mapped to 5 risk categories with smooth boundaries
 *
 * This avoids the cliff-edge problem where a ₹1 income difference
 * or 1-year age difference causes a two-tier risk jump.
 */

const RISK_PROFILES = {
  Aggressive: {
    category: 'Aggressive',
    description: 'High risk tolerance — suited for equity-heavy portfolios with long-term growth focus. Can withstand 30-40% interim drawdowns.',
    recommendedEquityAllocation: 80,
  },
  'Moderate-Aggressive': {
    category: 'Moderate-Aggressive',
    description: 'Above-average risk tolerance — balanced toward equity with some debt allocation for stability. Growth-oriented with moderate volatility acceptance.',
    recommendedEquityAllocation: 65,
  },
  Moderate: {
    category: 'Moderate',
    description: 'Balanced risk approach — equal weight to equity and debt instruments. Seeks steady growth with controlled downside.',
    recommendedEquityAllocation: 50,
  },
  'Conservative-Moderate': {
    category: 'Conservative-Moderate',
    description: 'Below-average risk tolerance — debt-heavy portfolio with limited equity exposure. Prioritizes capital preservation with modest growth.',
    recommendedEquityAllocation: 35,
  },
  Conservative: {
    category: 'Conservative',
    description: 'Low risk tolerance — focused on capital preservation through government securities, FDs, and debt funds. Minimal equity exposure.',
    recommendedEquityAllocation: 20,
  },
};

/**
 * Compute age-based risk score (0–50).
 * Linear decay: age 18 → 50 points, age 70 → 0 points.
 * Clamped to [0, 50].
 *
 * @param {number} age
 * @returns {number}
 */
function ageScore(age) {
  // Linear: score = 50 × (1 - (age - 18) / 52)
  // At age 18: 50, at age 44: 25, at age 70: 0
  const raw = 50 * (1 - Math.max(0, age - 18) / 52);
  return Math.max(0, Math.min(50, raw));
}

/**
 * Compute income-based risk score (0–50).
 * Logarithmic scale — diminishing returns above ₹20L.
 * Clamped to [0, 50].
 *
 * @param {number} annualIncome - Gross annual income in ₹
 * @returns {number}
 */
function incomeScore(annualIncome) {
  if (annualIncome <= 0) return 0;
  // Log scale: ~10 at ₹3L, ~25 at ₹6L, ~35 at ₹12L, ~42 at ₹25L, ~50 at ₹50L+
  const raw = 50 * Math.min(1, Math.log10(annualIncome / 100000) / 1.7);
  return Math.max(0, Math.min(50, raw));
}

/**
 * Determine risk profile based on age and annual income using composite scoring.
 *
 * Score ranges:
 *   80–100 → Aggressive
 *   60–79  → Moderate-Aggressive
 *   40–59  → Moderate
 *   20–39  → Conservative-Moderate
 *   0–19   → Conservative
 *
 * @param {number} age - User's age in years
 * @param {number} annualIncome - User's gross annual income in ₹
 * @returns {{ category, description, recommendedEquityAllocation, riskScore }}
 */
export function getRiskProfile(age, annualIncome) {
  // Input guards
  const safeAge = Math.max(18, Math.min(80, Number(age) || 30));
  const safeIncome = Math.max(0, Number(annualIncome) || 0);

  const score = ageScore(safeAge) + incomeScore(safeIncome);

  let profileKey;
  if (score >= 80)      profileKey = 'Aggressive';
  else if (score >= 60) profileKey = 'Moderate-Aggressive';
  else if (score >= 40) profileKey = 'Moderate';
  else if (score >= 20) profileKey = 'Conservative-Moderate';
  else                  profileKey = 'Conservative';

  return {
    ...RISK_PROFILES[profileKey],
    riskScore: Math.round(score),
  };
}

/**
 * Encode risk category to numeric score for ML features.
 *
 * @param {string} category
 * @returns {number} 0-4 scale
 */
export function encodeRiskCategory(category) {
  const map = {
    'Conservative': 0,
    'Conservative-Moderate': 1,
    'Moderate': 2,
    'Moderate-Aggressive': 3,
    'Aggressive': 4,
  };
  return map[category] ?? 2;
}
