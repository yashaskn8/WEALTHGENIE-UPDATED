from pydantic import BaseModel, Field
from typing import Dict, List, Optional


class PredictRequest(BaseModel):
    age: int = Field(..., ge=18, le=100, description="User age in years")
    annual_income: float = Field(..., gt=0, description="Annual income in INR")
    monthly_savings: float = Field(..., ge=0, description="Monthly savings in INR")
    risk_category: str = Field(..., description="Risk category: Conservative, Conservative-Moderate, Moderate, Moderate-Aggressive, Aggressive")


class FeatureContribution(BaseModel):
    feature: str
    display_name: str
    shap_value: float
    direction: str
    magnitude: float
    raw_value: float


class Explanation(BaseModel):
    predicted_class: str
    confidence: float
    feature_contributions: List[FeatureContribution]
    top_reason: str


class PredictResponse(BaseModel):
    primary: str
    secondary: str
    tertiary: str
    confidence_scores: Dict[str, float]
    decision_path: List[str]
    model_used: Optional[str] = "RandomForest"
    explanation: Optional[Explanation] = None


class HealthResponse(BaseModel):
    status: str
    model_version: str
    model_accuracy: Optional[float] = None
