"""
CycloneGuard AI - Scenario Simulator API Routes (Phase 5)

Endpoints for interactive cyclone impact "What-If" simulations:
- POST /api/simulation/run
- GET  /api/simulation/baseline
"""

from fastapi import APIRouter, HTTPException, status
from backend.app.schemas.simulation import (
    SimulationScenarioInput,
    ScenarioSimulationResponse,
)
from backend.app.services.simulation_service import simulation_service

router = APIRouter(prefix="/api/simulation", tags=["Scenario Simulator"])

@router.post(
    "/run",
    response_model=ScenarioSimulationResponse,
    status_code=status.HTTP_200_OK,
    summary="Run Cyclone Impact What-If Simulation",
    description="Recalculates spatial risk zones and critical infrastructure vulnerability under user-defined scenario parameters (wind speed, rainfall, storm surge, track offset).",
)
async def run_simulation(scenario: SimulationScenarioInput) -> ScenarioSimulationResponse:
    try:
        return simulation_service.run_simulation(scenario)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing scenario simulation: {str(e)}",
        )

@router.get(
    "/baseline",
    status_code=status.HTTP_200_OK,
    summary="Get Baseline Cyclone Impact Metrics",
    description="Retrieves the current official forecast baseline impact metrics for side-by-side scenario comparison.",
)
async def get_baseline():
    try:
        return simulation_service.get_baseline_summary()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving baseline metrics: {str(e)}",
        )
