/**
 * CycloneGuard AI — Evacuation Planning Service (Phase 7)
 *
 * Implements a Dijkstra-based graph routing engine on the simulated
 * road network. All routes, times, and distances are SIMULATED DEMO DATA.
 *
 * DATA NOTICE: Not for operational use. Route safety cannot be guaranteed.
 */

import type {
  EvacNode,
  EvacEdge,
  EvacRoute,
  ShelterAllocation,
  EvacuationPlan,
} from '../types';
import graphData from '../data/evacuation-graph.json';
import infraData from '../data/infrastructure.json';
import riskZonesData from '../data/risk-zones.json';

// ── Raw data ──────────────────────────────────────────────────────────────────
const NODES: EvacNode[] = graphData.nodes as EvacNode[];
const BASE_EDGES: EvacEdge[] = graphData.edges as EvacEdge[];

// ── Risk cost multipliers for Dijkstra edge weights ──────────────────────────
const RISK_COST: Record<string, number> = {
  safe:     1.0,
  medium:   1.8,
  high:     3.5,
  critical: 8.0,
};

// ── Shelter data from infrastructure ─────────────────────────────────────────
export interface ShelterInfo {
  id: string;
  name: string;
  lat: number;
  lng: number;
  capacity: number;
  currentOccupancy: number;
  available: number;
  hasWater: boolean;
  hasMedical: boolean;
  hasPower: boolean;
  riskLevel: string;
  status: string;
  address: string;
  notes: string;
}

export function getAllShelters(): ShelterInfo[] {
  return infraData.shelters.map((s: any) => ({
    id:               s.id,
    name:             s.name,
    lat:              s.lat,
    lng:              s.lng,
    capacity:         s.capacity,
    currentOccupancy: s.currentOccupancy,
    available:        s.capacity - s.currentOccupancy,
    hasWater:         s.hasWater,
    hasMedical:       s.hasMedical,
    hasPower:         s.hasPower,
    riskLevel:        s.riskLevel,
    status:           s.status,
    address:          s.address,
    notes:            s.notes,
  }));
}

// ── Zone data ─────────────────────────────────────────────────────────────────
export interface ZoneInfo {
  id: string;
  name: string;
  severity: string;
  population: number;
  area_km2: number;
  elevation_m: number;
  districtHq: string;
  riskFactors: string[];
  centroid: [number, number];  // [lat, lng]
}

export function getAllZones(): ZoneInfo[] {
  return riskZonesData.zones.map((z: any) => {
    const coords: [number, number][] = z.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
    const lat = coords.slice(0, -1).reduce((s: number, c: [number, number]) => s + c[0], 0) / (coords.length - 1);
    const lng = coords.slice(0, -1).reduce((s: number, c: [number, number]) => s + c[1], 0) / (coords.length - 1);
    return {
      id:          z.id,
      name:        z.name,
      severity:    z.severity,
      population:  z.population,
      area_km2:    z.area_km2,
      elevation_m: z.elevation_m,
      districtHq:  z.districtHq,
      riskFactors: z.riskFactors,
      centroid:    [lat, lng],
    };
  });
}

// ── Apply scenario to edges ───────────────────────────────────────────────────
/**
 * Returns a modified edge list where edges are escalated to 'critical' or
 * blocked when storm surge / wind exceed thresholds.
 *
 * @param windSpeed   km/h
 * @param stormSurge  m
 */
export function applyScenarioToGraph(
  baseEdges: EvacEdge[],
  windSpeed: number,
  stormSurge: number
): EvacEdge[] {
  return baseEdges.map(e => {
    let risk_level = e.risk_level;
    let is_blocked = e.is_blocked;
    let speed_kmh  = e.speed_kmh;
    let passable   = e.passable;

    // High surge (>3.5m) blocks coastal/critical roads
    if (stormSurge > 3.5 && e.risk_level === 'critical') {
      is_blocked = true;
      passable   = false;
    }
    // Moderate surge escalates high roads
    if (stormSurge > 2.5 && e.risk_level === 'high') {
      risk_level = 'critical';
      speed_kmh  = Math.max(10, speed_kmh * 0.4);
    }
    // Wind > 180 km/h reduces speed on medium roads
    if (windSpeed > 180 && e.risk_level === 'medium') {
      risk_level = 'high';
      speed_kmh  = Math.max(15, speed_kmh * 0.55);
    }
    // Wind > 200 km/h reduces speed on all roads
    if (windSpeed > 200) {
      speed_kmh = Math.max(10, speed_kmh * 0.7);
    }

    return { ...e, risk_level: risk_level as EvacEdge['risk_level'], is_blocked, speed_kmh, passable };
  });
}

// ── Dijkstra ─────────────────────────────────────────────────────────────────
interface DijkstraResult {
  dist:    Map<string, number>;
  prev:    Map<string, string | null>;
  prevEdge:Map<string, string | null>;
}

function dijkstra(
  sourceId: string,
  nodes: EvacNode[],
  edges: EvacEdge[]
): DijkstraResult {
  const dist     = new Map<string, number>();
  const prev     = new Map<string, string | null>();
  const prevEdge = new Map<string, string | null>();
  const visited  = new Set<string>();
  const pq: Array<[number, string]> = [];   // [cost, nodeId]

  for (const n of nodes) {
    dist.set(n.id, Infinity);
    prev.set(n.id, null);
    prevEdge.set(n.id, null);
  }
  dist.set(sourceId, 0);
  pq.push([0, sourceId]);

  // Build adjacency (both directions since roads are bidirectional)
  const adj = new Map<string, Array<{ to: string; edgeId: string; cost: number }>>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    if (!e.passable) continue;
    const costKm = e.distance_km;
    const riskMul = RISK_COST[e.risk_level] ?? 1.0;
    const cost = costKm * riskMul;
    adj.get(e.from)?.push({ to: e.to,   edgeId: e.id, cost });
    adj.get(e.to)  ?.push({ to: e.from, edgeId: e.id, cost });  // bidirectional
  }

  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0]);
    const [curDist, u] = pq.shift()!;
    if (visited.has(u)) continue;
    visited.add(u);

    for (const { to, edgeId, cost } of (adj.get(u) ?? [])) {
      const newDist = curDist + cost;
      if (newDist < (dist.get(to) ?? Infinity)) {
        dist.set(to, newDist);
        prev.set(to, u);
        prevEdge.set(to, edgeId);
        pq.push([newDist, to]);
      }
    }
  }

  return { dist, prev, prevEdge };
}

function reconstructPath(
  targetId: string,
  result: DijkstraResult,
  _nodes: EvacNode[],
  _edges: EvacEdge[]
): { nodeIds: string[]; edgeIds: string[] } | null {
  const nodeIds: string[] = [];
  const edgeIds: string[] = [];
  let cur: string | null = targetId;

  if ((result.dist.get(targetId) ?? Infinity) === Infinity) return null;

  while (cur !== null) {
    nodeIds.unshift(cur);
    const eId = result.prevEdge.get(cur) ?? null;
    if (eId) edgeIds.unshift(eId);
    cur = result.prev.get(cur) ?? null;
  }

  return { nodeIds, edgeIds };
}

// ── Route calculation ─────────────────────────────────────────────────────────
function routeRiskFromEdges(edgeIds: string[], edges: EvacEdge[]): EvacRoute['route_risk'] {
  const edgeMap = new Map(edges.map(e => [e.id, e]));
  const risks   = edgeIds.map(id => edgeMap.get(id)?.risk_level ?? 'safe');
  if (risks.includes('critical')) return 'critical';
  if (risks.includes('high'))     return 'high';
  if (risks.includes('medium'))   return 'medium';
  return 'safe';
}

function edgesFromIds(edgeIds: string[], edges: EvacEdge[]): EvacEdge[] {
  const m = new Map(edges.map(e => [e.id, e]));
  return edgeIds.map(id => m.get(id)!).filter(Boolean);
}

function computeRoute(
  fromZoneId: string,
  fromZoneName: string,
  sourceNodeId: string,
  targetShelterNodeId: string,
  shelterId: string,
  shelterName: string,
  nodes: EvacNode[],
  edges: EvacEdge[]
): EvacRoute | null {
  const result = dijkstra(sourceNodeId, nodes, edges);
  const path   = reconstructPath(targetShelterNodeId, result, nodes, edges);
  if (!path) return null;

  const usedEdges  = edgesFromIds(path.edgeIds, edges);
  const totalDist  = usedEdges.reduce((s, e) => s + e.distance_km, 0);
  const routeRisk  = routeRiskFromEdges(path.edgeIds, edges);
  const avgSpeed   = usedEdges.length > 0
    ? usedEdges.reduce((s, e) => s + e.speed_kmh, 0) / usedEdges.length
    : 30;
  const estTime    = totalDist > 0 && avgSpeed > 0 ? Math.round((totalDist / avgSpeed) * 60) : 0;

  const nodeMap    = new Map(nodes.map(n => [n.id, n]));
  const pathCoords = path.nodeIds.map(id => {
    const n = nodeMap.get(id);
    return n ? ([n.lat, n.lng] as [number, number]) : ([0, 0] as [number, number]);
  });

  const warnings: string[] = [];
  const hasUnsafe = usedEdges.some(e => e.risk_level === 'high' || e.risk_level === 'critical');
  if (hasUnsafe) warnings.push('Route passes through high or critical risk road segments.');
  if (routeRisk === 'critical') warnings.push('Critical segments may be impassable during surge.');
  if (estTime > 120) warnings.push(`Long route (~${estTime} min). Consider alternative shelters.`);
  const blockedCount = usedEdges.filter(e => e.is_blocked).length;
  if (blockedCount > 0) warnings.push(`${blockedCount} segment(s) currently blocked.`);

  return {
    from_zone_id:       fromZoneId,
    from_zone_name:     fromZoneName,
    to_shelter_id:      shelterId,
    to_shelter_name:    shelterName,
    node_ids:           path.nodeIds,
    edge_ids:           path.edgeIds,
    total_distance_km:  Math.round(totalDist * 10) / 10,
    estimated_time_min: estTime,
    route_risk:         routeRisk,
    has_unsafe_segment: hasUnsafe,
    path_coords:        pathCoords,
    warnings,
  };
}

// ── Shelter allocation (greedy, closest first, capacity-constrained) ──────────
/**
 * Allocates population from a zone to nearby shelters using greedy matching.
 * Never exceeds available shelter capacity (hard constraint).
 *
 * @returns Array of ShelterAllocation sorted by distance / route quality.
 */
function allocateShelters(
  zoneId: string,
  zoneName: string,
  populationToEvacuate: number,
  shelters: ShelterInfo[],
  nodes: EvacNode[],
  edges: EvacEdge[]
): ShelterAllocation[] {
  // Find source node for zone
  const sourceNode = nodes.find(n => n.zone_id === zoneId && !n.isShelter);
  if (!sourceNode) return [];

  // Compute routes to all shelter nodes
  const result = dijkstra(sourceNode.id, nodes, edges);
  const shelterNodes = nodes.filter(n => n.isShelter && n.shelter_id);

  const candidates = shelterNodes
    .map(sn => {
      const shelter = shelters.find(s => s.id === sn.shelter_id);
      if (!shelter || shelter.available <= 0) return null;
      const dist = result.dist.get(sn.id) ?? Infinity;
      if (dist === Infinity) return null;
      return { sn, shelter, dist };
    })
    .filter(Boolean)
    .sort((a, b) => a!.dist - b!.dist) as Array<{ sn: EvacNode; shelter: ShelterInfo; dist: number }>;

  const allocations: ShelterAllocation[] = [];
  let remaining = populationToEvacuate;

  for (const { sn, shelter } of candidates) {
    if (remaining <= 0) break;
    const allocate = Math.min(remaining, shelter.available);
    remaining -= allocate;

    const route = computeRoute(
      zoneId, zoneName,
      sourceNode.id,
      sn.id,
      shelter.id,
      shelter.name,
      nodes, edges
    );

    allocations.push({
      shelter_id:        shelter.id,
      shelter_name:      shelter.name,
      shelter_lat:       shelter.lat,
      shelter_lng:       shelter.lng,
      capacity:          shelter.capacity,
      current_occupancy: shelter.currentOccupancy,
      available_capacity:shelter.available,
      allocated:         allocate,
      remaining_after:   shelter.available - allocate,
      overflow:          allocate > shelter.available,   // always false due to Math.min
      route:             route,
    });

    // Mark shelter capacity as used for subsequent zones (in-memory only)
    shelter.available -= allocate;
  }

  return allocations;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a full evacuation plan for a single zone.
 *
 * @param zoneId          The zone to evacuate
 * @param evacuationRate  Fraction of population to evacuate (0–1, default 0.8)
 * @param windSpeed       Scenario wind speed in km/h (default = baseline 220)
 * @param stormSurge      Scenario storm surge in m (default = baseline 4.2)
 */
export function generateEvacuationPlan(
  zoneId: string,
  evacuationRate = 0.8,
  windSpeed = 220,
  stormSurge = 4.2
): EvacuationPlan | null {
  const zone = getAllZones().find(z => z.id === zoneId);
  if (!zone) return null;

  const shelters = getAllShelters();  // fresh copy
  const edges    = applyScenarioToGraph(BASE_EDGES, windSpeed, stormSurge);
  const nodes    = NODES;

  const toEvacuate = Math.round(zone.population * evacuationRate);
  const allocations = allocateShelters(zoneId, zone.name, toEvacuate, shelters, nodes, edges);

  const totalAllocated   = allocations.reduce((s, a) => s + a.allocated, 0);
  const totalUnallocated = toEvacuate - totalAllocated;
  const routes           = allocations.map(a => a.route).filter(Boolean) as EvacRoute[];

  return {
    zone_id:              zone.id,
    zone_name:            zone.name,
    zone_severity:        zone.severity,
    zone_population:      zone.population,
    zone_area_km2:        zone.area_km2,
    total_to_evacuate:    toEvacuate,
    evacuation_rate:      evacuationRate,
    allocations,
    total_allocated:      totalAllocated,
    total_unallocated:    totalUnallocated,
    capacity_satisfied:   totalUnallocated === 0,
    routes,
    generated_at:         new Date().toISOString(),
    scenario_wind:        windSpeed,
    scenario_surge:       stormSurge,
  };
}

/** Get all current edges (with scenario applied). */
export function getScenarioEdges(windSpeed: number, stormSurge: number): EvacEdge[] {
  return applyScenarioToGraph(BASE_EDGES, windSpeed, stormSurge);
}

/** Get all nodes. */
export function getAllNodes(): EvacNode[] {
  return NODES;
}

/** Get all base edges (no scenario). */
export function getBaseEdges(): EvacEdge[] {
  return BASE_EDGES;
}

export const EVAC_RISK_COLORS: Record<string, string> = {
  safe:     '#22c55e',
  medium:   '#f59e0b',
  high:     '#f97316',
  critical: '#ef4444',
  blocked:  '#6b7280',
};
