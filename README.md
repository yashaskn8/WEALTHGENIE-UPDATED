# WealthGenie 🧞‍♂️💰

## AI-Powered Financial Advisory Platform for Indian Retail Investors

WealthGenie is a context-aware, tax-optimized, AI-powered financial advisory web application designed for Indian retail investors. Built as a final-year CSE capstone project at RNSIT, Bengaluru, the platform delivers personalized, production-grade investment strategies grounded in machine learning explainability and probabilistic wealth forecasting.

### 🦄 Unicorn Features (Advanced Engineering)
- **SHAP Explainability Layer**: Uses `shap.TreeExplainer` in Python to provide exact feature-level attribution for every ML recommendation, ensuring total transparency in the AI's decision-making process.
- **Monte Carlo Simulation Engine**: A high-performance probabilistic engine running 10,000 simulations per instrument using the **Box-Muller transform** to generate normal distribution returns, providing P10 to P90 wealth confidence bands.
- **Goal-Based Planning**: Automated financial roadmap builder that computes required SIPs via a reverse-compounding formula and returns the **Probability of Success** for specific life goals (Retirement, Home, etc.).
- **Live Market Data Layer**: Real-time integration with **AMFI (NAV dataset)** and **Yahoo Finance (Index stats)** to automate instrument parameters and volatility coefficients, moving beyond static hardcoded rates.

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   React + Vite  │────▶│  Express.js API   │────▶│  MongoDB Atlas   │
│   (Port 5173)   │     │  (Port 5000)      │     │  (Cloud DB)      │
└─────────────────┘     └────────┬───────────┘     └──────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
             ┌───────────┐ ┌─────────┐ ┌───────────┐
             │  FastAPI   │ │  Redis  │ │  Gemini   │
             │  ML Model  │ │  Cache  │ │  1.5 API  │
             │ (Port 8000)│ │ (6379)  │ │  (Cloud)  │
             └───────────┘ └─────────┘ └───────────┘
```

---

## 🛠️ Tech Stack

| Layer      | Technology                                      |
|------------|------------------------------------------------|
| Frontend   | React 18 + Vite + Recharts + Framer Motion     |
| Backend    | Node.js 20 + Express.js + Redis                 |
| Database   | MongoDB Atlas (Mongoose ODM)                    |
| ML Engine  | Python 3.11 + FastAPI + SHAP + scikit-learn     |
| AI Layer   | Google Gemini 1.5 Flash API                     |
| Auth       | JWT + bcryptjs (12 rounds)                      |
| Live Data  | AMFI (Public NAV) + Yahoo Finance (Index)       |

---

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** ≥ 20
- **Python** ≥ 3.11
- **MongoDB Atlas** account (free tier works)
- **Redis** (optional — app falls back gracefully without it)
- **Google Gemini API Key** (for AI advisory features)

### 1. Clone the Repository

```bash
git clone https://github.com/yashaskn8/WEALTHGENIE-UPDATED.git
cd WEALTHGENIE-UPDATED
```

### 2. Install Frontend Dependencies

```bash
cd reactapp
npm install
```

### 3. Install Backend Dependencies

```bash
cd ../server
npm install
```

### 4. Configure Environment Variables

```bash
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, Gemini API key, etc.
```

### 5. Seed the Database

```bash
npm run seed
```

### 6. Install ML Service Dependencies

```bash
cd ../ml-service
pip install -r requirements.txt
```

### 7. Train the ML Model

```bash
python model/train.py
```

### 8. Start All Services

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 — ML Service:**
```bash
cd ml-service
python main.py
```

**Terminal 3 — Frontend:**
```bash
cd reactapp
npm run dev
```

Access the app at: **http://localhost:5173**

---

## 📡 API Reference

### Authentication

#### `POST /api/auth/register`
```json
// Request
{ "name": "Pranav", "email": "pranav@example.com", "password": "SecureP@ss123" }

// Response (201)
{ "token": "eyJhbG...", "user": { "id": "...", "name": "Pranav", "email": "pranav@example.com" } }
```

#### `POST /api/auth/login`
```json
// Request
{ "email": "pranav@example.com", "password": "SecureP@ss123" }

// Response (200)
{ "token": "eyJhbG...", "user": { "id": "...", "name": "Pranav", "email": "pranav@example.com" } }
```

### Profile

#### `POST /api/profile/build` 🔒
```json
// Request (Authorization: Bearer <token>)
{ "monthly_income": 65000, "age": 28, "monthly_savings": 15000, "regime": "new" }

// Response (201)
{
  "profileId": "...",
  "taxSlab": 0.10,
  "effectiveTaxRate": 3.85,
  "riskCategory": "Moderate-Aggressive",
  "annual_income": 780000,
  "investable_amount": 15000
}
```

### Recommendations

#### `POST /api/recommend` 🔒
```json
// Request
{ "profileId": "6650abc..." }

// Response
{
  "instruments": [
    { "name": "Equity Mutual Fund", "type": "Equity_MF", "nominalReturn": 12.5, "postTaxReturn": 11.2, "riskLevel": "High", "lockIn": 0 }
  ],
  "ranked": true,
  "advisory_text": "Based on your profile as a 28-year-old...",
  "confidence_scores": { "Equity_MF": 0.55, "ETF": 0.25 }
}
```

### Instruments

#### `GET /api/instruments?type=FD&sort=rate&order=desc&limit=10`
```json
// Response
{
  "instruments": [...],
  "total": 15,
  "page": 1,
  "totalPages": 2
}
```

### Projections

#### `POST /api/projection` 🔒
```json
// Request
{ "profileId": "...", "instruments": ["FD", "ELSS", "Equity_MF"], "monthly_investment": 10000, "years": [5, 10, 15, 20] }

// Response
{
  "labels": [5, 10, 15, 20],
  "chartData": [
    { "year": 5, "invested": 600000, "FD": 698000, "ELSS": 810000, "Equity_MF": 805000 }
  ]
}
```

---

## ✨ Features

| Feature                            | Category         |
|------------------------------------|------------------|
| SHAP Explainability Dashboard      | ML Intelligence  |
| Monte Carlo Probability Projections| Wealth Analysis  |
| Goal-Based Success Tracking        | Financial Planning|
| Live AMFI/Yahoo Market Data Sync   | Real-time Data   |
| FY2025-26 Tax Engine (New + Old)   | Taxation         |
| Gemini AI Advisory Generation      | Generative AI    |
| Portfolio Rebalancer & SIP Planner | Active Management|
| Multi-Instrument Comparison        | Market Analysis  |
| Risk Quiz & User Profiling         | Onboarding       |

---

## 📸 Screenshots

*Screenshots to be added after deployment.*

---

## 👥 Team

**Department of Computer Science & Engineering**
**RNS Institute of Technology, Bengaluru**

| Role           | Name              |
|----------------|-------------------|
| Developer      | Pranav Kumar      |
| Developer      | Yashas K N        |
| Guide          | Faculty, CSE Dept |

---

## 📄 License

This project is developed as an academic capstone and is not licensed for commercial use.
