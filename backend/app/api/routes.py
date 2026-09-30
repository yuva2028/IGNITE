"""
CycloneGuard AI - Risk Engine API Routes (Phase 3)

Exposes typed REST endpoints for spatial cyclone risk predictions:
- POST /api/risk/predict
- POST /api/risk/predict/batch
- GET  /api/risk/zones-predicted
- GET  /api/risk/grid-geojson
- GET  /api/risk/model-info
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from backend.app.schemas.risk import (
    RiskPredictionRequest,
    RiskPredictionResponse,
    BatchRiskPredictionRequest,
    BatchRiskPredictionResponse,
    ModelInfoResponse,
    GeoJSONFeatureCollection,
)
from backend.app.services.risk_service import risk_service

router = APIRouter(prefix="/api/risk", tags=["Risk Prediction Engine"])

@router.post(
    "/predict",
    response_model=RiskPredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Predict Cyclone Risk for a Geographic Location",
    description="Calculates risk score (0-100), severity category, and contributing risk factors from 7 environmental features.",
)
async def predict_risk(request: RiskPredictionRequest) -> RiskPredictionResponse:
    try:
        return risk_service.predict_single(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error calculating risk: {str(e)}",
        )

@router.post(
    "/predict/batch",
    response_model=BatchRiskPredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Batch Predict Cyclone Risk",
)
async def predict_batch_risk(batch_request: BatchRiskPredictionRequest) -> BatchRiskPredictionResponse:
    try:
        return risk_service.predict_batch(batch_request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch inference error: {str(e)}",
        )

@router.get(
    "/zones-predicted",
    summary="Get Coastal Risk Zones with Live ML Predictions",
    description="Loads the Odisha coastal risk zones and enriches each with dynamic ML-predicted score and factors.",
)
async def get_predicted_risk_zones():
    try:
        return risk_service.get_predicted_risk_zones()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error evaluating risk zones: {str(e)}",
        )

@router.get(
    "/grid-geojson",
    response_model=GeoJSONFeatureCollection,
    summary="Generate Spatial Cyclone Risk GeoJSON Grid",
    description="Calculates spatial grid cells with ML risk predictions for rendering on the Leaflet map.",
)
async def get_spatial_grid_geojson(
    lat_min: float = Query(18.8, ge=-90, le=90),
    lat_max: float = Query(21.2, ge=-90, le=90),
    lng_min: float = Query(84.6, ge=-180, le=180),
    lng_max: float = Query(87.2, ge=-180, le=180),
    step_deg: float = Query(0.20, ge=0.05, le=1.0),
) -> GeoJSONFeatureCollection:
    try:
        return risk_service.generate_spatial_grid_geojson(
            lat_min=lat_min,
            lat_max=lat_max,
            lng_min=lng_min,
            lng_max=lng_max,
            step_deg=step_deg,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating spatial grid GeoJSON: {str(e)}",
        )

@router.get(
    "/model-info",
    response_model=ModelInfoResponse,
    summary="Get ML Model Metadata & Evaluation Metrics",
    description="Retrieves active model type, feature importances, and real test evaluation metrics.",
)
async def get_model_info() -> ModelInfoResponse:
    try:
        return risk_service.get_model_info()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reading model info: {str(e)}",
        )
