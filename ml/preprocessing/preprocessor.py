"""
CycloneGuard AI - Feature Preprocessing Pipeline (Phase 3)

Validates, cleans, and standardizes input environmental and spatial features.
Guarantees consistent feature ordering and serialization for inference.
"""

import os
from typing import List, Dict, Any, Union
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
import joblib

FEATURE_NAMES: List[str] = [
    "wind_speed",
    "rainfall",
    "storm_surge",
    "elevation",
    "distance_from_coast",
    "distance_from_cyclone_track",
    "historical_flood_exposure",
]

FEATURE_BOUNDS: Dict[str, tuple] = {
    "wind_speed": (0.0, 400.0),
    "rainfall": (0.0, 1000.0),
    "storm_surge": (0.0, 15.0),
    "elevation": (-10.0, 3000.0),
    "distance_from_coast": (0.0, 1000.0),
    "distance_from_cyclone_track": (0.0, 1500.0),
    "historical_flood_exposure": (0.0, 1.0),
}

class FeaturePreprocessor:
    def __init__(self):
        self.scaler = StandardScaler()
        self.feature_names = FEATURE_NAMES
        self.is_fitted = False

    def validate_and_clip(self, df: pd.DataFrame) -> pd.DataFrame:
        """Validates feature columns exist and clips extreme values within reasonable physical bounds."""
        df_clean = df.copy()
        for col in self.feature_names:
            if col not in df_clean.columns:
                raise ValueError(f"Missing required feature: '{col}'")
            low, high = FEATURE_BOUNDS[col]
            df_clean[col] = df_clean[col].astype(float).clip(lower=low, upper=high)
        return df_clean[self.feature_names]

    def fit(self, X: pd.DataFrame) -> "FeaturePreprocessor":
        """Fits standard scaler on training features."""
        X_clean = self.validate_and_clip(X)
        self.scaler.fit(X_clean.values)
        self.is_fitted = True
        return self

    def transform(self, X: Union[pd.DataFrame, Dict[str, Any], List[Dict[str, Any]]]) -> np.ndarray:
        """Transforms input feature dataframe or dicts into scaled numpy array."""
        if not self.is_fitted:
            raise RuntimeError("Preprocessor has not been fitted yet.")

        if isinstance(X, dict):
            df = pd.DataFrame([X])
        elif isinstance(X, list):
            df = pd.DataFrame(X)
        elif isinstance(X, pd.DataFrame):
            df = X
        else:
            raise TypeError(f"Unsupported input type for features: {type(X)}")

        df_clean = self.validate_and_clip(df)
        return self.scaler.transform(df_clean.values)

    def fit_transform(self, X: pd.DataFrame) -> np.ndarray:
        """Fits scaler and transforms dataframe."""
        return self.fit(X).transform(X)

    def save(self, filepath: str) -> None:
        """Serializes preprocessor to file."""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump(self, filepath)

    @classmethod
    def load(cls, filepath: str) -> "FeaturePreprocessor":
        """Loads serialized preprocessor."""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Preprocessor file not found at: {filepath}")
        return joblib.load(filepath)
