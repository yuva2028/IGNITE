/**
 * CycloneGuard AI - Risk Engine Frontend API Client (Phase 3)
 *
 * Communicates with the FastAPI backend (/api/risk/...)
 * Provides automatic graceful fallback to client-side baseline calculation
 * if the Python ML service is offline or unreachable.
 */

import type {
  RiskInputFeatures,
  RiskPredictionResult,
  RiskZoneFeature,
  SpatialGridCellFeature,
} from '../types';
import riskZonesStatic from '../data/risk-zones.json';

const API_BASE = 'http://127.0.0.1:8000/api/risk';
const TIMEOUT_MS = 3500;

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
 * Predict risk score, category, and factors for a set of input features.
 */
export async function predictRisk(features: RiskInputFeatures): Promise<RiskPredictionResult> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(features),
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.warn('[RiskAPI] Backend unavailable, using client demo baseline fallback:', err);
    return fallbackCalculateRisk(features);
  }
}

/**
 * Fetch enriched risk zones with live ML predictions from backend.
 */
export async function fetchPredictedZones(): Promise<{
  zones: RiskZoneFeature[];
  isMLPredicted: boolean;
  modelType: string;
}> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/zones-predicted`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      zones: data.zones,
      isMLPredicted: true,
      modelType: data.model_type || 'Random Forest (Baseline)',
    };
  } catch (err) {
    console.warn('[RiskAPI] Could not fetch predicted zones from backend, using local fallback:', err);
    // Enrich local static zones with fallback risk calculations
    const fallbackZones: RiskZoneFeature[] = riskZonesStatic.zones.map((z) => {
      const elev = z.elevation_m || 5;
      const distTrack = z.severity === 'critical' ? 12 : z.severity === 'high' ? 35 : 80;
      const distCoast = z.severity === 'critical' ? 2 : z.severity === 'high' ? 10 : 35;
      const surge = z.severity === 'critical' ? 4.1 : z.severity === 'high' ? 2.4 : 0.5;
      const wind = 220 * Math.exp(-distTrack / 90);
      const rain = 100 + 150 * Math.exp(-distTrack / 110);
      const flood = Math.min(1.0, Math.max(0.1, 0.9 * Math.exp(-elev / 20)));

      const feat: RiskInputFeatures = {
        wind_speed: Math.round(wind),
        rainfall: Math.round(rain),
        storm_surge: surge,
        elevation: elev,
        distance_from_coast: distCoast,
        distance_from_cyclone_track: distTrack,
        historical_flood_exposure: flood,
        entity_name: z.name,
      };

      const pred = fallbackCalculateRisk(feat);

      return {
        id: z.id,
        name: z.name,
        severity: pred.risk_category.toLowerCase() as 'low' | 'medium' | 'high' | 'critical',
        population: z.population,
        area_km2: z.area_km2,
        elevation_m: z.elevation_m,
        districtHq: z.districtHq,
        riskFactors: pred.risk_factors,
        riskScore: pred.risk_score,
        predictedCategory: pred.risk_category,
        isMLPredicted: false,
        modelType: 'Demo Baseline (Client Fallback)',
        mlFeatures: feat as unknown as Record<string, number>,
      };
    });

    return {
      zones: fallbackZones,
      isMLPredicted: false,
      modelType: 'Demo Baseline (Offline Fallback)',
    };
  }
}

/**
 * Fetch spatial grid GeoJSON for Leaflet overlay layer.
 */
export async function fetchSpatialGridGeoJSON(): Promise<{
  features: Array<{
    id: string;
    geometry: { type: string; coordinates: number[][][] };
    properties: SpatialGridCellFeature;
  }>;
  metadata: Record<string, unknown>;
} | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/grid-geojson?step_deg=0.25`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[RiskAPI] Could not fetch spatial grid GeoJSON:', err);
    return null;
  }
}

/**
 * Fetch model metadata and real evaluation metrics.
 */
export async function fetchModelInfo() {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/model-info`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[RiskAPI] Could not fetch model info:', err);
    return null;
  }
}

/**
 * Transparent client-side fallback baseline model when backend is unreachable.
 */
function fallbackCalculateRisk(f: RiskInputFeatures): RiskPredictionResult {
  const wScore = 35 * Math.min(Math.max((f.wind_speed - 40) / 180, 0), 1) * Math.exp(-f.distance_from_cyclone_track / 120);
  const sVuln = Math.max(0, f.storm_surge - (f.elevation * 0.4));
  const sScore = 35 * Math.min(sVuln / 3.0, 1) * Math.exp(-f.distance_from_coast / 25);
  const rScore = 30 * (0.6 * Math.min(f.rainfall / 300, 1) + 0.4 * f.historical_flood_exposure) * Math.max(0.1, 1 - f.elevation / 100);

  const rawScore = Math.min(Math.max(wScore + sScore + rScore, 0), 100);
  const score = Math.round(rawScore * 10) / 10;

  let cat = 'LOW';
  if (score >= 80) cat = 'CRITICAL';
  else if (score >= 55) cat = 'HIGH';
  else if (score >= 30) cat = 'MEDIUM';

  const factors: string[] = [];
  if (f.storm_surge >= 2.5 && f.elevation <= 5) {
    factors.push(`Severe storm surge threat (${f.storm_surge.toFixed(1)}m surge vs ${f.elevation.toFixed(1)}m elevation)`);
  } else if (f.storm_surge >= 1.5) {
    factors.push(`Elevated storm surge (${f.storm_surge.toFixed(1)}m)`);
  }

  if (f.elevation <= 4) {
    factors.push(`Low coastal elevation (${f.elevation.toFixed(1)}m ASL)`);
  }

  if (f.distance_from_cyclone_track <= 25) {
    factors.push(`Direct cyclone track path (${f.distance_from_cyclone_track.toFixed(0)}km from eye)`);
  } else if (f.distance_from_cyclone_track <= 60) {
    factors.push(`Close to cyclone path (${f.distance_from_cyclone_track.toFixed(0)}km)`);
  }

  if (f.wind_speed >= 180) {
    factors.push(`Catastrophic cyclonic wind (${f.wind_speed.toFixed(0)} km/h)`);
  } else if (f.wind_speed >= 120) {
    factors.push(`High wind speed (${f.wind_speed.toFixed(0)} km/h)`);
  }

  if (f.rainfall >= 200) {
    factors.push(`High rainfall (${f.rainfall.toFixed(0)} mm)`);
  }

  if (factors.length === 0) {
    factors.push('Low elevation', 'Moderate rainfall', 'Peripheral wind exposure');
  }

  return {
    risk_score: score,
    risk_category: cat,
    risk_factors: factors.slice(0, 4),
    category_probabilities: { [cat]: 1.0 },
    model_type: 'Demo Baseline (Client Fallback)',
    is_demo_baseline: true,
    entity_id: f.entity_id,
    entity_name: f.entity_name,
  };
}
