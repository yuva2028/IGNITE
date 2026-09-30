/**
 * CycloneGuard AI — Population Exposure Service (Phase 6)
 *
 * Computes population exposure aggregates from the simulated population grid.
 * Supports dynamic re-scoring when a What-If scenario changes risk parameters.
 *
 * DATA NOTICE: All population figures are SIMULATED DEMO DATA calibrated to
 * approximate Odisha coastal district profiles. Not based on real census data.
 */

import type {
  PopulationGridCell,
  PopulationGridSummary,
  PopulationZoneBreakdown,
  Severity,
} from '../types';
import rawGrid from '../data/population-grid.json';
import riskZonesData from '../data/risk-zones.json';

// ─── Raw Data Cast ─────────────────────────────────────────────────────────────
const BASE_CELLS = rawGrid.cells as PopulationGridCell[];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreToCategory(score: number): PopulationGridCell['risk_category'] {
  if (score >= 75) return 'critical';
  if (score >= 58) return 'high';
  if (score >= 38) return 'medium';
  return 'low';
}

/** Compute aggregate summary from a cell array. */
export function computeSummary(cells: PopulationGridCell[]): PopulationGridSummary {
  const total = cells.reduce((s, c) => s + c.population, 0) || 1;

  const critical    = cells.filter(c => c.risk_category === 'critical').reduce((s, c) => s + c.population, 0);
  const high        = cells.filter(c => c.risk_category === 'high').reduce((s, c) => s + c.population, 0);
  const medium      = cells.filter(c => c.risk_category === 'medium').reduce((s, c) => s + c.population, 0);
  const low         = cells.filter(c => c.risk_category === 'low').reduce((s, c) => s + c.population, 0);

  const criticalCells = cells.filter(c => c.risk_category === 'critical').length;
  const highCells     = cells.filter(c => c.risk_category === 'high').length;
  const mediumCells   = cells.filter(c => c.risk_category === 'medium').length;
  const lowCells      = cells.filter(c => c.risk_category === 'low').length;

  const round1 = (n: number) => Math.round(n * 10) / 10;

  return {
    total,
    critical,
    high,
    medium,
    low,
    criticalPct: round1((critical / total) * 100),
    highPct:     round1((high     / total) * 100),
    mediumPct:   round1((medium   / total) * 100),
    lowPct:      round1((low      / total) * 100),
    cellCount:      cells.length,
    criticalCells,
    highCells,
    mediumCells,
    lowCells,
  };
}

/** Compute per-zone breakdowns for the zone detail table. */
export function computeZoneBreakdowns(cells: PopulationGridCell[], totalPop: number): PopulationZoneBreakdown[] {
  const zoneMap = new Map<string, { name: string; severity: Severity; cells: PopulationGridCell[] }>();

  // Seed from risk-zones metadata
  for (const z of riskZonesData.zones) {
    zoneMap.set(z.id, { name: z.name, severity: z.severity as Severity, cells: [] });
  }

  for (const cell of cells) {
    const entry = zoneMap.get(cell.zone_id);
    if (entry) entry.cells.push(cell);
  }

  return Array.from(zoneMap.entries())
    .filter(([, v]) => v.cells.length > 0)
    .map(([zone_id, v]) => {
      const pop     = v.cells.reduce((s, c) => s + c.population, 0);
      const scores  = v.cells.map(c => c.risk_score);
      const avgScore = Math.round(scores.reduce((s, n) => s + n, 0) / scores.length);
      const maxScore = Math.max(...scores);

      // Re-derive severity from scenario-adjusted scores if available
      const categoryCounts: Record<string, number> = {};
      v.cells.forEach(c => { categoryCounts[c.risk_category] = (categoryCounts[c.risk_category] || 0) + c.population; });
      const dominantCat = (Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || v.severity) as Severity;

      return {
        zone_id,
        zone_name:     v.name,
        severity:      dominantCat,
        population:    pop,
        pct_of_total:  Math.round((pop / totalPop) * 1000) / 10,
        cell_count:    v.cells.length,
        avg_risk_score: avgScore,
        max_risk_score: maxScore,
      };
    })
    .sort((a, b) => b.population - a.population);
}

// ─── Baseline (static) ────────────────────────────────────────────────────────

/** Returns the static baseline population grid (no scenario adjustment). */
export function getBaselineGrid(): PopulationGridCell[] {
  return BASE_CELLS;
}

/** Returns the pre-computed baseline summary. */
export function getBaselineSummary(): PopulationGridSummary {
  return computeSummary(BASE_CELLS);
}

// ─── Scenario Adjustment ──────────────────────────────────────────────────────

/**
 * Re-scores each population grid cell under a What-If scenario.
 *
 * Uses the same physics-based decay model as the Phase 3/5 local risk engine:
 * risk = f(wind, rainfall, surge, elevation, distance from cyclone track)
 *
 * @param windSpeed   km/h (90–260)
 * @param rainfall    mm  (100–500)
 * @param stormSurge  m   (0–5)
 * @param trackOffsetKm km (-50 to +50, positive = east/offshore)
 */
export function applyScenario(
  windSpeed: number,
  rainfall: number,
  stormSurge: number,
  trackOffsetKm: number
): PopulationGridCell[] {
  const BASELINE_WIND  = 220;
  const BASELINE_RAIN  = 284;
  const BASELINE_SURGE = 4.2;

  // Baseline cyclone eye position
  const baseEyeLat = 19.8;
  const baseEyeLng = 85.8;

  // Shifted eye position from track offset
  const eyeLat = baseEyeLat - (trackOffsetKm / 111.0) * 0.3;
  const eyeLng = baseEyeLng + (trackOffsetKm / 104.0) * 0.9;

  return BASE_CELLS.map(cell => {
    // Distance from cyclone track (km)
    const dLat = cell.lat - eyeLat;
    const dLng = cell.lng - eyeLng;
    const distKm = Math.max(3, Math.sqrt(dLat * dLat + dLng * dLng) * 111);

    // Coastal distance proxy (coast sits near lng ~85.0–86.0 depending on lat)
    const coastLng = 85.0 + (cell.lat - 19.0) * 0.95;
    const distCoast = Math.max(0.5, Math.abs(cell.lng - coastLng) * 95);

    // Local intensity at cell position (decay from cyclone eye)
    const localWind   = windSpeed  * (0.35 + 0.65 * Math.exp(-distKm / 90));
    const localRain   = (rainfall * 0.35) + (rainfall * 0.65) * Math.exp(-distKm / 110) + (1 / (cell.elevation_m + 1)) * 25;
    const localSurge  = Math.max(0, stormSurge * Math.exp(-distCoast / 14) * Math.exp(-distKm / 70));
    const floodExp    = Math.min(1, Math.max(0.1, 0.9 * Math.exp(-cell.elevation_m / 18)));

    // Composite risk score (matches Phase 3 Random Forest feature weighting)
    const score = Math.min(100, Math.max(10,
      (localWind  / 240)   * 35 +
      (localRain  / 400)   * 20 +
      (localSurge / 4.5)   * 25 +
      (1.0 - Math.min(1, cell.elevation_m / 25)) * 10 +
      floodExp * 10
    ));

    // Wind/rain/surge ratio factors from baseline
    const scaleFactor = (windSpeed / BASELINE_WIND) * 0.5
                      + (rainfall  / BASELINE_RAIN)  * 0.2
                      + (stormSurge/ BASELINE_SURGE)  * 0.3;

    // Blend intrinsic score with scenario scaling
    const blendedScore = Math.min(100, Math.max(10, score * 0.7 + cell.risk_score * scaleFactor * 0.3));

    return {
      ...cell,
      risk_score:    Math.round(blendedScore),
      risk_category: scoreToCategory(blendedScore),
    };
  });
}

// ─── Chart Data Helpers ───────────────────────────────────────────────────────

export interface PopBarDatum {
  zone: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

/** Returns per-zone stacked bar chart data for Recharts. */
export function buildBarChartData(cells: PopulationGridCell[]): PopBarDatum[] {
  const zoneMap = new Map<string, PopBarDatum>();

  for (const z of riskZonesData.zones) {
    // Shorten long zone names for axis display
    const shortName = z.name.length > 20 ? z.name.substring(0, 18) + '…' : z.name;
    zoneMap.set(z.id, { zone: shortName, critical: 0, high: 0, medium: 0, low: 0, total: 0 });
  }

  for (const cell of cells) {
    const entry = zoneMap.get(cell.zone_id);
    if (!entry) continue;
    entry[cell.risk_category] += cell.population;
    entry.total += cell.population;
  }

  return Array.from(zoneMap.values())
    .filter(d => d.total > 0)
    .sort((a, b) => b.total - a.total);
}
