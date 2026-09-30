"""
CycloneGuard AI - Risk Prediction Service (Phase 3)

Modular inference service with a replaceable model interface.
Translates 7 geographic, environmental, and meteorological features into:
- risk_score: 0–100
- risk_category: LOW, MEDIUM, HIGH, CRITICAL
- risk_factors: Human-readable key drivers explaining the risk score

Design pattern:
- BaseRiskModel: Abstract Strategy Interface ensuring models are easily swapped.
- RandomForestRiskModel: Concrete ML model using trained Random Forest pipeline.
- DemoBaselineRiskModel: Transparent rule-based fallback when model weights are not loaded.
- RiskPredictor: Unified Facade for the FastAPI backend and external callers.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import os
import joblib
import numpy as np
import pandas as pd

from ml.preprocessing.preprocessor import FeaturePreprocessor, FEATURE_NAMES

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
DEFAULT_MODEL_FILE = os.path.join(MODELS_DIR, "baseline_rf_model.joblib")
DEFAULT_PREPROCESSOR_FILE = os.path.join(MODELS_DIR, "preprocessor.joblib")

class BaseRiskModel(ABC):
    """Abstract Base Class for replaceable cyclone risk models."""

    @abstractmethod
    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Predicts risk score, category, and factors for a single geographic entity."""
        pass

    @abstractmethod
    def predict_batch(self, features_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Predicts risk score, category, and factors for a collection of entities."""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        pass

    @property
    @abstractmethod
    def is_demo_baseline(self) -> bool:
        pass

def extract_risk_factors(features: Dict[str, Any]) -> List[str]:
    """
    Extracts prominent human-readable risk factors based on physical thresholds
    and comparative severity for cyclone disaster management.
    """
    factors = []
    wind = float(features.get("wind_speed", 0))
    rain = float(features.get("rainfall", 0))
    surge = float(features.get("storm_surge", 0))
    elevation = float(features.get("elevation", 0))
    dist_coast = float(features.get("distance_from_coast", 0))
    dist_track = float(features.get("distance_from_cyclone_track", 0))
    flood_exp = float(features.get("historical_flood_exposure", 0))

    # Factor checks ordered by destructive potential
    # 1. Storm surge inundation threat
    if surge >= 2.5 and elevation <= 5.0:
        factors.append(f"Severe storm surge threat ({surge:.1f}m surge vs {elevation:.1f}m elevation)")
    elif surge >= 1.5:
        factors.append(f"Elevated storm surge ({surge:.1f}m)")

    # 2. Elevation vulnerability
    if elevation <= 4.0:
        factors.append(f"Low coastal elevation ({elevation:.1f}m ASL)")
    elif elevation <= 8.0 and dist_coast <= 15.0:
        factors.append(f"Low-lying coastal terrain ({elevation:.1f}m)")

    # 3. Cyclone Track proximity
    if dist_track <= 25.0:
        factors.append(f"Direct cyclone track path ({dist_track:.1f}km from core)")
    elif dist_track <= 60.0:
        factors.append(f"Close to cyclone track ({dist_track:.1f}km)")

    # 4. Destructive Wind Speeds
    if wind >= 200.0:
        factors.append(f"Category 4/5 catastrophic wind speed ({wind:.0f} km/h)")
    elif wind >= 150.0:
        factors.append(f"Very severe cyclonic winds ({wind:.0f} km/h)")
    elif wind >= 110.0:
        factors.append(f"Gale-force cyclonic winds ({wind:.0f} km/h)")

    # 5. Heavy Rainfall & Flash Flooding
    if rain >= 250.0:
        factors.append(f"Extreme torrential rainfall ({rain:.0f} mm/24h)")
    elif rain >= 150.0:
        factors.append(f"High 24h rainfall volume ({rain:.0f} mm)")

    # 6. Distance from coastline
    if dist_coast <= 5.0:
        factors.append(f"Immediate shoreline proximity ({dist_coast:.1f}km to sea)")
    elif dist_coast <= 15.0:
        factors.append(f"Coastal zone exposure ({dist_coast:.1f}km from coast)")

    # 7. Historical Flood Vulnerability
    if flood_exp >= 0.70:
        factors.append(f"High historical flood susceptibility ({int(flood_exp * 100)}%)")
    elif flood_exp >= 0.45:
        factors.append(f"Moderate historical flood exposure ({int(flood_exp * 100)}%)")

    # Fallback if conditions are mild
    if not factors:
        if elevation > 30.0 and dist_coast > 50.0:
            factors.append("Inland elevated terrain; buffer against tidal surge")
        else:
            factors.append("Moderate peripheral weather exposure")

    return factors[:4]  # Return top 3-4 most critical drivers

class RandomForestRiskModel(BaseRiskModel):
    """Production ML model using trained Random Forest pipeline."""

    def __init__(
        self,
        model_path: str = DEFAULT_MODEL_FILE,
        preprocessor_path: str = DEFAULT_PREPROCESSOR_FILE,
    ):
        self.model_path = model_path
        self.preprocessor_path = preprocessor_path
        self._load()

    def _load(self):
        if not os.path.exists(self.model_path) or not os.path.exists(self.preprocessor_path):
            raise FileNotFoundError(
                f"Model artifacts missing. Expected {self.model_path} and {self.preprocessor_path}"
            )
        payload = joblib.load(self.model_path)
        self.clf = payload["classifier"]
        self.reg = payload["regressor"]
        self.classes = list(payload["classes"])
        self.feature_names = payload.get("feature_names", FEATURE_NAMES)
        self.feature_importances = payload.get("feature_importances", {})
        self.preprocessor = FeaturePreprocessor.load(self.preprocessor_path)

    @property
    def model_name(self) -> str:
        return "Random Forest (Demo Baseline)"

    @property
    def is_demo_baseline(self) -> bool:
        return True

    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        scaled = self.preprocessor.transform(features)
        cat = str(self.clf.predict(scaled)[0])
        score = float(np.clip(self.reg.predict(scaled)[0], 0.0, 100.0))
        probas = {
            cls_name: round(float(p), 4)
            for cls_name, p in zip(self.classes, self.clf.predict_proba(scaled)[0])
        }
        factors = extract_risk_factors(features)

        return {
            "risk_score": round(score, 1),
            "risk_category": cat,
            "risk_factors": factors,
            "category_probabilities": probas,
            "model_type": self.model_name,
            "is_demo_baseline": self.is_demo_baseline,
        }

    def predict_batch(self, features_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not features_list:
            return []
        scaled = self.preprocessor.transform(features_list)
        cats = self.clf.predict(scaled)
        scores = np.clip(self.reg.predict(scaled), 0.0, 100.0)
        probas_all = self.clf.predict_proba(scaled)

        results = []
        for i, feat in enumerate(features_list):
            probas = {
                cls_name: round(float(p), 4)
                for cls_name, p in zip(self.classes, probas_all[i])
            }
            results.append({
                "risk_score": round(float(scores[i]), 1),
                "risk_category": str(cats[i]),
                "risk_factors": extract_risk_factors(feat),
                "category_probabilities": probas,
                "model_type": self.model_name,
                "is_demo_baseline": self.is_demo_baseline,
            })
        return results

class DemoBaselineRiskModel(BaseRiskModel):
    """
    Transparent rule-based baseline model.
    Used when serialized ML weights are not loaded or in offline demo mode.
    Explicitly labeled as a non-trained baseline calculation.
    """

    @property
    def model_name(self) -> str:
        return "Deterministic Hydrodynamic Rule Baseline"

    @property
    def is_demo_baseline(self) -> bool:
        return True

    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        wind = float(features.get("wind_speed", 0))
        rain = float(features.get("rainfall", 0))
        surge = float(features.get("storm_surge", 0))
        elev = float(features.get("elevation", 0))
        dist_c = float(features.get("distance_from_coast", 0))
        dist_t = float(features.get("distance_from_cyclone_track", 0))
        flood = float(features.get("historical_flood_exposure", 0))

        # Direct hydrodynamic risk formulation
        w_score = 35.0 * min(max((wind - 40) / 180, 0), 1) * np.exp(-dist_t / 120)
        s_vuln = max(0, surge - (elev * 0.4))
        s_score = 35.0 * min(s_vuln / 3.0, 1) * np.exp(-dist_c / 25)
        r_score = 30.0 * (0.6 * min(rain / 300, 1) + 0.4 * flood) * max(0.1, 1 - elev / 100)

        total_score = float(np.clip(w_score + s_score + r_score, 0.0, 100.0))

        if total_score >= 80.0:
            cat = "CRITICAL"
        elif total_score >= 55.0:
            cat = "HIGH"
        elif total_score >= 30.0:
            cat = "MEDIUM"
        else:
            cat = "LOW"

        return {
            "risk_score": round(total_score, 1),
            "risk_category": cat,
            "risk_factors": extract_risk_factors(features),
            "category_probabilities": {cat: 1.0},
            "model_type": self.model_name,
            "is_demo_baseline": True,
        }

    def predict_batch(self, features_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [self.predict(f) for f in features_list]

class RiskPredictor:
    """
    Facade for risk prediction. Automatically uses trained Random Forest if available;
    gracefully falls back to DemoBaselineRiskModel if weights are missing.
    """

    def __init__(self, force_baseline: bool = False):
        self.model: BaseRiskModel
        if not force_baseline and os.path.exists(DEFAULT_MODEL_FILE) and os.path.exists(DEFAULT_PREPROCESSOR_FILE):
            try:
                self.model = RandomForestRiskModel(DEFAULT_MODEL_FILE, DEFAULT_PREPROCESSOR_FILE)
            except Exception as e:
                print(f"Warning: Failed loading RandomForest model ({e}), falling back to Demo Baseline.")
                self.model = DemoBaselineRiskModel()
        else:
            self.model = DemoBaselineRiskModel()

    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        return self.model.predict(features)

    def predict_batch(self, features_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return self.model.predict_batch(features_list)

    @property
    def model_name(self) -> str:
        return self.model.model_name

    @property
    def is_demo_baseline(self) -> bool:
        return self.model.is_demo_baseline

# Default singleton instance
predictor = RiskPredictor()
