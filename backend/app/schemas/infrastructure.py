"""
CycloneGuard AI - Infrastructure Risk Schemas (Phase 4)

Pydantic schemas for multi-hazard critical infrastructure vulnerability assessment.
"""

from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class InfrastructureAssetVulnerability(BaseModel):
    id: str
    name: str
    type: str = Field(..., description="Asset type: power, bridges, roads, hospitals, schools, shelters, telecommunications")
    lat: Optional[float] = None
    lng: Optional[float] = None
    risk_level: str = Field(..., description="Severity category: low, medium, high, critical")
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Overall risk / vulnerability score (0-100)")
    flood_exposure: float = Field(..., ge=0.0, le=100.0, description="Modeled flood inundation exposure percentage")
    wind_exposure: float = Field(..., ge=0.0, le=100.0, description="Modeled cyclonic wind exposure percentage")
    storm_surge_exposure: float = Field(..., ge=0.0, le=100.0, description="Modeled coastal storm surge exposure percentage")
    location_vulnerability: float = Field(..., ge=0.0, le=100.0, description="Geographic terrain and hazard proximity vulnerability percentage")
    overall_vulnerability: float = Field(..., ge=0.0, le=100.0, description="Composite multi-hazard vulnerability index (0-100)")
    risk_factors: List[str] = Field(default_factory=list, description="Primary physical and meteorological drivers contributing to vulnerability")
    preparedness_note: str = Field(..., description="Tailored actionable preparedness and mitigation instructions")
    population_dependent: Optional[int] = Field(None, description="Commuters, patients, students, or residents served by the asset")
    status: str = Field("operational", description="Current operational status: operational, at-risk, damaged, offline")
    notes: Optional[str] = None
    elevation_m: Optional[float] = None
    capacity: Optional[int] = None
    details: Optional[Dict[str, Any]] = None

class InfrastructureSummaryStats(BaseModel):
    power_assets_at_risk: int
    roads_at_risk: int
    bridges_at_risk: int
    hospitals_at_risk: int
    shelters_exposed: int
    schools_at_risk: int
    telecom_at_risk: int
    total_at_risk: int
    total_assets: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    total_population_affected: int

class InfrastructureAssessmentResponse(BaseModel):
    assets_by_type: Dict[str, List[InfrastructureAssetVulnerability]]
    all_assets: List[InfrastructureAssetVulnerability]
    summary: InfrastructureSummaryStats
    is_simulated_demo: bool = True
    notice: str = "SIMULATED DEMO DATA: Physical vulnerability modeled using hydrodynamic and meteorological spatial risk inputs."
