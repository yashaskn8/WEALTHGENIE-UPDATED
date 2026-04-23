/**
 * WealthGenie API Client
 * Axios instance configured for the Express backend.
 * Token is stored in memory (not localStorage) for security.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

export function clearAuthToken() {
  authToken = null;
}

async function request(method, path, data = null, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const config = { method, headers, ...options };
  if (data) config.body = JSON.stringify(data);

  const res = await fetch(url, config);
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || `Request failed with status ${res.status}`);
  }
  return json;
}

// ─── AUTH ─────────────────────────────────────────────────
export async function register(name, email, password) {
  const data = await request('POST', '/auth/register', { name, email, password });
  if (data.token) setAuthToken(data.token);
  return data;
}

export async function login(email, password) {
  const data = await request('POST', '/auth/login', { email, password });
  if (data.token) setAuthToken(data.token);
  return data;
}

// ─── PROFILE ─────────────────────────────────────────────
export async function buildProfile(monthlyIncome, age, monthlySavings, regime = 'new') {
  return request('POST', '/profile/build', {
    monthly_income: monthlyIncome,
    age,
    monthly_savings: monthlySavings,
    regime,
  });
}

// ─── RECOMMENDATIONS ─────────────────────────────────────
export async function getRecommendations(profileId) {
  return request('POST', '/recommend', { profileId });
}

// ─── INSTRUMENTS ─────────────────────────────────────────
export async function getInstruments(type, sort = 'rate', order = 'desc', limit = 20) {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  params.set('sort', sort);
  params.set('order', order);
  params.set('limit', limit);
  return request('GET', `/instruments?${params.toString()}`);
}

// ─── PROJECTIONS ─────────────────────────────────────────
export async function getProjections(profileId, instruments, monthlyInvestment, years) {
  return request('POST', '/projection', {
    profileId,
    instruments,
    monthly_investment: monthlyInvestment,
    years: years || [5, 10, 15, 20],
  });
}

// ─── HEALTH ──────────────────────────────────────────────
export async function healthCheck() {
  return request('GET', '/health');
}
