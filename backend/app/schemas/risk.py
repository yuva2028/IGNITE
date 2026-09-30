"""
CycloneGuard AI - Risk Pydantic Schemas (Phase 3)

Defines strongly-typed request and response schemas for the risk prediction engine.
"""

from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class RiskPredictionRequest(BaseModel):
    """Input features for single geographic risk prediction."""
    wind_speed: float = Field(..., ge=0.0, le=450.0, description="Sustained wind speed in km/h")
    rainfall: float = Field(..., ge=0.0, le=1200.0, description="24-hour accumulated rainfall in mm")
    storm_surge: float = Field(..., ge=0.0, le=15.0, description="Peak storm surge height above normal tide in meters")
    elevation: float = Field(..., ge=-10.0, le=3500.0, description="Mean elevation above sea level in meters")
    distance_from_coast: float = Field(..., ge=0.0, le=1000.0, description="Distance from the coastline in km")
    distance_from_cyclone_track: float = Field(..., ge=0.0, le=1500.0, description="Distance from the nearest cyclone track point in km")
    historical_flood_exposure: float = Field(..., ge=0.0, le=1.0, description="Historical flood vulnerability index (0.0 to 1.0)")

    # Optional metadata
    entity_id: Optional[str] = Field(None, description="Optional zone or grid cell identifier")
    entity_name: Optional[str] = Field(None, description="Optional zone or geographic label")
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)

    class Config:
        json_schema_extra = {
            "example": {
                "wind_speed": 195.0,
                "rainfall": 280.0,
                "storm_surge": 3.8,
                "elevation": 2.5,
                "distance_from_coast": 1.5,
                "distance_from_cyclone_track": 18.0,
                "historical_flood_exposure": 0.85,
                "entity_name": "Puri Coastal Belt",
            }
        }

class RiskPredictionResponse(BaseModel):
    """Output prediction response with risk score, category, and explanatory factors."""
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Calculated risk score from 0 (minimal) to 100 (extreme)")
    risk_category: str = Field(..., description="Risk category: LOW, MEDIUM, HIGH, or CRITICAL")
    risk_factors: List[str] = Field(..., description="Key environmental and meteorological drivers contributing to risk")
    category_probabilities: Optional[Dict[str, float]] = Field(None, description="Model classification probability distribution")
    model_type: str = Field(..., description="Model architecture or baseline designation")
    is_demo_baseline: bool = Field(..., description="Indicates whether predictions originate from a baseline model")
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None

class BatchRiskPredictionRequest(BaseModel):
    items: List[RiskPredictionRequest]

class BatchRiskPredictionResponse(BaseModel):
    predictions: List[RiskPredictionResponse]
    count: int
    model_type: str

class ModelMetricsResponse(BaseModel):
    accuracy: float
    precision_weighted: float
    recall_weighted: float
    f1_score_weighted: float
    roc_auc_weighted: Optional[float] = None
    risk_score_mae: float
    risk_score_r2: float

class ModelInfoResponse(BaseModel):
    model_name: str
    model_type: str
    version: str
    is_demo_baseline: bool
    status: str
    features: List[str]
    feature_importances: Dict[str, float]
    metrics: Optional[ModelMetricsResponse] = None
    notice: str

# GeoJSON Schemas for frontend map layers
class GeoJSONGeometry(BaseModel):
    type: str = "Polygon"
    coordinates: List[List[List[float]]]

class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    id: str
    geometry: GeoJSONGeometry
    properties: Dict[str, Any]

class GeoJSONFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[GeoJSONFeature]
    metadata: Dict[str, Any]
