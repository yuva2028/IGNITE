"""
CycloneGuard AI - Model Training Script (Phase 3)

Trains the Random Forest Baseline Model on the preprocessed cyclone risk features.
Explicitly labels the model artifact as a demo baseline.

Outputs:
- ml/models/baseline_rf_model.joblib
- ml/models/preprocessor.joblib
- ml/models/model_metadata.json
"""

import os
import json
import datetime
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
import joblib

from ml.preprocessing.preprocessor import FeaturePreprocessor, FEATURE_NAMES
from ml.data.generate_dataset import generate_cyclone_risk_dataset

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "dataset.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
MODEL_FILE = os.path.join(MODELS_DIR, "baseline_rf_model.joblib")
PREPROCESSOR_FILE = os.path.join(MODELS_DIR, "preprocessor.joblib")
METADATA_FILE = os.path.join(MODELS_DIR, "model_metadata.json")

def train_baseline_model():
    print("=" * 60)
    print("CycloneGuard AI - Training Random Forest Baseline Model")
    print("=" * 60)

    # 1. Load or generate dataset
    if not os.path.exists(DATA_PATH):
        print("Dataset not found. Generating synthetic demo baseline dataset...")
        df = generate_cyclone_risk_dataset(n_samples=6000, random_state=42)
        os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
        df.to_csv(DATA_PATH, index=False)
    else:
        print(f"Loading dataset from: {DATA_PATH}")
        df = pd.read_csv(DATA_PATH)

    print(f"Loaded {len(df)} samples with features: {FEATURE_NAMES}")

    # 2. Train/Test split
    X = df[FEATURE_NAMES]
    y_cat = df["risk_category"]
    y_score = df["risk_score"]

    X_train, X_test, y_cat_train, y_cat_test, y_score_train, y_score_test = train_test_split(
        X, y_cat, y_score, test_size=0.20, random_state=42, stratify=y_cat
    )

    # 3. Fit Preprocessor
    print("Fitting FeaturePreprocessor...")
    preprocessor = FeaturePreprocessor()
    X_train_scaled = preprocessor.fit_transform(X_train)
    X_test_scaled = preprocessor.transform(X_test)

    # 4. Train Random Forest Classifier for Risk Category
    print("Training RandomForestClassifier...")
    clf = RandomForestClassifier(
        n_estimators=120,
        max_depth=12,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X_train_scaled, y_cat_train)

    # 5. Train Random Forest Regressor for Continuous Risk Score (0-100)
    print("Training RandomForestRegressor...")
    reg = RandomForestRegressor(
        n_estimators=100,
        max_depth=12,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )
    reg.fit(X_train_scaled, y_score_train)

    # 6. Extract Feature Importances
    feature_importances = {
        name: round(float(imp), 4)
        for name, imp in zip(FEATURE_NAMES, clf.feature_importances_)
    }
    # Sort descending
    sorted_importances = dict(sorted(feature_importances.items(), key=lambda item: item[1], reverse=True))

    print("\nModel Feature Importances:")
    for feat, imp in sorted_importances.items():
        print(f"  - {feat:30s}: {imp * 100:.2f}%")

    # 7. Package and save model artifacts
    os.makedirs(MODELS_DIR, exist_ok=True)

    model_payload = {
        "classifier": clf,
        "regressor": reg,
        "classes": list(clf.classes_),
        "feature_names": FEATURE_NAMES,
        "feature_importances": sorted_importances,
        "model_architecture": "RandomForest (Classifier + Regressor)",
        "model_label": "Demo Baseline Model",
        "is_demo_baseline": True,
    }

    print(f"\nSaving model payload to: {MODEL_FILE}")
    joblib.dump(model_payload, MODEL_FILE)

    print(f"Saving preprocessor to: {PREPROCESSOR_FILE}")
    preprocessor.save(PREPROCESSOR_FILE)

    metadata = {
        "model_name": "Random Forest Spatial Cyclone Risk Baseline",
        "model_type": "RandomForest",
        "version": "1.0.0-demo-baseline",
        "is_demo_baseline": True,
        "notice": "DEMO BASELINE MODEL: Trained on synthetic data calibrated to Odisha Bay of Bengal cyclone vulnerability principles.",
        "training_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "features": FEATURE_NAMES,
        "feature_importances": sorted_importances,
        "target_categories": list(clf.classes_),
    }

    with open(METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata to: {METADATA_FILE}")

    # Also save test split for evaluation script to evaluate independently
    test_data_path = os.path.join(BASE_DIR, "data", "test_split.csv")
    test_df = X_test.copy()
    test_df["risk_category"] = y_cat_test
    test_df["risk_score"] = y_score_test
    test_df.to_csv(test_data_path, index=False)
    print(f"Saved test split ({len(test_df)} samples) to: {test_data_path}")

    print("\nTraining completed successfully!")

if __name__ == "__main__":
    train_baseline_model()
