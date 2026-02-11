"""
DeepSkyn - Churn Prediction Script
====================================
Called by the NestJS backend to predict churn risk for users.

Usage:
  python predict.py '{"users": [{"id": "...", "interactionCount": 5, "daysSinceLastActivity": 30, "sessionCount": 2, "accountAgeDays": 60}]}'

Output (JSON to stdout):
  {"predictions": [{"id": "...", "churnProbability": 0.85, "riskLevel": "critical", "isChurned": true}]}
"""

import sys
import os
import json
import warnings
import numpy as np
import joblib

warnings.filterwarnings("ignore")

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")


def load_model():
    """Load trained model, scaler, and metadata."""
    model_path = os.path.join(MODEL_DIR, "churn_model.joblib")
    scaler_path = os.path.join(MODEL_DIR, "scaler.joblib")
    metadata_path = os.path.join(MODEL_DIR, "model_metadata.json")

    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Model not found at {model_path}. Run train_model.py first."
        )

    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)

    with open(metadata_path, "r") as f:
        metadata = json.load(f)

    return model, scaler, metadata


def engineer_features_single(user: dict) -> list:
    """
    Apply the same feature engineering as training.
    Must match FEATURE_COLUMNS order exactly.
    """
    interaction_count = user.get("interactionCount", 0)
    days_since = user.get("daysSinceLastActivity", 999)
    session_count = user.get("sessionCount", 0)
    account_age = user.get("accountAgeDays", 1)

    interaction_per_session = interaction_count / (session_count + 1)
    activity_decay = np.exp(-0.05 * days_since)
    engagement_score = (
        interaction_count * 0.4
        + session_count * 0.3
        + (1 / (days_since + 1)) * 100 * 0.3
    )
    is_inactive = 1 if days_since > 14 else 0
    session_frequency = session_count / (account_age + 1)
    interaction_intensity = interaction_count / (account_age + 1)
    log_interactions = np.log1p(interaction_count)
    log_sessions = np.log1p(session_count)
    log_days_since = np.log1p(days_since)

    return [
        interaction_count,
        days_since,
        session_count,
        interaction_per_session,
        activity_decay,
        engagement_score,
        is_inactive,
        session_frequency,
        interaction_intensity,
        log_interactions,
        log_sessions,
        log_days_since,
    ]


def get_risk_level(probability: float, thresholds: dict) -> str:
    """Determine risk level based on probability thresholds."""
    if probability >= thresholds["critical"]:
        return "critical"
    elif probability >= thresholds["high"]:
        return "high"
    elif probability >= thresholds["medium"]:
        return "medium"
    else:
        return "low"


def predict(users: list) -> list:
    """
    Predict churn risk for a list of users.
    Each user dict must have: id, interactionCount, daysSinceLastActivity, sessionCount, accountAgeDays
    """
    model, scaler, metadata = load_model()
    threshold = metadata["optimal_threshold"]
    risk_thresholds = metadata["risk_thresholds"]

    # Build feature matrix
    features = []
    for user in users:
        features.append(engineer_features_single(user))

    X = np.array(features)
    X_scaled = scaler.transform(X)

    # Predict probabilities
    probabilities = model.predict_proba(X_scaled)[:, 1]

    # Build results
    predictions = []
    for i, user in enumerate(users):
        prob = float(probabilities[i])
        predictions.append({
            "id": user["id"],
            "churnProbability": round(prob, 4),
            "riskLevel": get_risk_level(prob, risk_thresholds),
            "isChurned": prob >= threshold,
        })

    return predictions


def main():
    """Entry point when called from NestJS."""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input provided"}))
        sys.exit(1)

    try:
        input_data = json.loads(sys.argv[1])
        users = input_data.get("users", [])

        if not users:
            print(json.dumps({"predictions": [], "message": "No users to predict"}))
            sys.exit(0)

        results = predict(users)
        output = {
            "predictions": results,
            "totalUsers": len(results),
            "atRiskCount": sum(1 for r in results if r["riskLevel"] in ("high", "critical")),
            "criticalCount": sum(1 for r in results if r["riskLevel"] == "critical"),
        }

        print(json.dumps(output))

    except FileNotFoundError as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"Prediction failed: {str(e)}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
