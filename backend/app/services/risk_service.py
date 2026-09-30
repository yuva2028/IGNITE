"""
CycloneGuard AI - Risk Application Service (Phase 3)

Coordinates feature engineering, ML prediction calls, spatial risk grid synthesis,
and GeoJSON serialization for the API routes.
"""

import os
import json
import math
from typing import List, Dict, Any, Optional
import numpy as np

from ml.predict import predictor, RiskPredictor
from backend.app.schemas.risk import (
    RiskPredictionRequest,
    RiskPredictionResponse,
    BatchRiskPredictionRequest,
    BatchRiskPredictionResponse,
    ModelInfoResponse,
    ModelMetricsResponse,
    GeoJSONFeatureCollection,
    GeoJSONFeature,
    GeoJSONGeometry,
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
METADATA_PATH = os.path.join(BASE_DIR, "ml", "models", "model_metadata.json")
METRICS_PATH = os.path.join(BASE_DIR, "ml", "evaluation", "metrics.json")
RISK_ZONES_PATH = os.path.join(BASE_DIR, "src", "data", "risk-zones.json")
CYCLONE_PATH = os.path.join(BASE_DIR, "src", "data", "cyclone.json")

class RiskService:
    def __init__(self):
        self.predictor = predictor

    def predict_single(self, req: RiskPredictionRequest) -> RiskPredictionResponse:
        feat_dict = {
            "wind_speed": req.wind_speed,
            "rainfall": req.rainfall,
            "storm_surge": req.storm_surge,
            "elevation": req.elevation,
            "distance_from_coast": req.distance_from_coast,
            "distance_from_cyclone_track": req.distance_from_cyclone_track,
            "historical_flood_exposure": req.historical_flood_exposure,
        }
        res = self.predictor.predict(feat_dict)
        return RiskPredictionResponse(
            risk_score=res["risk_score"],
            risk_category=res["risk_category"],
            risk_factors=res["risk_factors"],
            category_probabilities=res.get("category_probabilities"),
            model_type=res["model_type"],
            is_demo_baseline=res["is_demo_baseline"],
            entity_id=req.entity_id,
            entity_name=req.entity_name,
        )

    def predict_batch(self, batch: BatchRiskPredictionRequest) -> BatchRiskPredictionResponse:
        features_list = [
            {
                "wind_speed": req.wind_speed,
                "rainfall": req.rainfall,
                "storm_surge": req.storm_surge,
                "elevation": req.elevation,
                "distance_from_coast": req.distance_from_coast,
                "distance_from_cyclone_track": req.distance_from_cyclone_track,
                "historical_flood_exposure": req.historical_flood_exposure,
            }
            for req in batch.items
        ]
        results = self.predictor.predict_batch(features_list)
        responses = [
            RiskPredictionResponse(
                risk_score=res["risk_score"],
                risk_category=res["risk_category"],
                risk_factors=res["risk_factors"],
                category_probabilities=res.get("category_probabilities"),
                model_type=res["model_type"],
                is_demo_baseline=res["is_demo_baseline"],
                entity_id=batch.items[i].entity_id,
                entity_name=batch.items[i].entity_name,
            )
            for i, res in enumerate(results)
        ]
        return BatchRiskPredictionResponse(
            predictions=responses,
            count=len(responses),
            model_type=self.predictor.model_name,
        )

    def get_model_info(self) -> ModelInfoResponse:
        meta = {}
        if os.path.exists(METADATA_PATH):
            try:
                with open(METADATA_PATH, "r", encoding="utf-8") as f:
                    meta = json.load(f)
            except Exception:
                pass

        metrics_obj = None
        if os.path.exists(METRICS_PATH):
            try:
                with open(METRICS_PATH, "r", encoding="utf-8") as f:
                    m = json.load(f).get("metrics", {})
                    metrics_obj = ModelMetricsResponse(
                        accuracy=m.get("accuracy", 0.0),
                        precision_weighted=m.get("precision_weighted", 0.0),
                        recall_weighted=m.get("recall_weighted", 0.0),
                        f1_score_weighted=m.get("f1_score_weighted", 0.0),
                        roc_auc_weighted=m.get("roc_auc_weighted"),
                        risk_score_mae=m.get("risk_score_mae", 0.0),
                        risk_score_r2=m.get("risk_score_r2", 0.0),
                    )
            except Exception:
                pass

        return ModelInfoResponse(
            model_name=meta.get("model_name", "Random Forest Spatial Cyclone Risk Baseline"),
            model_type=meta.get("model_type", "RandomForest"),
            version=meta.get("version", "1.0.0-demo-baseline"),
            is_demo_baseline=True,
            status="active",
            features=meta.get("features", [
                "wind_speed", "rainfall", "storm_surge", "elevation",
                "distance_from_coast", "distance_from_cyclone_track", "historical_flood_exposure"
            ]),
            feature_importances=meta.get("feature_importances", {}),
            metrics=metrics_obj,
            notice="Phase 3 Baseline ML Model calibrated for spatial cyclone risk.",
        )

    def get_predicted_risk_zones(
        self,
        core_wind: float = 220.0,
        peak_surge: float = 4.5,
        peak_rain: float = 260.0,
        track_offset_km: float = 0.0,
    ) -> Dict[str, Any]:
        """Loads coastal risk zones, computes dynamic ML risk predictions, and returns enriched features."""
        zones = []
        if os.path.exists(RISK_ZONES_PATH):
            with open(RISK_ZONES_PATH, "r", encoding="utf-8") as f:
                zones_data = json.load(f)
                zones = zones_data.get("zones", [])

        # Cyclone track and eye position (with parametric offset)
        eye_lat = 19.8 - (track_offset_km / 111.0) * 0.3
        eye_lng = 85.8 + (track_offset_km / 104.0) * 0.9

        enriched_zones = []
        features_to_predict = []
        zone_map = []

        for z in zones:
            coords = z.get("coordinates", [])
            if coords:
                avg_lng = sum(c[0] for c in coords) / len(coords)
                avg_lat = sum(c[1] for c in coords) / len(coords)
            else:
                avg_lng, avg_lat = 85.8, 19.8

            elev = float(z.get("elevation_m", 10.0))

            # Approximate distance to coast (using realistic Odisha coastline geometry)
            coast_lng = 85.0 + (avg_lat - 19.0) * 0.95
            dist_coast = max(0.5, abs(avg_lng - coast_lng) * 95.0)

            # Distance to cyclone track / eye
            dist_track = math.sqrt((avg_lat - eye_lat) ** 2 + (avg_lng - eye_lng) ** 2) * 111.0
            dist_track = max(3.0, dist_track)

            # Meteorological estimates derived from cyclone position & scenario parameters
            wind = core_wind * (0.35 + 0.65 * math.exp(-dist_track / 90.0))
            rain = (peak_rain * 0.35) + (peak_rain * 0.65) * math.exp(-dist_track / 110.0) + (1.0 / (elev + 1.0)) * 25.0
            surge = max(0.0, peak_surge * math.exp(-dist_coast / 14.0) * math.exp(-dist_track / 70.0))

            flood_exp = min(1.0, max(0.1, 0.9 * math.exp(-elev / 18.0)))

            feat = {
                "wind_speed": round(wind, 1),
                "rainfall": round(rain, 1),
                "storm_surge": round(surge, 2),
                "elevation": round(elev, 1),
                "distance_from_coast": round(dist_coast, 1),
                "distance_from_cyclone_track": round(dist_track, 1),
                "historical_flood_exposure": round(flood_exp, 3),
            }
            features_to_predict.append(feat)
            zone_map.append((z, feat))

        # Run batch prediction through ML model
        predictions = self.predictor.predict_batch(features_to_predict)

        for (z, feat), pred in zip(zone_map, predictions):
            enriched = {
                **z,
                "riskScore": pred["risk_score"],
                "severity": pred["risk_category"].lower(),
                "predictedCategory": pred["risk_category"],
                "riskFactors": pred["risk_factors"],
                "categoryProbabilities": pred.get("category_probabilities", {}),
                "mlFeatures": feat,
                "isMLPredicted": True,
                "modelType": pred["model_type"],
            }
            enriched_zones.append(enriched)

        return {
            "zones": enriched_zones,
            "model_type": self.predictor.model_name,
            "is_demo_baseline": self.predictor.is_demo_baseline,
            "count": len(enriched_zones),
        }

    def generate_spatial_grid_geojson(
        self,
        lat_min: float = 19.0,
        lat_max: float = 21.0,
        lng_min: float = 84.8,
        lng_max: float = 87.2,
        step_deg: float = 0.20,
    ) -> GeoJSONFeatureCollection:
        """
        Creates a regular spatial grid covering the cyclone impact zone,
        runs ML risk prediction for each grid cell, and returns GeoJSON.
        """
        eye_lat, eye_lng = 19.8, 85.8
        core_wind = 220.0

        grid_cells = []
        features_list = []

        lats = np.arange(lat_min, lat_max, step_deg)
        lngs = np.arange(lng_min, lng_max, step_deg)

        cell_idx = 0
        for lat in lats:
            for lng in lngs:
                cell_idx += 1
                cell_id = f"grid-cell-{cell_idx:03d}"
                c_lat = lat + step_deg / 2
                c_lng = lng + step_deg / 2

                # Coastal proximity
                coast_lng = 85.6 + (c_lat - 19.0) * 0.5
                dist_coast = max(0.5, (c_lng - coast_lng) * 105.0 if c_lng < coast_lng else 0.5)

                # Cyclone track proximity
                dist_track = math.sqrt((c_lat - eye_lat) ** 2 + (c_lng - eye_lng) ** 2) * 111.0
                dist_track = max(2.0, dist_track)

                # Simulated elevation profile for Odisha coast
                elevation = max(1.0, (dist_coast * 0.6) + ((c_lat - 19.0) * 8.0))

                # Environmental factors
                wind = core_wind * (0.35 + 0.65 * math.exp(-dist_track / 85.0))
                rain = 80.0 + 160.0 * math.exp(-dist_track / 100.0)
                surge = max(0.0, 4.2 * math.exp(-dist_coast / 12.0) * math.exp(-dist_track / 65.0))
                flood_exp = min(1.0, max(0.1, 0.85 * math.exp(-elevation / 20.0)))

                feat = {
                    "wind_speed": round(float(wind), 1),
                    "rainfall": round(float(rain), 1),
                    "storm_surge": round(float(surge), 2),
                    "elevation": round(float(elevation), 1),
                    "distance_from_coast": round(float(dist_coast), 1),
                    "distance_from_cyclone_track": round(float(dist_track), 1),
                    "historical_flood_exposure": round(float(flood_exp), 3),
                }

                # Polygon vertices: [lng, lat]
                poly_coords = [
                    [round(lng, 4), round(lat, 4)],
                    [round(lng + step_deg, 4), round(lat, 4)],
                    [round(lng + step_deg, 4), round(lat + step_deg, 4)],
                    [round(lng, 4), round(lat + step_deg, 4)],
                    [round(lng, 4), round(lat, 4)],
                ]

                features_list.append(feat)
                grid_cells.append({
                    "id": cell_id,
                    "coords": poly_coords,
                    "center": [round(c_lat, 4), round(c_lng, 4)],
                    "features": feat,
                })

        # Run batch ML predictions
        predictions = self.predictor.predict_batch(features_list)

        geojson_features = []
        for cell, pred in zip(grid_cells, predictions):
            props = {
                "id": cell["id"],
                "name": f"Spatial Cell ({cell['center'][0]}°N, {cell['center'][1]}°E)",
                "risk_score": pred["risk_score"],
                "risk_category": pred["risk_category"],
                "severity": pred["risk_category"].lower(),
                "risk_factors": pred["risk_factors"],
                "category_probabilities": pred.get("category_probabilities", {}),
                "model_type": pred["model_type"],
                "is_demo_baseline": pred["is_demo_baseline"],
                "center": cell["center"],
                **cell["features"],
            }
            feat = GeoJSONFeature(
                id=cell["id"],
                geometry=GeoJSONGeometry(
                    type="Polygon",
                    coordinates=[cell["coords"]],
                ),
                properties=props,
            )
            geojson_features.append(feat)

        return GeoJSONFeatureCollection(
            features=geojson_features,
            metadata={
                "grid_cells_count": len(geojson_features),
                "resolution_deg": step_deg,
                "model_type": self.predictor.model_name,
                "is_demo_baseline": self.predictor.is_demo_baseline,
            },
        )

risk_service = RiskService()
