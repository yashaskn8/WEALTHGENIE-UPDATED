# WealthGenie 🧞‍♂️💰

## AI-Powered Financial Advisory Platform for Indian Retail Investors

WealthGenie is a context-aware, tax-optimized, AI-powered financial advisory web application designed for Indian retail investors. Built as a final-year CSE capstone project at RNSIT, Bengaluru, the platform takes three simple inputs — monthly income, age, and savings capacity — and delivers personalized, post-tax investment recommendations powered by machine learning and Google Gemini AI.

The system implements the complete FY2025-26 Indian tax regime (both New and Old), computes real post-tax returns across 16 investment instruments (FDs, ELSS, Equity MFs, ETFs, Debt MFs, RBI Bonds, G-Secs, PPF, NPS, and more), and generates long-term wealth projections. A Random Forest ML model trained on 5,000 synthetic investor profiles ranks instruments by suitability, while Gemini 1.5 Flash provides plain-English advisory summaries explaining *why* each recommendation fits the user's profile.

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
| Backend    | Node.js 20 + Express.js                         |
| Database   | MongoDB Atlas (Mongoose ODM)                    |
| ML Engine  | Python 3.11 + FastAPI + scikit-learn            |
| AI Layer   | Google Gemini 1.5 Flash API                     |
| Auth       | JWT + bcryptjs (12 rounds)                      |
| Caching    | Redis (24hr TTL for instruments, 1hr for AI)    |
| Env Mgmt   | dotenv (.env — never committed)                 |

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

| Feature                            | Objective |
|------------------------------------|-----------|
| Financial Profile Builder          | O1        |
| FY2025-26 Tax Engine (New + Old)   | O2        |
| Risk Profiler (Age + Income)       | O1        |
| Post-Tax Return Calculator         | O2        |
| ML Instrument Recommendations      | O3        |
| Gemini AI Advisory Summaries       | O4        |
| Wealth Projections (5–20yr SIP)    | O5        |
| Instrument Comparison Dashboard    | O6        |
| JWT Authentication                 | O1        |
| Redis Caching (FD rates, AI text)  | O5        |
| Interactive Recharts Charts        | O6        |
| Risk Quiz Modal                    | O1        |
| Tax Regime Comparison              | O2        |
| Genie Chat (Gemini Q&A)           | O4        |
| Portfolio Rebalancer               | O6        |
| Step-Up SIP Planner                | O5        |

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
