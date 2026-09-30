// ─── Severity & Status ───────────────────────────────────────────────────────

export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type DataStatus = 'live' | 'demo' | 'stale' | 'updating';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

// ─── Cyclone / Weather ───────────────────────────────────────────────────────

export interface CycloneMetrics {
  intensityCategory: number;        // 1–5
  intensityLabel: string;           // e.g. "Category 4"
  windSpeedKmh: number;
  windSpeedKnots: number;
  rainfallMm24h: number;
  stormSurgeM: number;
  centralPressureHpa: number;
  eyeDiameterKm: number;
  trackingSpeed: number;            // km/h
  trackingDirection: string;        // e.g. "NNW"
  landfall: string;                 // ISO datetime
  lastUpdated: string;
}

export interface CyclonePosition {
  lat: number;
  lng: number;
  timestamp: string;
  windSpeedKmh: number;
  category: number;
}

export interface CyclonePath {
  id: string;
  name: string;
  currentPosition: CyclonePosition;
  forecastTrack: CyclonePosition[];
  historicTrack: CyclonePosition[];
  affectedRadius: number;           // km
}

// ─── Population & Exposure ───────────────────────────────────────────────────

export interface PopulationExposure {
  totalExposed: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  evacuated: number;
  shelterCapacity: number;
  vulnerableGroups: {
    elderly: number;
    children: number;
    disabled: number;
    medicalDependent: number;
  };
}

// ─── Infrastructure ──────────────────────────────────────────────────────────

export type InfrastructureType =
  | 'power'
  | 'roads'
  | 'bridges'
  | 'hospitals'
  | 'shelters'
  | 'schools'
  | 'telecommunications'
  | 'water';


export interface InfrastructureAsset {
  id: string;
  type: InfrastructureType;
  name: string;
  lat: number;
  lng: number;
  riskLevel: Severity;
  status: 'operational' | 'at-risk' | 'damaged' | 'offline';
  capacity?: number;
  affectedPopulation?: number;
}

export interface InfrastructureSummary {
  type: InfrastructureType;
  label: string;
  total: number;
  atRisk: number;
  damaged: number;
  percentage: number;
}

// ─── Risk Zones ───────────────────────────────────────────────────────────────

export interface RiskZone {
  id: string;
  name: string;
  severity: Severity;
  population: number;
  area: number;                     // km²
  coordinates: [number, number][];  // polygon
}

export interface RiskDistribution {
  severity: Severity;
  label: string;
  count: number;
  population: number;
  percentage: number;
  color: string;
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  source: string;
  timestamp: string;
  status: AlertStatus;
  region?: string;
  category: 'weather' | 'infrastructure' | 'evacuation' | 'system';
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  phase?: number;
  badge?: string | number;
}

// ─── Region ──────────────────────────────────────────────────────────────────

export interface Region {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  zoom: number;
}

// ─── Dashboard State ─────────────────────────────────────────────────────────

export interface DashboardState {
  selectedRegion: Region;
  activeAlertCount: number;
  dataStatus: DataStatus;
  lastRefresh: string;
  isDemoMode: boolean;
}

// ─── Chart Data ───────────────────────────────────────────────────────────────

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface TimeSeriesPoint {
  time: string;
  value: number;
  label?: string;
}

// ─── Phase 2: Risk Map Types ──────────────────────────────────────────────────

export type LayerId =
  | 'cycloneTrack'
  | 'riskZones'
  | 'spatialGrid'
  | 'roads'
  | 'bridges'
  | 'hospitals'
  | 'power'
  | 'shelters'
  | 'schools'
  | 'telecommunications'
  | 'populationGrid';


export interface LayerConfig {
  id: LayerId;
  label: string;
  color: string;
  icon: string;
  visible: boolean;
  description: string;
}

// ── Rich infrastructure types loaded from infrastructure.json ─────────────────

export interface HospitalFeature {
  id: string;
  name: string;
  lat: number;
  lng: number;
  riskLevel: Severity;
  status: 'operational' | 'at-risk' | 'damaged' | 'offline';
  capacity: number;
  icu_beds: number;
  backupPower: boolean;
  floodRisk: boolean;
  address: string;
  notes: string;
}

export interface ShelterFeature {
  id: string;
  name: string;
  lat: number;
  lng: number;
  riskLevel: Severity;
  status: 'operational' | 'at-risk' | 'damaged' | 'offline';
  capacity: number;
  currentOccupancy: number;
  hasWater: boolean;
  hasMedical: boolean;
  hasPower: boolean;
  address: string;
  notes: string;
}

export interface PowerSubstationFeature {
  id: string;
  name: string;
  lat: number;
  lng: number;
  riskLevel: Severity;
  status: 'operational' | 'at-risk' | 'damaged' | 'offline';
  voltageKv: number;
  affectedPopulation: number;
  backupLine: boolean;
  notes: string;
}

export interface BridgeFeature {
  id: string;
  name: string;
  lat: number;
  lng: number;
  riskLevel: Severity;
  status: 'operational' | 'at-risk' | 'damaged' | 'offline';
  spanM: number;
  yearBuilt: number;
  condition: string;
  route: string;
  notes: string;
}

export interface RoadFeature {
  id: string;
  name: string;
  riskLevel: Severity;
  status: 'operational' | 'at-risk' | 'damaged' | 'offline';
  coordinates: [number, number][];
  lengthKm: number;
  notes: string;
}

export interface SchoolFeature {
  id: string;
  name: string;
  lat: number;
  lng: number;
  riskLevel: Severity;
  status: 'operational' | 'at-risk' | 'damaged' | 'offline';
  capacity: number;
  elevation: number;
  backupPower: boolean;
  floodRisk: boolean;
  address: string;
  notes: string;
}

export interface TelecomTowerFeature {
  id: string;
  name: string;
  lat: number;
  lng: number;
  riskLevel: Severity;
  status: 'operational' | 'at-risk' | 'damaged' | 'offline';
  heightM: number;
  affectedPopulation: number;
  backupBatteryHours: number;
  elevation: number;
  notes: string;
}

// ─── Phase 4: Infrastructure Multi-Hazard Vulnerability ───────────────────────

export interface InfrastructureVulnerability {
  id: string;
  name: string;
  type: InfrastructureType;
  lat?: number;
  lng?: number;
  riskLevel: Severity;
  riskScore: number;                 // 0–100 overall vulnerability
  floodExposure: number;             // % (0–100)
  windExposure: number;              // % (0–100)
  stormSurgeExposure: number;        // % (0–100)
  locationVulnerability: number;     // % (0–100)
  overallVulnerability: number;      // % (0–100)
  riskFactors: string[];
  preparednessNote: string;
  populationDependent?: number;
  status: 'operational' | 'at-risk' | 'damaged' | 'offline';
  notes?: string;
  elevation_m?: number;
  capacity?: number;
  details?: Record<string, unknown>;
}

// ─── Phase 3: Spatial ML Risk Types ──────────────────────────────────────────

export interface RiskInputFeatures {
  wind_speed: number;
  rainfall: number;
  storm_surge: number;
  elevation: number;
  distance_from_coast: number;
  distance_from_cyclone_track: number;
  historical_flood_exposure: number;
  entity_id?: string;
  entity_name?: string;
}

export interface RiskPredictionResult {
  risk_score: number;
  risk_category: string;
  risk_factors: string[];
  category_probabilities?: Record<string, number>;
  model_type: string;
  is_demo_baseline: boolean;
  entity_id?: string;
  entity_name?: string;
}

export interface SpatialGridCellFeature {
  id: string;
  name: string;
  risk_score: number;
  risk_category: string;
  severity: Severity;
  risk_factors: string[];
  center: [number, number];
  wind_speed: number;
  rainfall: number;
  storm_surge: number;
  elevation: number;
  distance_from_coast: number;
  distance_from_cyclone_track: number;
  historical_flood_exposure: number;
  category_probabilities?: Record<string, number>;
  model_type?: string;
  is_demo_baseline?: boolean;
}

// Union type for selected map feature
export type SelectedFeature =
  | { kind: 'infrastructure'; data: InfrastructureVulnerability }
  | { kind: 'hospital';       data: HospitalFeature }
  | { kind: 'shelter';        data: ShelterFeature }
  | { kind: 'power';          data: PowerSubstationFeature }
  | { kind: 'bridge';         data: BridgeFeature }
  | { kind: 'road';           data: RoadFeature }
  | { kind: 'school';         data: SchoolFeature }
  | { kind: 'telecom';        data: TelecomTowerFeature }
  | { kind: 'riskZone';       data: RiskZoneFeature }
  | { kind: 'spatialGrid';    data: SpatialGridCellFeature }
  | { kind: 'populationCell'; data: PopulationGridCell }
  | { kind: 'cyclone';        data: CyclonePointFeature };


export interface RiskZoneFeature {
  id: string;
  name: string;
  severity: Severity;
  population: number;
  area_km2: number;
  elevation_m: number;
  districtHq: string;
  riskFactors: string[];
  riskScore?: number;
  predictedCategory?: string;
  isMLPredicted?: boolean;
  modelType?: string;
  mlFeatures?: Record<string, number>;
}


export interface CyclonePointFeature {
  label: string;
  lat: number;
  lng: number;
  category: number;
  windSpeedKmh: number;
  pressureHpa: number;
  note: string;
  type: 'historic' | 'current' | 'forecast';
}

// ─── Map State ─────────────────────────────────────────────────────────────────

export interface MapState {
  layers: Record<LayerId, boolean>;
  selectedFeature: SelectedFeature | null;
  hoveredZoneId: string | null;
  mapCenter: [number, number];
  mapZoom: number;
}

// ─── Phase 7: Evacuation Planning ─────────────────────────────────────────────

/** A node in the demo road graph (intersection / waypoint). */
export interface EvacNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Zone id this node belongs to (null for neutral nodes) */
  zone_id: string | null;
  /** True if this node is a shelter entrance */
  isShelter: boolean;
  shelter_id?: string;
}

/** An edge in the demo road graph (road segment). */
export interface EvacEdge {
  id: string;
  from: string;      // node id
  to: string;        // node id
  road_name: string;
  road_id: string;   // links to infrastructure.json roads[*].id
  distance_km: number;
  /** Baseline risk level */
  risk_level: 'safe' | 'medium' | 'high' | 'critical';
  /** True when flooded/blocked (can be overridden by scenario) */
  is_blocked: boolean;
  /** Speed limit in km/h */
  speed_kmh: number;
  /** Whether the road is usable at all */
  passable: boolean;
}

/** A computed evacuation route (output of Dijkstra). */
export interface EvacRoute {
  from_zone_id: string;
  from_zone_name: string;
  to_shelter_id: string;
  to_shelter_name: string;
  node_ids: string[];           // ordered list of nodes
  edge_ids: string[];           // ordered list of edges
  total_distance_km: number;
  estimated_time_min: number;
  route_risk: 'safe' | 'medium' | 'high' | 'critical' | 'blocked';
  has_unsafe_segment: boolean;
  path_coords: [number, number][];  // [lat, lng] for map polyline
  warnings: string[];
}

/** Shelter capacity allocation result. */
export interface ShelterAllocation {
  shelter_id: string;
  shelter_name: string;
  shelter_lat: number;
  shelter_lng: number;
  capacity: number;
  current_occupancy: number;
  available_capacity: number;
  allocated: number;             // people allocated from zone
  remaining_after: number;       // available_capacity - allocated
  overflow: boolean;             // true if allocation exceeded capacity
  route: EvacRoute | null;
}

/** Full evacuation plan for a single zone. */
export interface EvacuationPlan {
  zone_id: string;
  zone_name: string;
  zone_severity: string;
  zone_population: number;
  zone_area_km2: number;
  total_to_evacuate: number;     // population × evacuation fraction
  evacuation_rate: number;       // 0–1
  allocations: ShelterAllocation[];
  total_allocated: number;
  total_unallocated: number;
  capacity_satisfied: boolean;
  routes: EvacRoute[];
  generated_at: string;
  scenario_wind?: number;
  scenario_surge?: number;
}

/** Per-zone summary card for the evacuation dashboard. */
export interface ZoneEvacSummary {
  zone_id: string;
  zone_name: string;
  severity: string;
  population: number;
  shelters_assigned: number;
  total_allocated: number;
  capacity_ok: boolean;
  primary_route_risk: string;
}

// ─── Phase 6: Population Exposure Grid ────────────────────────────────────────

export interface PopulationGridCell {
  id: string;
  zone_id: string;        // links to RiskZoneFeature.id
  name: string;
  lat: number;
  lng: number;
  population: number;
  risk_score: number;     // 0–100
  risk_category: 'critical' | 'high' | 'medium' | 'low';
  elevation_m: number;
  area_km2: number;
}

export interface PopulationGridSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  criticalPct: number;
  highPct: number;
  mediumPct: number;
  lowPct: number;
  cellCount: number;
  criticalCells: number;
  highCells: number;
  mediumCells: number;
  lowCells: number;
}

export interface PopulationZoneBreakdown {
  zone_id: string;
  zone_name: string;
  severity: Severity;
  population: number;
  pct_of_total: number;
  cell_count: number;
  avg_risk_score: number;
  max_risk_score: number;
}

