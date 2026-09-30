"""
CycloneGuard AI - Infrastructure API Routes (Phase 4)

Endpoints for critical infrastructure multi-hazard vulnerability assessment:
- GET  /api/infrastructure/assess
- GET  /api/infrastructure/summary
"""

from fastapi import APIRouter, HTTPException, status
from backend.app.schemas.infrastructure import (
    InfrastructureAssessmentResponse,
    InfrastructureSummaryStats,
)
from backend.app.services.infrastructure_service import infra_service

router = APIRouter(prefix="/api/infrastructure", tags=["Critical Infrastructure Risk"])

@router.get(
    "/assess",
    response_model=InfrastructureAssessmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Multi-Hazard Vulnerability Assessment for All Critical Infrastructure",
    description="Calculates flood, wind, surge, location, and overall vulnerability scores across 7 asset types.",
)
async def assess_infrastructure() -> InfrastructureAssessmentResponse:
    try:
        return infra_service.assess_all_infrastructure()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error evaluating infrastructure vulnerability: {str(e)}",
        )

@router.get(
    "/summary",
    response_model=InfrastructureSummaryStats,
    status_code=status.HTTP_200_OK,
    summary="Get Infrastructure Risk Summary Statistics for Dashboard",
    description="Returns aggregate counts of power, road, bridge, hospital, school, shelter, and telecom assets at risk.",
)
async def get_infrastructure_summary() -> InfrastructureSummaryStats:
    try:
        res = infra_service.assess_all_infrastructure()
        return res.summary
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error compiling infrastructure summary statistics: {str(e)}",
        )
