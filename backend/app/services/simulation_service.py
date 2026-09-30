"""
CycloneGuard AI - Scenario Simulation Service (Phase 5)

Coordinates "What-If" cyclone impact simulations by reusing the existing
risk-engine architecture (ML risk predictor and multi-hazard infrastructure models).
Computes quantitative baseline vs scenario impact metrics, comparison deltas,
and shifted geospatial track coordinates.
"""

import os
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple

from backend.app.schemas.simulation import (
    SimulationScenarioInput,
    ImpactMetrics,
    MetricComparison,
    SimulationDeltaMetrics,
    TrackPoint,
    ScenarioSimulationResponse,
)
from backend.app.services.risk_service import risk_service
from backend.app.services.infrastructure_service import infra_service

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
CYCLONE_PATH = os.path.join(BASE_DIR, "src", "data", "cyclone.json")

# Default baseline forecast conditions (Cyclone VAYU-B, Category 4)
BASELINE_WIND = 220.0
BASELINE_RAIN = 284.0
BASELINE_SURGE = 4.2
BASELINE_TRACK_OFFSET = 0.0

class SimulationService:
    def __init__(self):
        self._load_cyclone_data()

    def _load_cyclone_data(self):
        self.cyclone_data = {}
        if os.path.exists(CYCLONE_PATH):
            try:
                with open(CYCLONE_PATH, "r", encoding="utf-8") as f:
                    self.cyclone_data = json.load(f)
            except Exception:
                pass

    def _compute_impact_metrics(
        self,
        zones_data: Dict[str, Any],
        infra_data: Any,
    ) -> ImpactMetrics:
        """Derives aggregate impact metrics from enriched zones and infrastructure assessment."""
        zones = zones_data.get("zones", [])

        # High risk zones (high or critical severity or score >= 60)
        high_risk_zones = [z for z in zones if z.get("severity") in ["high", "critical"] or z.get("riskScore", 0) >= 60]
        high_risk_pop = sum(int(z.get("population", 0)) for z in high_risk_zones)

        # Zones with active impact exposure (medium, high, critical or score >= 40)
        exposed_zones = [z for z in zones if z.get("severity") in ["medium", "high", "critical"] or z.get("riskScore", 0) >= 40]
        total_exposed_pop = sum(int(z.get("population", 0)) for z in exposed_zones)

        summary = infra_data.summary

        return ImpactMetrics(
            population_exposed=total_exposed_pop,
            high_risk_population=high_risk_pop,
            high_risk_zones_count=len(high_risk_zones),
            critical_infrastructure_at_risk=summary.total_at_risk,
            roads_exposed=summary.roads_at_risk,
            bridges_exposed=summary.bridges_at_risk,
            hospitals_exposed=summary.hospitals_at_risk,
            power_assets_exposed=summary.power_assets_at_risk,
            shelters_exposed=summary.shelters_exposed,
        )

    def _compute_deltas(
        self, baseline: ImpactMetrics, scenario: ImpactMetrics
    ) -> SimulationDeltaMetrics:
        """Calculates numerical deltas and percentage changes for all metrics."""
        def compare(b_val: float, s_val: float) -> MetricComparison:
            d = s_val - b_val
            pct = round((d / max(1.0, float(b_val))) * 100.0, 1)
            return MetricComparison(
                baseline=float(b_val),
                scenario=float(s_val),
                delta=float(d),
                percent_change=pct,
            )

        return SimulationDeltaMetrics(
            population_exposed=compare(baseline.population_exposed, scenario.population_exposed),
            high_risk_population=compare(baseline.high_risk_population, scenario.high_risk_population),
            high_risk_zones_count=compare(baseline.high_risk_zones_count, scenario.high_risk_zones_count),
            critical_infrastructure_at_risk=compare(baseline.critical_infrastructure_at_risk, scenario.critical_infrastructure_at_risk),
            roads_exposed=compare(baseline.roads_exposed, scenario.roads_exposed),
            bridges_exposed=compare(baseline.bridges_exposed, scenario.bridges_exposed),
            hospitals_exposed=compare(baseline.hospitals_exposed, scenario.hospitals_exposed),
            power_assets_exposed=compare(baseline.power_assets_exposed, scenario.power_assets_exposed),
            shelters_exposed=compare(baseline.shelters_exposed, scenario.shelters_exposed),
        )

    def _generate_tracks(self, offset_km: float, wind_speed: float) -> Tuple[List[TrackPoint], List[TrackPoint]]:
        """Generates baseline and shifted forecast track points."""
        forecast = self.cyclone_data.get("forecastTrack", [
            {"lat": 18.6, "lng": 85.9, "category": 4, "windSpeedKmh": 215, "label": "T+6h"},
            {"lat": 19.4, "lng": 85.5, "category": 4, "windSpeedKmh": 205, "label": "T+12h"},
            {"lat": 20.2, "lng": 85.2, "category": 3, "windSpeedKmh": 185, "label": "T+18h (Landfall)"},
            {"lat": 21.0, "lng": 84.9, "category": 3, "windSpeedKmh": 160, "label": "T+24h"},
            {"lat": 21.8, "lng": 84.6, "category": 2, "windSpeedKmh": 130, "label": "T+30h"},
        ])

        baseline_points: List[TrackPoint] = []
        shifted_points: List[TrackPoint] = []

        # Vector offset perpendicular to track path
        lat_shift = -(offset_km / 111.0) * 0.3
        lng_shift = +(offset_km / 104.0) * 0.9

        wind_ratio = wind_speed / BASELINE_WIND

        for pt in forecast:
            b_point = TrackPoint(
                lat=round(float(pt.get("lat", 20.0)), 4),
                lng=round(float(pt.get("lng", 85.0)), 4),
                label=pt.get("label", ""),
                category=int(pt.get("category", 3)),
                wind_speed_kmh=round(float(pt.get("windSpeedKmh", BASELINE_WIND)), 1),
            )
            baseline_points.append(b_point)

            # Recalculate category from simulated wind speed
            sim_wind = round(b_point.wind_speed_kmh * wind_ratio, 1)
            if sim_wind >= 250:
                cat = 5
            elif sim_wind >= 210:
                cat = 4
            elif sim_wind >= 165:
                cat = 3
            elif sim_wind >= 120:
                cat = 2
            else:
                cat = 1

            s_point = TrackPoint(
                lat=round(b_point.lat + lat_shift, 4),
                lng=round(b_point.lng + lng_shift, 4),
                label=f"Simulated {pt.get('label', '')}",
                category=cat,
                wind_speed_kmh=sim_wind,
            )
            shifted_points.append(s_point)

        return baseline_points, shifted_points

    def _get_baseline_data(self):
        """Caches baseline simulation evaluation to ensure sub-second response times."""
        if not hasattr(self, "_cached_baseline") or self._cached_baseline is None:
            b_zones = risk_service.get_predicted_risk_zones(
                core_wind=BASELINE_WIND,
                peak_surge=BASELINE_SURGE,
                peak_rain=BASELINE_RAIN,
                track_offset_km=BASELINE_TRACK_OFFSET,
            )
            b_infra = infra_service.assess_all_infrastructure(
                core_wind=BASELINE_WIND,
                peak_surge=BASELINE_SURGE,
                peak_rain=BASELINE_RAIN,
                track_offset_km=BASELINE_TRACK_OFFSET,
            )
            baseline_metrics = self._compute_impact_metrics(b_zones, b_infra)
            baseline_track, _ = self._generate_tracks(BASELINE_TRACK_OFFSET, BASELINE_WIND)
            self._cached_baseline = (b_zones, b_infra, baseline_metrics, baseline_track)
        return self._cached_baseline

    def run_simulation(self, scenario: SimulationScenarioInput) -> ScenarioSimulationResponse:
        """Executes a full what-if impact simulation reusing the Phase 3/4 risk engine."""
        # 1. Baseline Evaluation (retrieved from cache)
        b_zones, b_infra, baseline_metrics, baseline_track = self._get_baseline_data()

        # 2. Scenario Evaluation (reusing risk_service and infra_service with user-specified scenario)
        s_zones = risk_service.get_predicted_risk_zones(
            core_wind=scenario.wind_speed,
            peak_surge=scenario.storm_surge,
            peak_rain=scenario.rainfall,
            track_offset_km=scenario.track_offset_km,
        )
        s_infra = infra_service.assess_all_infrastructure(
            core_wind=scenario.wind_speed,
            peak_surge=scenario.storm_surge,
            peak_rain=scenario.rainfall,
            track_offset_km=scenario.track_offset_km,
        )
        scenario_metrics = self._compute_impact_metrics(s_zones, s_infra)

        # 3. Compute Comparative Deltas
        deltas = self._compute_deltas(baseline_metrics, scenario_metrics)

        # 4. Generate Geospatial Tracks
        baseline_track, shifted_track = self._generate_tracks(
            scenario.track_offset_km, scenario.wind_speed
        )

        # 5. Build Response
        sim_id = f"sim-{uuid.uuid4().hex[:8]}"
        name = scenario.scenario_name or f"Scenario ({scenario.wind_speed:.0f} km/h, {scenario.storm_surge:.1f}m surge)"

        return ScenarioSimulationResponse(
            scenario_id=sim_id,
            scenario_name=name,
            timestamp=datetime.now(timezone.utc).isoformat(),
            parameters=scenario,
            baseline_metrics=baseline_metrics,
            scenario_metrics=scenario_metrics,
            deltas=deltas,
            risk_zones=s_zones.get("zones", []),
            infrastructure_summary=s_infra.summary.model_dump(),
            shifted_track=shifted_track,
            baseline_track=baseline_track,
            landfall_shift_km=abs(scenario.track_offset_km),
            disclaimer="SIMULATED SCENARIO — NOT AN OFFICIAL FORECAST",
            notice="Decision-support simulation generated by CycloneGuard AI Risk Engine.",
        )

    def get_baseline_summary(self) -> Dict[str, Any]:
        """Returns baseline metrics without running a full scenario comparison."""
        b_zones = risk_service.get_predicted_risk_zones()
        b_infra = infra_service.assess_all_infrastructure()
        baseline_metrics = self._compute_impact_metrics(b_zones, b_infra)
        b_track, _ = self._generate_tracks(0.0, BASELINE_WIND)
        return {
            "parameters": {
                "wind_speed": BASELINE_WIND,
                "rainfall": BASELINE_RAIN,
                "storm_surge": BASELINE_SURGE,
                "track_offset_km": BASELINE_TRACK_OFFSET,
            },
            "metrics": baseline_metrics.model_dump(),
            "baseline_track": [t.model_dump() for t in b_track],
            "disclaimer": "SIMULATED SCENARIO — NOT AN OFFICIAL FORECAST",
        }

simulation_service = SimulationService()
