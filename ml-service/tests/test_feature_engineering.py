import pytest
import numpy as np
from feature_engineering import engineer_features, to_model_array

def test_savings_rate_computation():
    f = engineer_features(32, 780000, 12000, 3)
    expected = 12000 / (780000 / 12)
    assert abs(f.savings_rate - expected) < 0.001

def test_savings_rate_capped_at_one():
    # Savings exceeding income should cap at 1.0
    f = engineer_features(32, 120000, 20000, 3)
    assert f.savings_rate <= 1.0

def test_retirement_years_for_age_32():
    f = engineer_features(32, 780000, 12000, 3)
    assert f.retirement_years == 28

def test_retirement_years_never_negative():
    f = engineer_features(65, 500000, 5000, 0)
    assert f.retirement_years == 0

def test_income_bracket_boundaries():
    assert engineer_features(32, 490000, 5000, 1).income_bracket == 0
    assert engineer_features(32, 750000, 5000, 1).income_bracket == 1
    assert engineer_features(32, 1500000, 5000, 1).income_bracket == 2
    assert engineer_features(32, 2500000, 5000, 1).income_bracket == 3

def test_model_array_shape():
    f = engineer_features(32, 780000, 12000, 3)
    arr = to_model_array(f)
    assert arr.shape == (1, 4)

def test_risk_age_score_decreases_with_age():
    young = engineer_features(25, 780000, 12000, 4).risk_age_score
    older = engineer_features(50, 780000, 12000, 4).risk_age_score
    assert young > older
