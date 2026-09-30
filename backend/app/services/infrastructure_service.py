"""
CycloneGuard AI - Infrastructure Vulnerability Service (Phase 4)

Calculates multi-hazard vulnerability (flood, wind, storm surge, location, overall vulnerability)
for critical infrastructure assets based on Phase 3 spatial risk results.
Supported assets:
- Power substations
- Bridges
- Roads
- Hospitals
- Schools
- Shelters
- Communication towers
"""

import os
import json
import math
from typing import Dict, List, Any, Optional

from ml.predict import predictor
from backend.app.schemas.infrastructure import (
    InfrastructureAssetVulnerability,
    InfrastructureSummaryStats,
    InfrastructureAssessmentResponse,
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
INFRASTRUCTURE_DATA_PATH = os.path.join(BASE_DIR, "src", "data", "infrastructure.json")

# Default cyclone reference position (Cyclone VAYU-B, Category 4)
EYE_LAT = 19.8
EYE_LNG = 85.8
CORE_WIND = 220.0
PEAK_SURGE = 4.2
PEAK_RAIN = 284.0

class InfrastructureRiskService:
    def __init__(self):
        self.risk_predictor = predictor

    def _extract_asset_environmental_features(
        self,
        lat: float,
        lng: float,
        elevation: float = 5.0,
        core_wind: float = CORE_WIND,
        peak_surge: float = PEAK_SURGE,
        peak_rain: float = PEAK_RAIN,
        eye_lat: float = EYE_LAT,
        eye_lng: float = EYE_LNG,
    ) -> Dict[str, float]:
        """Calculates localized cyclone hazard features at specific asset coordinates."""
        # Coastline reference approximation along Odisha
        coast_lng = 85.0 + (lat - 19.0) * 0.95
        dist_coast = max(0.4, abs(lng - coast_lng) * 98.0)

        # Distance from cyclone eye / core track
        dist_track = math.sqrt((lat - eye_lat) ** 2 + (lng - eye_lng) ** 2) * 111.0
        dist_track = max(1.5, dist_track)

        # Atmospheric and hydrodynamic physical decay models
        wind = core_wind * (0.35 + 0.65 * math.exp(-dist_track / 90.0))
        surge = max(0.0, peak_surge * math.exp(-dist_coast / 14.0) * math.exp(-dist_track / 70.0))
        rainfall = (peak_rain * 0.30) + (peak_rain * 0.70) * math.exp(-dist_track / 110.0) + (1.0 / (elevation + 1.0)) * 20.0
        flood_exp = min(1.0, max(0.1, 0.9 * math.exp(-elevation / 20.0)))

        return {
            "wind_speed": round(float(wind), 1),
            "rainfall": round(float(rainfall), 1),
            "storm_surge": round(float(surge), 2),
            "elevation": round(float(elevation), 1),
            "distance_from_coast": round(float(dist_coast), 1),
            "distance_from_cyclone_track": round(float(dist_track), 1),
            "historical_flood_exposure": round(float(flood_exp), 3),
        }

    def _calculate_asset_vulnerability(
        self,
        asset_id: str,
        name: str,
        asset_type: str,
        lat: Optional[float],
        lng: Optional[float],
        elevation: float,
        raw_status: str,
        notes: str,
        extra_attrs: Dict[str, Any],
        core_wind: float = CORE_WIND,
        peak_surge: float = PEAK_SURGE,
        peak_rain: float = PEAK_RAIN,
        eye_lat: float = EYE_LAT,
        eye_lng: float = EYE_LNG,
    ) -> InfrastructureAssetVulnerability:
        """Computes multi-hazard exposure percentages, overall vulnerability score, and risk factors."""
        if lat is None or lng is None:
            # Default coordinate near Puri if missing
            lat, lng = eye_lat, eye_lng

        # 1. Local environmental features
        env = self._extract_asset_environmental_features(
            lat, lng, elevation,
            core_wind=core_wind,
            peak_surge=peak_surge,
            peak_rain=peak_rain,
            eye_lat=eye_lat,
            eye_lng=eye_lng,
        )

        # 2. Run through Phase 3 ML Risk Engine for baseline probability
        ml_pred = self.risk_predictor.predict(env)
        ml_score = ml_pred.get("risk_score", 50.0)

        # 3. Multi-hazard exposure metrics (0–100%)
        # Flood exposure: based on rainfall, low elevation, and historical susceptibility
        flood_raw = (
            (env["rainfall"] / 320.0) * 0.50
            + env["historical_flood_exposure"] * 0.30
            + max(0.0, 1.0 - (elevation / 35.0)) * 0.20
        )
        flood_exposure = round(float(min(100.0, max(5.0, flood_raw * 100.0))), 1)

        # Wind exposure: based on sustained winds and gusts
        wind_raw = min(1.0, max(0.1, (env["wind_speed"] - 40.0) / 190.0))
        # Tall masts, bridges, and substations have higher wind exposure
        if asset_type in ["telecommunications", "bridges", "power"]:
            wind_raw = min(1.0, wind_raw * 1.15)
        wind_exposure = round(float(min(100.0, max(8.0, wind_raw * 100.0))), 1)

        # Storm-surge exposure: surge height vs ground elevation & coast proximity
        surge_diff = max(0.0, env["storm_surge"] - (elevation * 0.35))
        surge_raw = min(1.0, (surge_diff / 3.2)) * math.exp(-env["distance_from_coast"] / 22.0)
        storm_surge_exposure = round(float(min(100.0, max(0.0, surge_raw * 100.0))), 1)

        # Location vulnerability: proximity to coastline and cyclone center
        loc_raw = (
            math.exp(-env["distance_from_coast"] / 25.0) * 0.55
            + math.exp(-env["distance_from_cyclone_track"] / 80.0) * 0.45
        )
        location_vulnerability = round(float(min(100.0, max(5.0, loc_raw * 100.0))), 1)

        # 4. Overall Vulnerability Index (0–100)
        # Weighted multi-hazard vulnerability calibrated per asset type
        weights = {
            "power": (0.35, 0.30, 0.25, 0.10),             # flood, wind, surge, location
            "bridges": (0.35, 0.25, 0.30, 0.10),
            "roads": (0.45, 0.15, 0.30, 0.10),
            "hospitals": (0.40, 0.30, 0.20, 0.10),
            "schools": (0.40, 0.25, 0.25, 0.10),
            "shelters": (0.25, 0.35, 0.30, 0.10),
            "telecommunications": (0.20, 0.55, 0.15, 0.10),
        }.get(asset_type, (0.30, 0.30, 0.30, 0.10))

        w_flood, w_wind, w_surge, w_loc = weights
        raw_composite = (
            w_flood * flood_exposure
            + w_wind * wind_exposure
            + w_surge * storm_surge_exposure
            + w_loc * location_vulnerability
        )

        # Combine with ML spatial risk score (70% multi-hazard physical exposure + 30% ML baseline)
        overall_score = round(float(min(100.0, max(5.0, 0.70 * raw_composite + 0.30 * ml_score))), 1)

        # 5. Risk Category Assignment
        if overall_score >= 75.0:
            risk_level = "critical"
        elif overall_score >= 50.0:
            risk_level = "high"
        elif overall_score >= 25.0:
            risk_level = "medium"
        else:
            risk_level = "low"

        # 6. Specific Contributing Risk Factors
        factors = []
        if elevation <= 4.0:
            factors.append(f"low elevation ({elevation:.1f}m ASL)")
        elif elevation <= 8.0:
            factors.append(f"low-lying terrain ({elevation:.1f}m ASL)")

        if env["distance_from_coast"] <= 3.0:
            factors.append(f"immediate coastline proximity ({env['distance_from_coast']:.1f}km)")
        elif env["distance_from_coast"] <= 15.0:
            factors.append(f"close to coastline ({env['distance_from_coast']:.1f}km)")

        if env["rainfall"] >= 200.0:
            factors.append(f"high modeled rainfall ({env['rainfall']:.0f}mm/24h)")

        if storm_surge_exposure >= 50.0:
            factors.append(f"extreme storm-surge exposure ({env['storm_surge']:.1f}m surge threat)")

        if env["wind_speed"] >= 180.0:
            factors.append(f"destructive Category 4 cyclonic wind ({env['wind_speed']:.0f} km/h)")
        elif env["wind_speed"] >= 120.0:
            factors.append(f"severe gale-force wind gusts ({env['wind_speed']:.0f} km/h)")

        if env["distance_from_cyclone_track"] <= 30.0:
            factors.append(f"close to cyclone path ({env['distance_from_cyclone_track']:.0f}km from eye)")

        if not factors:
            factors.append("peripheral weather exposure")

        # 7. Actionable Preparedness Notes Tailored by Asset Type
        preparedness_notes = {
            "power": (
                "Elevate control switchgear and transformer pads above flood line. Preemptively transfer load to backup 220kV transmission line and isolate shoreline feeders."
                if overall_score >= 50
                else "Confirm emergency battery banks and mobilize auxiliary repair crews for post-landfall grid restoration."
            ),
            "bridges": (
                "Deploy acoustic sonar scour inspection at pier footings. Enforce total vehicle closure if winds exceed 90 km/h or river surge crests bridge deck."
                if overall_score >= 50
                else "Monitor hydrodynamic water level gauges and inspect drainage scuppers for debris clogging."
            ),
            "roads": (
                "Pre-stage sandbags and earthmoving excavators at vulnerable low-lying km markers. Establish designated alternative evacuation bypass routes."
                if overall_score >= 50
                else "Maintain active highway patrol monitoring for tree fall and overhead wire clearance."
            ),
            "hospitals": (
                "Verify 72-hour diesel supply for emergency generators. Evacuate basement ICU and pharmacy inventory to upper floors; verify medical oxygen cylinder reserves."
                if overall_score >= 50
                else "Confirm emergency room trauma readiness and verify backup water pump operation."
            ),
            "schools": (
                "Order full suspension of educational operations. Secure rooftop solar panels and windows; prepare ground floor dry-storage for relief kit distribution."
                if overall_score >= 50
                else "Inspect roof waterproofing and verify emergency communications battery readiness."
            ),
            "shelters": (
                "Inspect roof structural tie-downs and surge barrier gates. Replenish clean drinking water tanks, backup generator fuel, and satellite communication radios."
                if overall_score >= 50
                else "Confirm shelter registration desk readiness and emergency medical kit inventory."
            ),
            "telecommunications": (
                "Inspect guy-wire tension and engage structural vibration dampers. Ensure tower base station diesel generator fuel is topped off; deploy mobile COW units."
                if overall_score >= 50
                else "Verify battery bank autonomy (minimum 12 hours) and satellite backhaul fallback links."
            ),
        }.get(asset_type, "Conduct precautionary structural inspection and review emergency continuity protocol.")

        # Population dependent where reliable demo data exists
        pop_dependent = extra_attrs.get("affectedPopulation") or extra_attrs.get("capacity")

        return InfrastructureAssetVulnerability(
            id=asset_id,
            name=name,
            type=asset_type,
            lat=lat,
            lng=lng,
            risk_level=risk_level,
            risk_score=overall_score,
            flood_exposure=flood_exposure,
            wind_exposure=wind_exposure,
            storm_surge_exposure=storm_surge_exposure,
            location_vulnerability=location_vulnerability,
            overall_vulnerability=overall_score,
            risk_factors=factors[:4],
            preparedness_note=preparedness_notes,
            population_dependent=pop_dependent,
            status=raw_status,
            notes=notes,
            elevation_m=elevation,
            capacity=extra_attrs.get("capacity"),
            details={
                **env,
                "ml_baseline_score": ml_score,
                **extra_attrs,
            },
        )

    def assess_all_infrastructure(
        self,
        core_wind: float = CORE_WIND,
        peak_surge: float = PEAK_SURGE,
        peak_rain: float = PEAK_RAIN,
        track_offset_km: float = 0.0,
    ) -> InfrastructureAssessmentResponse:
        """Loads infrastructure.json, evaluates all assets, and compiles dashboard statistics."""
        data = {}
        if os.path.exists(INFRASTRUCTURE_DATA_PATH):
            with open(INFRASTRUCTURE_DATA_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)

        eye_lat = EYE_LAT - (track_offset_km / 111.0) * 0.3
        eye_lng = EYE_LNG + (track_offset_km / 104.0) * 0.9

        def eval_asset(asset_id, name, asset_type, lat, lng, elevation, raw_status, notes, extra_attrs):
            return self._calculate_asset_vulnerability(
                asset_id=asset_id,
                name=name,
                asset_type=asset_type,
                lat=lat,
                lng=lng,
                elevation=elevation,
                raw_status=raw_status,
                notes=notes,
                extra_attrs=extra_attrs,
                core_wind=core_wind,
                peak_surge=peak_surge,
                peak_rain=peak_rain,
                eye_lat=eye_lat,
                eye_lng=eye_lng,
            )

        assets_by_type: Dict[str, List[InfrastructureAssetVulnerability]] = {
            "power": [],
            "bridges": [],
            "roads": [],
            "hospitals": [],
            "schools": [],
            "shelters": [],
            "telecommunications": [],
        }
        all_assets: List[InfrastructureAssetVulnerability] = []

        # 1. Hospitals
        for h in data.get("hospitals", []):
            elev = 6.0 if h.get("floodRisk") else 15.0
            v = eval_asset(
                asset_id=h["id"],
                name=h["name"],
                asset_type="hospitals",
                lat=h.get("lat"),
                lng=h.get("lng"),
                elevation=elev,
                raw_status=h.get("status", "operational"),
                notes=h.get("notes", ""),
                extra_attrs={"capacity": h.get("capacity", 300), "icu_beds": h.get("icu_beds", 20), "backupPower": h.get("backupPower", True)},
            )
            assets_by_type["hospitals"].append(v)
            all_assets.append(v)

        # 2. Shelters
        for s in data.get("shelters", []):
            elev = 4.0 if s["id"] in ["s-001", "s-002"] else 12.0
            v = eval_asset(
                asset_id=s["id"],
                name=s["name"],
                asset_type="shelters",
                lat=s.get("lat"),
                lng=s.get("lng"),
                elevation=elev,
                raw_status=s.get("status", "operational"),
                notes=s.get("notes", ""),
                extra_attrs={"capacity": s.get("capacity", 1500), "currentOccupancy": s.get("currentOccupancy", 0)},
            )
            assets_by_type["shelters"].append(v)
            all_assets.append(v)

        # 3. Power Substations
        for p in data.get("powerSubstations", []):
            elev = 3.0 if p["id"] in ["p-001", "p-004", "p-006"] else 18.0
            v = eval_asset(
                asset_id=p["id"],
                name=p["name"],
                asset_type="power",
                lat=p.get("lat"),
                lng=p.get("lng"),
                elevation=elev,
                raw_status=p.get("status", "operational"),
                notes=p.get("notes", ""),
                extra_attrs={"affectedPopulation": p.get("affectedPopulation", 100000), "voltageKv": p.get("voltageKv", 132), "backupLine": p.get("backupLine", False)},
            )
            assets_by_type["power"].append(v)
            all_assets.append(v)

        # 4. Bridges
        for b in data.get("bridges", []):
            elev = 3.5 if b["id"] in ["b-001", "b-002"] else 14.0
            v = eval_asset(
                asset_id=b["id"],
                name=b["name"],
                asset_type="bridges",
                lat=b.get("lat"),
                lng=b.get("lng"),
                elevation=elev,
                raw_status=b.get("status", "operational"),
                notes=b.get("notes", ""),
                extra_attrs={"spanM": b.get("spanM", 500), "condition": b.get("condition", "Fair"), "route": b.get("route", "NH")},
            )
            assets_by_type["bridges"].append(v)
            all_assets.append(v)

        # 5. Roads
        for r in data.get("roads", []):
            coords = r.get("coordinates", [])
            if coords:
                mid = coords[len(coords) // 2]
                lat, lng = mid[1], mid[0]
            else:
                lat, lng = eye_lat, eye_lng
            elev = 2.5 if r["id"] in ["r-001", "r-003", "r-005"] else 12.0
            v = eval_asset(
                asset_id=r["id"],
                name=r["name"],
                asset_type="roads",
                lat=lat,
                lng=lng,
                elevation=elev,
                raw_status=r.get("status", "operational"),
                notes=r.get("notes", ""),
                extra_attrs={"lengthKm": r.get("lengthKm", 50)},
            )
            assets_by_type["roads"].append(v)
            all_assets.append(v)

        # 6. Schools
        for sc in data.get("schools", []):
            elev = sc.get("elevation", 5.0)
            v = eval_asset(
                asset_id=sc["id"],
                name=sc["name"],
                asset_type="schools",
                lat=sc.get("lat"),
                lng=sc.get("lng"),
                elevation=elev,
                raw_status=sc.get("status", "operational"),
                notes=sc.get("notes", ""),
                extra_attrs={"capacity": sc.get("capacity", 1000), "backupPower": sc.get("backupPower", False)},
            )
            assets_by_type["schools"].append(v)
            all_assets.append(v)

        # 7. Communication Towers
        for t in data.get("communicationTowers", []):
            elev = t.get("elevation", 5.0)
            v = eval_asset(
                asset_id=t["id"],
                name=t["name"],
                asset_type="telecommunications",
                lat=t.get("lat"),
                lng=t.get("lng"),
                elevation=elev,
                raw_status=t.get("status", "operational"),
                notes=t.get("notes", ""),
                extra_attrs={"affectedPopulation": t.get("affectedPopulation", 100000), "heightM": t.get("heightM", 60), "backupBatteryHours": t.get("backupBatteryHours", 12)},
            )
            assets_by_type["telecommunications"].append(v)
            all_assets.append(v)

        # 8. Compute Dashboard Statistics
        def is_at_risk(asset: InfrastructureAssetVulnerability) -> bool:
            return asset.risk_level in ["high", "critical"] or asset.overall_vulnerability >= 50.0

        power_at_risk = sum(1 for a in assets_by_type["power"] if is_at_risk(a))
        roads_at_risk = sum(1 for a in assets_by_type["roads"] if is_at_risk(a))
        bridges_at_risk = sum(1 for a in assets_by_type["bridges"] if is_at_risk(a))
        hospitals_at_risk = sum(1 for a in assets_by_type["hospitals"] if is_at_risk(a))
        shelters_exposed = sum(1 for a in assets_by_type["shelters"] if is_at_risk(a))
        schools_at_risk = sum(1 for a in assets_by_type["schools"] if is_at_risk(a))
        telecom_at_risk = sum(1 for a in assets_by_type["telecommunications"] if is_at_risk(a))

        crit_count = sum(1 for a in all_assets if a.risk_level == "critical")
        high_count = sum(1 for a in all_assets if a.risk_level == "high")
        med_count = sum(1 for a in all_assets if a.risk_level == "medium")
        low_count = sum(1 for a in all_assets if a.risk_level == "low")
        total_risk = crit_count + high_count

        total_pop = sum(a.population_dependent or 0 for a in all_assets if is_at_risk(a))

        summary = InfrastructureSummaryStats(
            power_assets_at_risk=power_at_risk,
            roads_at_risk=roads_at_risk,
            bridges_at_risk=bridges_at_risk,
            hospitals_at_risk=hospitals_at_risk,
            shelters_exposed=shelters_exposed,
            schools_at_risk=schools_at_risk,
            telecom_at_risk=telecom_at_risk,
            total_at_risk=total_risk,
            total_assets=len(all_assets),
            critical_count=crit_count,
            high_count=high_count,
            medium_count=med_count,
            low_count=low_count,
            total_population_affected=total_pop,
        )

        return InfrastructureAssessmentResponse(
            assets_by_type=assets_by_type,
            all_assets=all_assets,
            summary=summary,
            is_simulated_demo=True,
        )

infra_service = InfrastructureRiskService()
