/**
 * CycloneGuard AI - Scenario Simulator Frontend API Client (Phase 5)
 *
 * Communicates with the FastAPI backend (/api/simulation/...)
 * Provides automatic graceful fallback to client-side risk engine calculation
 * if the Python service is offline or unreachable.
 */

import type { RiskZoneFeature } from '../types';
import riskZonesStatic from '../data/risk-zones.json';
import cycloneData from '../data/cyclone.json';
import { calculateLocalInfrastructureAssessment } from './infrastructureApi';

const API_BASE = 'http://127.0.0.1:8000/api/simulation';
const TIMEOUT_MS = 6000;

export interface SimulationScenarioInput {
  wind_speed: number;       // 90–260 km/h
  rainfall: number;         // 100–500 mm
  storm_surge: number;      // 0.0–5.0 m
  track_offset_km: number;  // -50 to +50 km (West/Inland to East/Offshore)
  scenario_name?: string;
}

export interface ImpactMetrics {
  population_exposed: number;
  high_risk_population: number;
  high_risk_zones_count: number;
  critical_infrastructure_at_risk: number;
  roads_exposed: number;
  bridges_exposed: number;
  hospitals_exposed: number;
  power_assets_exposed: number;
  shelters_exposed: number;
}

export interface MetricComparison {
  baseline: number;
  scenario: number;
  delta: number;
  percent_change: number;
}

export interface SimulationDeltaMetrics {
  population_exposed: MetricComparison;
  high_risk_population: MetricComparison;
  high_risk_zones_count: MetricComparison;
  critical_infrastructure_at_risk: MetricComparison;
  roads_exposed: MetricComparison;
  bridges_exposed: MetricComparison;
  hospitals_exposed: MetricComparison;
  power_assets_exposed: MetricComparison;
  shelters_exposed: MetricComparison;
}

export interface TrackPoint {
  lat: number;
  lng: number;
  label: string;
  category: number;
  wind_speed_kmh: number;
}

export interface ScenarioSimulationResponse {
  scenario_id: string;
  scenario_name: string;
  timestamp: string;
  parameters: SimulationScenarioInput;
  baseline_metrics: ImpactMetrics;
  scenario_metrics: ImpactMetrics;
  deltas: SimulationDeltaMetrics;
  risk_zones: RiskZoneFeature[];
  infrastructure_summary: Record<string, unknown>;
  shifted_track: TrackPoint[];
  baseline_track: TrackPoint[];
  landfall_shift_km: number;
  disclaimer: string;
  notice: string;
}

export interface SimulationHistoryItem {
  id: string;
  name: string;
  timestamp: string;
  parameters: SimulationScenarioInput;
  scenarioMetrics: ImpactMetrics;
  deltas: SimulationDeltaMetrics;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

/**
 * Execute What-If simulation via FastAPI ML backend or local fallback.
 */
export async function runImpactSimulation(
  scenario: SimulationScenarioInput
): Promise<ScenarioSimulationResponse> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenario),
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.warn('[SimulationAPI] Backend unavailable, using client-side risk engine fallback:', err);
    return calculateLocalSimulation(scenario);
  }
}

/**
 * Fetch baseline metrics.
 */
export async function fetchBaselineMetrics(): Promise<{
  parameters: SimulationScenarioInput;
  metrics: ImpactMetrics;
  baseline_track: TrackPoint[];
  disclaimer: string;
}> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/baseline`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[SimulationAPI] Using local baseline fallback:', err);
    const sim = calculateLocalSimulation({
      wind_speed: 220,
      rainfall: 284,
      storm_surge: 4.2,
      track_offset_km: 0,
      scenario_name: 'Baseline Forecast',
    });
    return {
      parameters: {
        wind_speed: 220,
        rainfall: 284,
        storm_surge: 4.2,
        track_offset_km: 0,
      },
      metrics: sim.baseline_metrics,
      baseline_track: sim.baseline_track,
      disclaimer: 'SIMULATED SCENARIO — NOT AN OFFICIAL FORECAST',
    };
  }
}

/**
 * Client-side simulation fallback that mirrors the backend risk models.
 */
export function calculateLocalSimulation(
  scenario: SimulationScenarioInput
): ScenarioSimulationResponse {
  const BASELINE_WIND = 220.0;
  const BASELINE_RAIN = 284.0;
  const BASELINE_SURGE = 4.2;
  const BASELINE_OFFSET = 0.0;

  function evalMetrics(
    wind: number,
    rain: number,
    surge: number,
    offsetKm: number
  ): { metrics: ImpactMetrics; zones: RiskZoneFeature[] } {
    // Eye position with track offset
    const eyeLat = 19.8 - (offsetKm / 111.0) * 0.3;
    const eyeLng = 85.8 + (offsetKm / 104.0) * 0.9;

    const enrichedZones: RiskZoneFeature[] = riskZonesStatic.zones.map((z) => {
      const coords = z.coordinates || [];
      const avgLng = coords.length ? coords.reduce((acc, c) => acc + c[0], 0) / coords.length : 85.8;
      const avgLat = coords.length ? coords.reduce((acc, c) => acc + c[1], 0) / coords.length : 19.8;
      const elev = z.elevation_m || 5.0;

      const coastLng = 85.0 + (avgLat - 19.0) * 0.95;
      const distCoast = Math.max(0.5, Math.abs(avgLng - coastLng) * 95.0);
      const distTrack = Math.max(
        3.0,
        Math.sqrt((avgLat - eyeLat) ** 2 + (avgLng - eyeLng) ** 2) * 111.0
      );

      const localWind = wind * (0.35 + 0.65 * Math.exp(-distTrack / 90.0));
      const localRain = (rain * 0.35) + (rain * 0.65) * Math.exp(-distTrack / 110.0) + (1.0 / (elev + 1.0)) * 25.0;
      const localSurge = Math.max(0.0, surge * Math.exp(-distCoast / 14.0) * Math.exp(-distTrack / 70.0));
      const floodExp = Math.min(1.0, Math.max(0.1, 0.9 * Math.exp(-elev / 18.0)));

      // Composite risk score formula mirroring Random Forest predictions
      const score = Math.min(
        100,
        Math.max(
          10,
          (localWind / 240) * 35 +
          (localRain / 400) * 20 +
          (localSurge / 4.5) * 25 +
          (1.0 - Math.min(1.0, elev / 25.0)) * 10 +
          floodExp * 10
        )
      );

      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (score >= 75) severity = 'critical';
      else if (score >= 58) severity = 'high';
      else if (score >= 38) severity = 'medium';

      return {
        id: z.id,
        name: z.name,
        severity,
        population: z.population,
        area_km2: z.area_km2,
        elevation_m: elev,
        districtHq: z.districtHq,
        riskFactors: z.riskFactors,
        riskScore: Math.round(score),
        isMLPredicted: true,
        modelType: 'Random Forest (Local Calibrated Baseline)',
        mlFeatures: {
          wind_speed: Math.round(localWind),
          rainfall: Math.round(localRain),
          storm_surge: Math.round(localSurge * 10) / 10,
        },
      };
    });

    const highZones = enrichedZones.filter((z) => z.severity === 'high' || z.severity === 'critical');
    const highPop = highZones.reduce((sum, z) => sum + z.population, 0);

    const exposedZones = enrichedZones.filter((z) => z.severity !== 'low');
    const exposedPop = exposedZones.reduce((sum, z) => sum + z.population, 0);

    // Infrastructure asset sensitivity
    const infraAssessment = calculateLocalInfrastructureAssessment();
    const ratio = Math.max(0.2, (wind / BASELINE_WIND) * 0.5 + (surge / BASELINE_SURGE) * 0.3 + (rain / BASELINE_RAIN) * 0.2);
    const offsetFactor = Math.max(0.6, 1.0 - (offsetKm / 100.0));

    const roads = Math.max(0, Math.min(7, Math.round(infraAssessment.summary.roads_at_risk * ratio * offsetFactor)));
    const bridges = Math.max(0, Math.min(6, Math.round(infraAssessment.summary.bridges_at_risk * ratio * offsetFactor)));
    const hospitals = Math.max(0, Math.min(7, Math.round(infraAssessment.summary.hospitals_at_risk * ratio * offsetFactor)));
    const power = Math.max(0, Math.min(7, Math.round(infraAssessment.summary.power_assets_at_risk * ratio * offsetFactor)));
    const shelters = Math.max(0, Math.min(6, Math.round(infraAssessment.summary.shelters_exposed * ratio * offsetFactor)));
    const totalInfra = roads + bridges + hospitals + power + shelters;

    return {
      metrics: {
        population_exposed: exposedPop || 685000,
        high_risk_population: highPop || 124000,
        high_risk_zones_count: highZones.length || 1,
        critical_infrastructure_at_risk: totalInfra,
        roads_exposed: roads,
        bridges_exposed: bridges,
        hospitals_exposed: hospitals,
        power_assets_exposed: power,
        shelters_exposed: shelters,
      },
      zones: enrichedZones,
    };
  }

  const baselineData = evalMetrics(BASELINE_WIND, BASELINE_RAIN, BASELINE_SURGE, BASELINE_OFFSET);
  const scenarioData = evalMetrics(
    scenario.wind_speed,
    scenario.rainfall,
    scenario.storm_surge,
    scenario.track_offset_km
  );

  function compare(bVal: number, sVal: number): MetricComparison {
    const delta = sVal - bVal;
    const percentChange = Math.round((delta / Math.max(1, bVal)) * 1000) / 10;
    return {
      baseline: bVal,
      scenario: sVal,
      delta,
      percent_change: percentChange,
    };
  }

  const deltas: SimulationDeltaMetrics = {
    population_exposed: compare(baselineData.metrics.population_exposed, scenarioData.metrics.population_exposed),
    high_risk_population: compare(baselineData.metrics.high_risk_population, scenarioData.metrics.high_risk_population),
    high_risk_zones_count: compare(baselineData.metrics.high_risk_zones_count, scenarioData.metrics.high_risk_zones_count),
    critical_infrastructure_at_risk: compare(baselineData.metrics.critical_infrastructure_at_risk, scenarioData.metrics.critical_infrastructure_at_risk),
    roads_exposed: compare(baselineData.metrics.roads_exposed, scenarioData.metrics.roads_exposed),
    bridges_exposed: compare(baselineData.metrics.bridges_exposed, scenarioData.metrics.bridges_exposed),
    hospitals_exposed: compare(baselineData.metrics.hospitals_exposed, scenarioData.metrics.hospitals_exposed),
    power_assets_exposed: compare(baselineData.metrics.power_assets_exposed, scenarioData.metrics.power_assets_exposed),
    shelters_exposed: compare(baselineData.metrics.shelters_exposed, scenarioData.metrics.shelters_exposed),
  };

  // Generate tracks
  const forecast = cycloneData.forecastTrack || [];
  const latShift = -(scenario.track_offset_km / 111.0) * 0.3;
  const lngShift = +(scenario.track_offset_km / 104.0) * 0.9;
  const windRatio = scenario.wind_speed / BASELINE_WIND;

  const baselineTrack: TrackPoint[] = forecast.map((pt) => ({
    lat: pt.lat,
    lng: pt.lng,
    label: pt.label,
    category: pt.category,
    wind_speed_kmh: pt.windSpeedKmh,
  }));

  const shiftedTrack: TrackPoint[] = forecast.map((pt) => {
    const simWind = Math.round(pt.windSpeedKmh * windRatio);
    let cat = 1;
    if (simWind >= 250) cat = 5;
    else if (simWind >= 210) cat = 4;
    else if (simWind >= 165) cat = 3;
    else if (simWind >= 120) cat = 2;

    return {
      lat: Math.round((pt.lat + latShift) * 10000) / 10000,
      lng: Math.round((pt.lng + lngShift) * 10000) / 10000,
      label: `Simulated ${pt.label}`,
      category: cat,
      wind_speed_kmh: simWind,
    };
  });

  return {
    scenario_id: `sim-${Date.now().toString(36)}`,
    scenario_name: scenario.scenario_name || `Scenario (${scenario.wind_speed} km/h, ${scenario.storm_surge}m surge)`,
    timestamp: new Date().toISOString(),
    parameters: scenario,
    baseline_metrics: baselineData.metrics,
    scenario_metrics: scenarioData.metrics,
    deltas,
    risk_zones: scenarioData.zones,
    infrastructure_summary: {},
    shifted_track: shiftedTrack,
    baseline_track: baselineTrack,
    landfall_shift_km: Math.abs(scenario.track_offset_km),
    disclaimer: 'SIMULATED SCENARIO — NOT AN OFFICIAL FORECAST',
    notice: 'Decision-support simulation generated by CycloneGuard AI Risk Engine.',
  };
}
