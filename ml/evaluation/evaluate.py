"""
CycloneGuard AI - Real Model Evaluation Script (Phase 3)

Calculates genuine evaluation metrics on the held-out test split.
Computes:
- Accuracy
- Precision (macro & weighted)
- Recall (macro & weighted)
- F1-Score (macro & weighted)
- ROC-AUC (multi-class OVR)
- Confusion Matrix
- Mean Absolute Error & R² (for risk score regression)

Saves results to ml/evaluation/metrics.json.
CRITICAL: Do not invent or hardcode metrics. All numbers are computed directly from test split.
"""

import os
import json
import datetime
import pandas as pd
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    classification_report,
    confusion_matrix,
    mean_absolute_error,
    r2_score,
)
import joblib

from ml.preprocessing.preprocessor import FeaturePreprocessor, FEATURE_NAMES

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEST_DATA_PATH = os.path.join(BASE_DIR, "data", "test_split.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
MODEL_FILE = os.path.join(MODELS_DIR, "baseline_rf_model.joblib")
PREPROCESSOR_FILE = os.path.join(MODELS_DIR, "preprocessor.joblib")
EVAL_DIR = os.path.join(BASE_DIR, "evaluation")
METRICS_FILE = os.path.join(EVAL_DIR, "metrics.json")

def evaluate_model():
    print("=" * 60)
    print("CycloneGuard AI - Evaluating Random Forest Baseline Model")
    print("=" * 60)

    if not os.path.exists(MODEL_FILE) or not os.path.exists(PREPROCESSOR_FILE):
        raise FileNotFoundError(
            f"Trained model artifacts not found. Please run ml/training/train.py first."
        )

    if not os.path.exists(TEST_DATA_PATH):
        raise FileNotFoundError(
            f"Test data split not found at {TEST_DATA_PATH}. Please run ml/training/train.py first."
        )

    # 1. Load model, preprocessor, and test set
    print(f"Loading model payload from: {MODEL_FILE}")
    model_payload = joblib.load(MODEL_FILE)
    clf = model_payload["classifier"]
    reg = model_payload["regressor"]
    classes = list(model_payload["classes"])

    print(f"Loading preprocessor from: {PREPROCESSOR_FILE}")
    preprocessor = FeaturePreprocessor.load(PREPROCESSOR_FILE)

    print(f"Loading test split from: {TEST_DATA_PATH}")
    test_df = pd.read_csv(TEST_DATA_PATH)
    X_test = test_df[FEATURE_NAMES]
    y_cat_true = test_df["risk_category"]
    y_score_true = test_df["risk_score"]

    print(f"Evaluating on {len(test_df)} test samples...")

    # 2. Transform features
    X_test_scaled = preprocessor.transform(X_test)

    # 3. Predict categories and probabilities
    y_cat_pred = clf.predict(X_test_scaled)
    y_cat_proba = clf.predict_proba(X_test_scaled)

    # 4. Predict continuous risk scores
    y_score_pred = reg.predict(X_test_scaled)

    # 5. Compute real classification metrics
    acc = float(accuracy_score(y_cat_true, y_cat_pred))
    prec_weighted = float(precision_score(y_cat_true, y_cat_pred, average="weighted", zero_division=0))
    prec_macro = float(precision_score(y_cat_true, y_cat_pred, average="macro", zero_division=0))
    rec_weighted = float(recall_score(y_cat_true, y_cat_pred, average="weighted", zero_division=0))
    rec_macro = float(recall_score(y_cat_true, y_cat_pred, average="macro", zero_division=0))
    f1_weighted = float(f1_score(y_cat_true, y_cat_pred, average="weighted", zero_division=0))
    f1_macro = float(f1_score(y_cat_true, y_cat_pred, average="macro", zero_division=0))

    try:
        roc_auc_weighted = float(
            roc_auc_score(y_cat_true, y_cat_proba, multi_class="ovr", average="weighted")
        )
    except Exception as e:
        print(f"Warning computing multi-class ROC-AUC: {e}")
        roc_auc_weighted = None

    # Classification report breakdown per class
    report_dict = classification_report(y_cat_true, y_cat_pred, output_dict=True, zero_division=0)
    cm = confusion_matrix(y_cat_true, y_cat_pred, labels=classes)

    # 6. Compute real regression metrics for risk score
    mae = float(mean_absolute_error(y_score_true, y_score_pred))
    r2 = float(r2_score(y_score_true, y_score_pred))

    # 7. Format metrics document
    metrics_data = {
        "evaluation_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "model_name": model_payload.get("model_label", "Demo Baseline Model"),
        "model_architecture": model_payload.get("model_architecture", "RandomForest"),
        "is_demo_baseline": True,
        "test_samples_count": len(test_df),
        "classes": classes,
        "metrics": {
            "accuracy": round(acc, 4),
            "precision_weighted": round(prec_weighted, 4),
            "precision_macro": round(prec_macro, 4),
            "recall_weighted": round(rec_weighted, 4),
            "recall_macro": round(rec_macro, 4),
            "f1_score_weighted": round(f1_weighted, 4),
            "f1_score_macro": round(f1_macro, 4),
            "roc_auc_weighted": round(roc_auc_weighted, 4) if roc_auc_weighted is not None else None,
            "risk_score_mae": round(mae, 2),
            "risk_score_r2": round(r2, 4),
        },
        "per_class_metrics": {
            cls_name: {
                "precision": round(report_dict[cls_name]["precision"], 4),
                "recall": round(report_dict[cls_name]["recall"], 4),
                "f1_score": round(report_dict[cls_name]["f1-score"], 4),
                "support": int(report_dict[cls_name]["support"]),
            }
            for cls_name in classes if cls_name in report_dict
        },
        "confusion_matrix": {
            "labels": classes,
            "matrix": cm.tolist(),
        },
    }

    os.makedirs(EVAL_DIR, exist_ok=True)
    with open(METRICS_FILE, "w", encoding="utf-8") as f:
        json.dump(metrics_data, f, indent=2)

    print(f"\nReal Evaluation Metrics Saved to: {METRICS_FILE}")
    print("-" * 50)
    print(f"Accuracy:           {acc * 100:.2f}%")
    print(f"Precision (weight): {prec_weighted:.4f}")
    print(f"Recall (weight):    {rec_weighted:.4f}")
    print(f"F1-Score (weight):  {f1_weighted:.4f}")
    if roc_auc_weighted is not None:
        print(f"ROC-AUC (OVR):      {roc_auc_weighted:.4f}")
    print(f"Risk Score MAE:     {mae:.2f} points (out of 100)")
    print(f"Risk Score R²:      {r2:.4f}")
    print("-" * 50)
    print("\nConfusion Matrix:")
    print("Labels:", classes)
    for row in cm:
        print(" ", row)
    print("=" * 60)

    return metrics_data

if __name__ == "__main__":
    evaluate_model()
