"""
WealthGenie ML Training Pipeline
Generates 5000-row synthetic dataset, trains RandomForest + DecisionTree,
prints classification report, and saves model.pkl + label_encoder.pkl.
"""

import os
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import classification_report, accuracy_score
import joblib

np.random.seed(42)
N = 5000

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
MODEL_DIR = os.path.dirname(__file__)


def encode_risk(cat: str) -> int:
    mapping = {
        'Conservative': 0,
        'Conservative-Moderate': 1,
        'Moderate': 2,
        'Moderate-Aggressive': 3,
        'Aggressive': 4,
    }
    return mapping.get(cat, 2)


def assign_risk_category(age: int, income: float) -> str:
    if age < 30 and income > 600000:
        return 'Aggressive'
    elif age < 30 and income <= 600000:
        return 'Moderate-Aggressive'
    elif 30 <= age <= 45 and income > 1000000:
        return 'Moderate'
    elif 30 <= age <= 45 and income <= 1000000:
        return 'Conservative-Moderate'
    else:
        return 'Conservative'


def assign_instruments(risk: str, age: int, income: float, savings: float):
    """Deterministic instrument assignment with noise for realistic training data."""
    r = np.random.random()

    if risk == 'Aggressive':
        if income > 1000000:
            primary = 'ELSS' if r < 0.65 else 'Equity_MF'
        else:
            primary = 'Equity_MF' if r < 0.60 else 'ELSS'
        secondary = 'ETF' if r < 0.5 else 'Equity_MF'
        tertiary = 'Debt_MF'

    elif risk == 'Moderate-Aggressive':
        primary = 'Equity_MF' if r < 0.55 else ('ETF' if r < 0.80 else 'ELSS')
        secondary = 'ELSS' if r < 0.5 else 'ETF'
        tertiary = 'Debt_MF' if r < 0.7 else 'FD'

    elif risk == 'Moderate':
        primary = 'ETF' if r < 0.50 else ('Equity_MF' if r < 0.75 else 'Debt_MF')
        secondary = 'Debt_MF' if r < 0.5 else 'ELSS'
        tertiary = 'FD' if r < 0.6 else 'RBI_Bond'

    elif risk == 'Conservative-Moderate':
        primary = 'Debt_MF' if r < 0.50 else ('FD' if r < 0.80 else 'ETF')
        secondary = 'FD' if r < 0.5 else 'RBI_Bond'
        tertiary = 'ETF' if r < 0.6 else 'Debt_MF'

    else:  # Conservative
        if age > 60:
            primary = 'RBI_Bond' if r < 0.55 else 'FD'
        else:
            primary = 'FD' if r < 0.55 else ('Debt_MF' if r < 0.80 else 'RBI_Bond')
        secondary = 'Debt_MF' if r < 0.5 else 'FD'
        tertiary = 'RBI_Bond' if r < 0.6 else 'Debt_MF'

    # Avoid duplicates
    all_instruments = ['ELSS', 'Equity_MF', 'ETF', 'FD', 'RBI_Bond', 'Debt_MF']
    if secondary == primary:
        for inst in all_instruments:
            if inst != primary:
                secondary = inst
                break
    if tertiary == primary or tertiary == secondary:
        for inst in all_instruments:
            if inst != primary and inst != secondary:
                tertiary = inst
                break

    return primary, secondary, tertiary


def generate_dataset():
    """Generate 5000 synthetic investor profiles."""
    ages = np.random.randint(18, 75, N)
    incomes = np.random.choice([
        *np.random.randint(200000, 500000, N // 5),
        *np.random.randint(500000, 1000000, N // 4),
        *np.random.randint(1000000, 2500000, N // 4),
        *np.random.randint(300000, 800000, N // 5),
        *np.random.randint(600000, 1500000, N - N // 5 - N // 4 - N // 4 - N // 5),
    ], N, replace=True).astype(float)

    savings_ratios = np.clip(np.random.normal(0.20, 0.08, N), 0.05, 0.50)
    monthly_savings = (incomes / 12 * savings_ratios).astype(int)

    rows = []
    for i in range(N):
        age = int(ages[i])
        income = float(incomes[i])
        saving = float(monthly_savings[i])
        risk_cat = assign_risk_category(age, income)
        primary, secondary, tertiary = assign_instruments(risk_cat, age, income, saving)
        rows.append({
            'age': age,
            'annual_income': income,
            'monthly_savings': saving,
            'risk_category': risk_cat,
            'primary_instrument': primary,
            'secondary_instrument': secondary,
            'tertiary_instrument': tertiary,
        })

    df = pd.DataFrame(rows)
    return df


def train():
    print("=" * 60)
    print("WealthGenie ML Training Pipeline")
    print("=" * 60)

    # Generate and save dataset
    os.makedirs(DATA_DIR, exist_ok=True)
    df = generate_dataset()
    csv_path = os.path.join(DATA_DIR, 'investment_profiles.csv')
    df.to_csv(csv_path, index=False)
    print(f"\n[OK] Generated {len(df)} training samples -> {csv_path}")
    print(f"\nClass distribution:\n{df['primary_instrument'].value_counts()}")

    # Prepare features
    le = LabelEncoder()
    df['risk_score'] = df['risk_category'].apply(encode_risk)
    y = le.fit_transform(df['primary_instrument'])

    X = df[['age', 'annual_income', 'monthly_savings', 'risk_score']].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Train RandomForest
    print("\n" + "=" * 60)
    print("Training RandomForestClassifier (n_estimators=200)")
    print("=" * 60)
    rf_pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('clf', RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1)),
    ])
    rf_pipeline.fit(X_train, y_train)
    rf_pred = rf_pipeline.predict(X_test)
    rf_acc = accuracy_score(y_test, rf_pred)
    print(f"\nRandomForest Accuracy: {rf_acc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, rf_pred, target_names=le.classes_))

    # Train DecisionTree (for interpretability)
    print("=" * 60)
    print("Training DecisionTreeClassifier (for interpretability)")
    print("=" * 60)
    dt_pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('clf', DecisionTreeClassifier(max_depth=8, random_state=42)),
    ])
    dt_pipeline.fit(X_train, y_train)
    dt_pred = dt_pipeline.predict(X_test)
    dt_acc = accuracy_score(y_test, dt_pred)
    print(f"\nDecisionTree Accuracy: {dt_acc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, dt_pred, target_names=le.classes_))

    # Save models
    os.makedirs(MODEL_DIR, exist_ok=True)
    model_path = os.path.join(MODEL_DIR, 'model.pkl')
    le_path = os.path.join(MODEL_DIR, 'label_encoder.pkl')
    dt_path = os.path.join(MODEL_DIR, 'decision_tree.pkl')

    joblib.dump(rf_pipeline, model_path)
    joblib.dump(le, le_path)
    joblib.dump(dt_pipeline, dt_path)

    print(f"\n[OK] RandomForest pipeline saved -> {model_path}")
    print(f"[OK] LabelEncoder saved -> {le_path}")
    print(f"[OK] DecisionTree pipeline saved -> {dt_path}")
    print(f"\n{'=' * 60}")
    print(f"RF Accuracy: {rf_acc:.4f} | DT Accuracy: {dt_acc:.4f}")

    if rf_acc > 0.80:
        print("[OK] Model exceeds 80% accuracy threshold")
    else:
        print("[WARN] Model below 80% accuracy -- consider tuning hyperparameters")
    print("=" * 60)

    return rf_acc, dt_acc


if __name__ == '__main__':
    train()
