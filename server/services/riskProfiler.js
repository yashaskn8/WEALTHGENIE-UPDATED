/**
 * WealthGenie Risk Profiler
 * Categorizes users into risk buckets based on age + annual income.
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
 * Determine risk profile based on age and annual income.
 *
 * @param {number} age - User's age in years
 * @param {number} annualIncome - User's gross annual income in ₹
 * @returns {{ category, description, recommendedEquityAllocation }}
 */
export function getRiskProfile(age, annualIncome) {
  if (age < 30 && annualIncome > 600000) {
    return { ...RISK_PROFILES['Aggressive'] };
  }
  if (age < 30 && annualIncome <= 600000) {
    return { ...RISK_PROFILES['Moderate-Aggressive'] };
  }
  if (age >= 30 && age <= 45 && annualIncome > 1000000) {
    return { ...RISK_PROFILES['Moderate'] };
  }
  if (age >= 30 && age <= 45 && annualIncome <= 1000000) {
    return { ...RISK_PROFILES['Conservative-Moderate'] };
  }
  // Age > 45
  return { ...RISK_PROFILES['Conservative'] };
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
