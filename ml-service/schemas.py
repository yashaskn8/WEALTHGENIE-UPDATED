from pydantic import BaseModel, Field
from typing import Dict, List, Optional


class PredictRequest(BaseModel):
    age: int = Field(..., ge=18, le=100, description="User age in years")
    annual_income: float = Field(..., gt=0, description="Annual income in INR")
    monthly_savings: float = Field(..., ge=0, description="Monthly savings in INR")
    risk_category: str = Field(..., description="Risk category: Conservative, Conservative-Moderate, Moderate, Moderate-Aggressive, Aggressive")


class PredictResponse(BaseModel):
    primary: str
    secondary: str
    tertiary: str
    confidence_scores: Dict[str, float]
    decision_path: List[str]
    model_used: Optional[str] = "RandomForest"


class HealthResponse(BaseModel):
    status: str
    model_version: str
    model_accuracy: Optional[float] = None
