/**
 * CycloneGuard AI - Critical Infrastructure Multi-Hazard Risk Client (Phase 4)
 *
 * Connects to the FastAPI Infrastructure Risk Service (/api/infrastructure/...)
 * Provides comprehensive fallback to client-side multi-hazard calculations.
 *
 * Supported asset types:
 * - Power substations
 * - Bridges
 * - Roads
 * - Hospitals
 * - Schools
 * - Shelters
 * - Communication towers
 */

import type {
  InfrastructureVulnerability,
  Severity,
} from '../types';

import rawInfraData from '../data/infrastructure.json';

const API_BASE = 'http://127.0.0.1:8000/api/infrastructure';
const TIMEOUT_MS = 4000;

export interface InfrastructureSummary {
  power_assets_at_risk: number;
  roads_at_risk: number;
  bridges_at_risk: number;
  hospitals_at_risk: number;
  shelters_exposed: number;
  schools_at_risk: number;
  telecom_at_risk: number;
  total_at_risk: number;
  total_assets: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  total_population_affected: number;
}

export interface InfrastructureAssessmentData {
  assetsByType: Record<string, InfrastructureVulnerability[]>;
  allAssets: InfrastructureVulnerability[];
  summary: InfrastructureSummary;
  isSimulatedDemo: boolean;
  notice: string;
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
 * Normalizes a single asset from backend snake_case Pydantic response
 * to camelCase TypeScript InfrastructureVulnerability shape.
 */
function normalizeAsset(a: Record<string, unknown>): InfrastructureVulnerability {
  return {
    id:                   String(a.id ?? ''),
    name:                 String(a.name ?? ''),
    type:                 (a.type as InfrastructureVulnerability['type']) ?? 'power',
    lat:                  (a.lat as number | undefined),
    lng:                  (a.lng as number | undefined),
    riskLevel:            (a.risk_level as InfrastructureVulnerability['riskLevel']) ?? 'medium',
    riskScore:            Number(a.risk_score ?? 0),
    floodExposure:        Number(a.flood_exposure ?? 0),
    windExposure:         Number(a.wind_exposure ?? 0),
    stormSurgeExposure:   Number(a.storm_surge_exposure ?? 0),
    locationVulnerability:Number(a.location_vulnerability ?? 0),
    overallVulnerability: Number(a.overall_vulnerability ?? 0),
    riskFactors:          (a.risk_factors as string[]) ?? [],
    preparednessNote:     String(a.preparedness_note ?? ''),
    populationDependent:  (a.population_dependent as number | undefined),
    status:               (a.status as InfrastructureVulnerability['status']) ?? 'operational',
    notes:                (a.notes as string | undefined),
    elevation_m:          (a.elevation_m as number | undefined),
    capacity:             (a.capacity as number | undefined),
    details:              (a.details as Record<string, unknown> | undefined),
  };
}

export async function fetchInfrastructureAssessment(): Promise<InfrastructureAssessmentData> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/assess`);
    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();

    // Normalize all assets from backend snake_case → frontend camelCase
    const assetsByType: Record<string, InfrastructureVulnerability[]> = {};
    const rawByType = data.assets_by_type as Record<string, Record<string, unknown>[]>;
    for (const [type, assets] of Object.entries(rawByType)) {
      assetsByType[type] = (assets || []).map(normalizeAsset);
    }
    const allAssets: InfrastructureVulnerability[] = ((data.all_assets as Record<string, unknown>[]) || []).map(normalizeAsset);

    return {
      assetsByType,
      allAssets,
      summary: data.summary,
      isSimulatedDemo: true,
      notice: data.notice,
    };
  } catch (err) {
    console.warn('[InfrastructureApi] Backend unavailable, using local calculation fallback:', err);
    return calculateLocalInfrastructureAssessment();
  }
}

/**
 * Fetch summary statistics for dashboard display.
 */
export async function fetchInfrastructureSummary(): Promise<InfrastructureSummary> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/summary`);
    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('[InfrastructureApi] Backend unavailable, computing local summary fallback:', err);
    const assessment = calculateLocalInfrastructureAssessment();
    return assessment.summary;
  }
}

// ─── Local Multi-Hazard Risk Computation Fallback ─────────────────────────────

const EYE_LAT = 19.8;
const EYE_LNG = 85.8;
const CORE_WIND = 220.0;
const PEAK_SURGE = 4.2;

function calculateEnvironmentalFeatures(lat: number, lng: number, elevation: number = 5.0) {
  const coastLng = 86.0 + (lat - 19.0) * 0.4;
  const distCoast = Math.max(0.4, Math.abs(lng - coastLng) * 98.0);
  const distTrack = Math.max(1.5, Math.sqrt((lat - EYE_LAT) ** 2 + (lng - EYE_LNG) ** 2) * 111.0);

  const wind = CORE_WIND * (0.35 + 0.65 * Math.exp(-distTrack / 90.0));
  const surge = Math.max(0.0, PEAK_SURGE * Math.exp(-distCoast / 14.0) * Math.exp(-distTrack / 70.0));
  const rainfall = 75.0 + 190.0 * Math.exp(-distTrack / 110.0) + (1.0 / (elevation + 1.0)) * 20.0;
  const floodExp = Math.min(1.0, Math.max(0.1, 0.9 * Math.exp(-elevation / 20.0)));

  return {
    windSpeed: wind,
    surgeHeight: surge,
    rainfallMm: rainfall,
    elevationM: elevation,
    distCoastKm: distCoast,
    distTrackKm: distTrack,
    floodExp,
  };
}

function computeAssetVulnerability(
  id: string,
  name: string,
  type: string,
  lat: number,
  lng: number,
  elevation: number,
  popDependent: number | undefined,
  status: 'operational' | 'at-risk' | 'damaged' | 'offline',
  notes: string,
  details: Record<string, unknown> = {}
): InfrastructureVulnerability {
  const env = calculateEnvironmentalFeatures(lat, lng, elevation);

  // Normalizations (0–100)
  const floodExposure = Math.min(100, Math.max(0, env.floodExp * 60.0 + (env.rainfallMm / 300.0) * 40.0));
  const windExposure = Math.min(100, Math.max(0, (env.windSpeed / 220.0) * 100.0));
  const stormSurgeExposure = Math.min(100, Math.max(0, (env.surgeHeight / 4.5) * 100.0));
  const locationVulnerability = Math.min(
    100,
    Math.max(0, Math.max(0, 100 - env.distCoastKm * 2.5) * 0.5 + Math.max(0, 40 - env.elevationM) * 1.25)
  );

  // Asset type specific vulnerability weighting
  let wFlood = 0.35, wWind = 0.35, wSurge = 0.30;
  if (type === 'telecommunications') {
    wFlood = 0.15; wWind = 0.55; wSurge = 0.10;
  } else if (type === 'power') {
    wFlood = 0.35; wWind = 0.40; wSurge = 0.15;
  } else if (type === 'roads' || type === 'bridges') {
    wFlood = 0.45; wWind = 0.15; wSurge = 0.30;
  } else if (type === 'hospitals') {
    wFlood = 0.35; wWind = 0.30; wSurge = 0.20;
  } else if (type === 'shelters' || type === 'schools') {
    wFlood = 0.35; wWind = 0.35; wSurge = 0.20;
  }

  const multiHazardScore = floodExposure * wFlood + windExposure * wWind + stormSurgeExposure * wSurge;
  const overallVulnerability = Math.min(100, Math.max(0, multiHazardScore * 0.75 + locationVulnerability * 0.25));

  // Determine risk category
  let riskLevel: Severity = 'low';
  if (overallVulnerability >= 75) riskLevel = 'critical';
  else if (overallVulnerability >= 55) riskLevel = 'high';
  else if (overallVulnerability >= 35) riskLevel = 'medium';

  // Dynamic risk factors
  const riskFactors: string[] = [];
  if (env.elevationM <= 6.0) riskFactors.push(`low elevation (${env.elevationM.toFixed(1)}m ASL)`);
  if (env.distCoastKm <= 12.0) riskFactors.push(`close to coastline (${env.distCoastKm.toFixed(1)}km)`);
  if (env.windSpeed >= 160) riskFactors.push(`extreme cyclonic wind field (${Math.round(env.windSpeed)} km/h)`);
  else if (env.windSpeed >= 120) riskFactors.push(`severe gale-force wind gusts (${Math.round(env.windSpeed)} km/h)`);
  if (env.rainfallMm >= 180) riskFactors.push(`heavy precipitation forecast (${Math.round(env.rainfallMm)}mm)`);
  if (env.surgeHeight >= 1.5) riskFactors.push(`storm surge inundation hazard (${env.surgeHeight.toFixed(1)}m)`);
  if (riskFactors.length === 0) riskFactors.push('moderate regional ambient weather exposure');

  // Preparedness note
  let prepNote = 'Standard operational monitoring and readiness active.';
  if (type === 'power') {
    prepNote = riskLevel === 'critical' || riskLevel === 'high'
      ? 'De-energize flood-prone busbars prior to peak surge; deploy standby mobile generators to critical circuits.'
      : 'Verify emergency battery banks and inspect auxiliary feeder tie-lines.';
  } else if (type === 'hospitals') {
    prepNote = riskLevel === 'critical' || riskLevel === 'high'
      ? 'Verify 72-hour fuel reserves for backup generators, test oxygen manifold systems, and relocate ICU patients above ground floor.'
      : 'Maintain emergency triage readiness and stock flood mitigation sandbags at ground entry portals.';
  } else if (type === 'shelters' || type === 'schools') {
    prepNote = riskLevel === 'critical' || riskLevel === 'high'
      ? 'Ensure potable drinking water bladders, seal low elevation doorways, and verify satellite radio connectivity.'
      : 'Stock emergency dry rations, sanitation supplies, and reserve first-aid kits.';
  } else if (type === 'bridges' || type === 'roads') {
    prepNote = riskLevel === 'critical' || riskLevel === 'high'
      ? 'Pre-position emergency debris removal cranes, prepare flood barrier barricades, and ready detour rerouting signage.'
      : 'Perform pre-landfall scour check on piers and clean drainage culverts.';
  } else if (type === 'telecommunications') {
    prepNote = riskLevel === 'critical' || riskLevel === 'high'
      ? 'Secure guy-wire tension, lock antenna azimuth positioning, and fuel mast backup generators for 48h autonomy.'
      : 'Verify tower structural anchor bolts and configure emergency cellular broadcast repeaters.';
  }

  return {
    id,
    name,
    type: type as any,
    lat,
    lng,
    riskLevel,
    riskScore: Math.round(overallVulnerability * 10) / 10,
    floodExposure: Math.round(floodExposure * 10) / 10,
    windExposure: Math.round(windExposure * 10) / 10,
    stormSurgeExposure: Math.round(stormSurgeExposure * 10) / 10,
    locationVulnerability: Math.round(locationVulnerability * 10) / 10,
    overallVulnerability: Math.round(overallVulnerability * 10) / 10,
    riskFactors,
    preparednessNote: prepNote,
    populationDependent: popDependent,
    status,
    notes,
    elevation_m: elevation,
    details: {
      ...details,
      wind_speed: Math.round(env.windSpeed * 10) / 10,
      rainfall: Math.round(env.rainfallMm * 10) / 10,
      storm_surge: Math.round(env.surgeHeight * 10) / 10,
      elevation: elevation,
      distance_from_coast: Math.round(env.distCoastKm * 10) / 10,
      distance_from_cyclone_track: Math.round(env.distTrackKm * 10) / 10,
    },
  };
}

export function calculateLocalInfrastructureAssessment(): InfrastructureAssessmentData {
  const assetsByType: Record<string, InfrastructureVulnerability[]> = {
    power: [],
    bridges: [],
    roads: [],
    hospitals: [],
    schools: [],
    shelters: [],
    telecommunications: [],
  };

  const allAssets: InfrastructureVulnerability[] = [];

  // 1. Power
  (rawInfraData.powerSubstations || []).forEach((p: any) => {
    const v = computeAssetVulnerability(
      p.id,
      p.name,
      'power',
      p.lat,
      p.lng,
      p.elevation || 4.0,
      p.affectedPopulation,
      p.status,
      p.notes || '',
      { voltageKv: p.voltageKv, backupLine: p.backupLine }
    );
    assetsByType.power.push(v);
    allAssets.push(v);
  });

  // 2. Bridges
  (rawInfraData.bridges || []).forEach((b: any) => {
    const v = computeAssetVulnerability(
      b.id,
      b.name,
      'bridges',
      b.lat,
      b.lng,
      b.elevation || 6.0,
      b.trafficVolume || 28000,
      b.status,
      b.notes || '',
      { spanM: b.spanM, yearBuilt: b.yearBuilt, condition: b.condition }
    );
    assetsByType.bridges.push(v);
    allAssets.push(v);
  });

  // 3. Roads
  (rawInfraData.roads || []).forEach((r: any) => {
    const midIdx = Math.floor(r.coordinates.length / 2);
    // infrastructure.json roads store coordinates as [lng, lat] GeoJSON order
    const [lng, lat] = r.coordinates[midIdx] || [85.8, 19.8];
    const v = computeAssetVulnerability(
      r.id,
      r.name,
      'roads',
      lat,
      lng,
      r.elevation || 4.5,
      r.trafficVolume || 45000,
      r.status,
      r.notes || '',
      { lengthKm: r.lengthKm, coordinatesCount: r.coordinates.length }
    );
    assetsByType.roads.push(v);
    allAssets.push(v);
  });

  // 4. Hospitals
  (rawInfraData.hospitals || []).forEach((h: any) => {
    const v = computeAssetVulnerability(
      h.id,
      h.name,
      'hospitals',
      h.lat,
      h.lng,
      h.elevation || 7.0,
      (h.capacity || 200) * 12,
      h.status,
      h.notes || '',
      { capacity: h.capacity, icu_beds: h.icu_beds, backupPower: h.backupPower }
    );
    assetsByType.hospitals.push(v);
    allAssets.push(v);
  });

  // 5. Schools
  ((rawInfraData as any).schools || []).forEach((s: any) => {
    const v = computeAssetVulnerability(
      s.id,
      s.name,
      'schools',
      s.lat,
      s.lng,
      s.elevation || 8.0,
      (s.capacity || 500) * 3,
      s.status,
      s.notes || '',
      { capacity: s.capacity, backupPower: s.backupPower, address: s.address }
    );
    assetsByType.schools.push(v);
    allAssets.push(v);
  });

  // 6. Shelters
  (rawInfraData.shelters || []).forEach((sh: any) => {
    const v = computeAssetVulnerability(
      sh.id,
      sh.name,
      'shelters',
      sh.lat,
      sh.lng,
      sh.elevation || 9.0,
      sh.capacity,
      sh.status,
      sh.notes || '',
      {
        capacity: sh.capacity,
        currentOccupancy: sh.currentOccupancy,
        hasWater: sh.hasWater,
        hasMedical: sh.hasMedical,
      }
    );
    assetsByType.shelters.push(v);
    allAssets.push(v);
  });

  // 7. Communication Towers
  ((rawInfraData as any).communicationTowers || []).forEach((t: any) => {
    const v = computeAssetVulnerability(
      t.id,
      t.name,
      'telecommunications',
      t.lat,
      t.lng,
      t.elevation || 10.0,
      t.affectedPopulation,
      t.status,
      t.notes || '',
      { heightM: t.heightM, backupBatteryHours: t.backupBatteryHours }
    );
    assetsByType.telecommunications.push(v);
    allAssets.push(v);
  });

  // Compute summary stats
  const isAtRisk = (a: InfrastructureVulnerability) =>
    a.riskLevel === 'critical' || a.riskLevel === 'high' || a.riskScore >= 50;

  const powerAtRisk = assetsByType.power.filter(isAtRisk).length;
  const roadsAtRisk = assetsByType.roads.filter(isAtRisk).length;
  const bridgesAtRisk = assetsByType.bridges.filter(isAtRisk).length;
  const hospitalsAtRisk = assetsByType.hospitals.filter(isAtRisk).length;
  const sheltersExposed = assetsByType.shelters.filter(
    (s) => s.riskLevel === 'critical' || s.riskLevel === 'high' || s.floodExposure >= 60
  ).length;
  const schoolsAtRisk = assetsByType.schools.filter(isAtRisk).length;
  const telecomAtRisk = assetsByType.telecommunications.filter(isAtRisk).length;

  const criticalCount = allAssets.filter((a) => a.riskLevel === 'critical').length;
  const highCount = allAssets.filter((a) => a.riskLevel === 'high').length;
  const mediumCount = allAssets.filter((a) => a.riskLevel === 'medium').length;
  const lowCount = allAssets.filter((a) => a.riskLevel === 'low').length;

  const totalPop = allAssets.reduce((sum, a) => sum + (a.populationDependent || 0), 0);

  const summary: InfrastructureSummary = {
    power_assets_at_risk: powerAtRisk,
    roads_at_risk: roadsAtRisk,
    bridges_at_risk: bridgesAtRisk,
    hospitals_at_risk: hospitalsAtRisk,
    shelters_exposed: sheltersExposed,
    schools_at_risk: schoolsAtRisk,
    telecom_at_risk: telecomAtRisk,
    total_at_risk: criticalCount + highCount,
    total_assets: allAssets.length,
    critical_count: criticalCount,
    high_count: highCount,
    medium_count: mediumCount,
    low_count: lowCount,
    total_population_affected: totalPop,
  };

  return {
    assetsByType,
    allAssets,
    summary,
    isSimulatedDemo: true,
    notice: 'SIMULATED DEMO DATA: Physical vulnerability modeled using hydrodynamic and meteorological spatial risk inputs.',
  };
}
