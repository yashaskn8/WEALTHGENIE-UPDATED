"""
WealthGenie Feature Engineering
Transforms raw financial profile inputs into ML-ready features
with domain-specific derived variables.
"""
import numpy as np
from dataclasses import dataclass
from typing import Optional

@dataclass
class EnrichedFeatures:
    """Full feature set for ML prediction."""
    # Original features
    age: int
    annual_income: float
    monthly_savings: float
    risk_score: int

    # Derived features
    savings_rate: float          # monthly_savings / (annual_income/12)
    income_bracket: int          # 0=<5L, 1=5-10L, 2=10-20L, 3=20L+
    age_bracket: int             # 0=18-30, 1=31-45, 2=46-60, 3=60+
    retirement_years: int        # 60 - age (years to retirement)
    investable_ratio: float      # savings / income ratio normalised
    risk_age_score: float        # composite: risk_score × (1/age_factor)

def engineer_features(
    age: int,
    annual_income: float,
    monthly_savings: float,
    risk_score: int
) -> EnrichedFeatures:
    """
    Apply domain-specific feature engineering to raw inputs.

    Financial rationale for each derived feature:

    savings_rate: The fraction of monthly income being saved is
    a stronger signal than absolute savings amount. A person
    saving ₹15K on ₹30K income is more financially committed
    than one saving ₹15K on ₹1.5L income.

    income_bracket: Discrete income brackets align with Indian
    tax slab boundaries and investment product accessibility.
    ELSS and NPS benefits differ materially across brackets.

    retirement_years: Critical for time-horizon-appropriate
    recommendations. A 28-year-old has 32 years to compound;
    a 55-year-old has 5. The same risk score means different
    things across these horizons.

    risk_age_score: Composite that captures the interaction
    between stated risk appetite and remaining investment
    horizon. High risk score at age 55 is less defensible
    than high risk score at age 28.
    """
    monthly_income = annual_income / 12

    # Savings rate: proportion of monthly income being invested
    savings_rate = monthly_savings / monthly_income if monthly_income > 0 else 0
    savings_rate = min(savings_rate, 1.0)  # Cap at 100%

    # Income bracket aligned with Indian tax slab boundaries
    if annual_income < 500000:
        income_bracket = 0
    elif annual_income < 1000000:
        income_bracket = 1
    elif annual_income < 2000000:
        income_bracket = 2
    else:
        income_bracket = 3

    # Age bracket
    if age < 30:
        age_bracket = 0
    elif age < 46:
        age_bracket = 1
    elif age < 61:
        age_bracket = 2
    else:
        age_bracket = 3

    # Years to retirement (capped at 0 for those already retired)
    retirement_years = max(0, 60 - age)

    # Investable ratio: savings as fraction of annual income
    investable_ratio = (monthly_savings * 12) / annual_income \
        if annual_income > 0 else 0

    # Risk-age composite: scales risk score by proximity to retirement
    # Higher = more aggressive relative to time horizon
    age_factor = max(1, age / 30)
    risk_age_score = round(risk_score / age_factor, 4)

    return EnrichedFeatures(
        age=age,
        annual_income=annual_income,
        monthly_savings=monthly_savings,
        risk_score=risk_score,
        savings_rate=round(savings_rate, 4),
        income_bracket=income_bracket,
        age_bracket=age_bracket,
        retirement_years=retirement_years,
        investable_ratio=round(investable_ratio, 4),
        risk_age_score=risk_age_score,
    )

def to_model_array(features: EnrichedFeatures) -> np.ndarray:
    """
    Convert EnrichedFeatures to the 4-feature array expected
    by the trained model (original features only).
    The enriched features are used for explanation context,
    not for the current model inference.
    """
    return np.array([[
        features.age,
        features.annual_income,
        features.monthly_savings,
        features.risk_score,
    ]])

def to_full_array(features: EnrichedFeatures) -> np.ndarray:
    """
    Convert to full 10-feature array for the retrained model.
    Used when retraining with enriched features.
    """
    return np.array([[
        features.age,
        features.annual_income,
        features.monthly_savings,
        features.risk_score,
        features.savings_rate,
        features.income_bracket,
        features.age_bracket,
        features.retirement_years,
        features.investable_ratio,
        features.risk_age_score,
    ]])
