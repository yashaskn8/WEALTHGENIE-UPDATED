import axios from 'axios';
import { getCache, setCache } from '../config/redis.js';
import crypto from 'crypto';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

function hashProfile(profile) {
  return crypto.createHash('md5').update(JSON.stringify(profile)).digest('hex');
}

export async function generateAdvisory(userContext) {
  const { age, annualIncome, monthlySavings, taxSlab, riskCategory, instruments, horizon, shapExplanation } = userContext;
  const cacheKey = `advisory:${hashProfile(userContext)}`;

  // Check Redis cache (1 hour TTL)
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const instrumentList = instruments.map(i => `${i.name} (${i.type}) — post-tax return: ${i.postTaxReturn}%`).join('\n  ');

  // Build SHAP context block if available
  let shapContext = '';
  if (shapExplanation && shapExplanation.feature_contributions) {
    const contributions = shapExplanation.feature_contributions
      .map(c => `${c.display_name}: ${c.direction} recommendation by ${c.magnitude}`)
      .join(', ');
    shapContext = `\n\nML Model Reasoning:\nThe AI model's top reason for this recommendation was: ${shapExplanation.top_reason}\nThe feature contributions in order of importance were: ${contributions}.\nIncorporate this reasoning naturally into your advisory paragraph. Do not use technical jargon like 'SHAP values'. Write as if you are a human financial advisor explaining your logic.`;
  }

  const prompt = `You are a certified Indian financial advisor. Based on the following investor profile, write a 3-paragraph advisory note (under 300 words total):

Investor Profile:
- Age: ${age} years
- Annual Income: ₹${annualIncome.toLocaleString('en-IN')}
- Monthly Savings: ₹${monthlySavings.toLocaleString('en-IN')}
- Tax Slab: ${(taxSlab * 100).toFixed(0)}% marginal rate
- Risk Category: ${riskCategory}
- Investment Horizon: ${horizon} years

Top 3 Recommended Instruments:
  ${instrumentList}
${shapContext}
Instructions:
Paragraph 1: Explain WHY these specific instruments suit this investor's profile (age, income, risk tolerance).
Paragraph 2: Highlight 2-3 KEY RISKS the investor should be aware of.
Paragraph 3: Provide ONE specific, actionable next step the investor should take immediately.

Use simple English. Reference specific numbers from the profile. Do not use bullet points. Keep it warm and professional.`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { text: 'Gemini API key not configured. Please set GEMINI_API_KEY in your .env file.', cached: false };

    const response = await axios.post(`${GEMINI_API_URL}?key=${apiKey}`, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
    }, { timeout: 15000 });

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate advisory.';
    const result = { text, cached: false, generatedAt: new Date().toISOString() };

    // Cache for 1 hour
    await setCache(cacheKey, result, 3600);
    return result;
  } catch (err) {
    console.error('Gemini API error:', err.message);
    return { text: getFallbackAdvisory(userContext), cached: false, fallback: true };
  }
}

function getFallbackAdvisory({ age, riskCategory, instruments }) {
  const topInst = instruments[0]?.name || 'diversified instruments';
  return `Based on your profile as a ${age}-year-old ${riskCategory} investor, ${topInst} aligns well with your financial goals. The recommended instruments balance growth potential with your risk tolerance, optimizing for post-tax returns under the current Indian tax regime.\n\nKey risks include market volatility affecting equity-linked instruments, interest rate changes impacting fixed-income returns, and inflation eroding purchasing power over your investment horizon. Diversification across the recommended instruments helps mitigate these risks.\n\nAs an immediate next step, consider starting a monthly SIP in your top-recommended instrument to benefit from rupee cost averaging and begin building your wealth systematically.`;
}

export async function chatWithGemini(message, profileContext) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return 'Gemini API key not configured.';

    const systemPrompt = `You are WealthGenie, an AI financial advisor for Indian retail investors. The user's profile: Age ${profileContext.age}, Income ₹${profileContext.annualIncome}/yr, Risk: ${profileContext.riskCategory}. Answer concisely in 2-3 sentences. Only give financial advice relevant to Indian markets and tax laws.`;

    const res = await axios.post(`${GEMINI_API_URL}?key=${apiKey}`, {
      contents: [{ parts: [{ text: `${systemPrompt}\n\nUser question: ${message}` }] }],
      generationConfig: { maxOutputTokens: 300, temperature: 0.6 },
    }, { timeout: 10000 });

    return res.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not process that question.';
  } catch (err) {
    return 'Sorry, the AI service is temporarily unavailable. Please try again.';
  }
}
