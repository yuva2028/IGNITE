/**
 * CycloneGuard AI — Mock Data (Demo Mode)
 * All data is simulated for demonstration purposes.
 * Do NOT use in production without replacing with real data sources.
 */

import type {
  CycloneMetrics,
  CyclonePath,
  PopulationExposure,
  InfrastructureSummary,
  RiskDistribution,
  Alert,
  Region,
  DashboardState,
  InfrastructureAsset,
  RiskZone,
} from '../types';

// ─── Regions ─────────────────────────────────────────────────────────────────

export const DEMO_REGIONS: Region[] = [
  { id: 'odisha-india', name: 'Odisha Coast', country: 'India', lat: 20.5, lng: 85.8, zoom: 7 },
  { id: 'bangladesh-coast', name: 'Bangladesh Coast', country: 'Bangladesh', lat: 22.0, lng: 90.3, zoom: 7 },
  { id: 'myanmar-irrawaddy', name: 'Irrawaddy Delta', country: 'Myanmar', lat: 16.5, lng: 95.2, zoom: 7 },
  { id: 'philippines-visayas', name: 'Visayas Region', country: 'Philippines', lat: 11.0, lng: 124.5, zoom: 7 },
];

export const ACTIVE_REGION = DEMO_REGIONS[0];

// ─── Dashboard State ──────────────────────────────────────────────────────────

export const DEMO_DASHBOARD_STATE: DashboardState = {
  selectedRegion: ACTIVE_REGION,
  activeAlertCount: 7,
  dataStatus: 'demo',
  lastRefresh: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  isDemoMode: true,
};

// ─── Cyclone Metrics ─────────────────────────────────────────────────────────

export const DEMO_CYCLONE_METRICS: CycloneMetrics = {
  intensityCategory: 4,
  intensityLabel: 'Category 4',
  windSpeedKmh: 220,
  windSpeedKnots: 119,
  rainfallMm24h: 284,
  stormSurgeM: 4.2,
  centralPressureHpa: 944,
  eyeDiameterKm: 38,
  trackingSpeed: 18,
  trackingDirection: 'NNW',
  landfall: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
  lastUpdated: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
};

// ─── Cyclone Path ─────────────────────────────────────────────────────────────

export const DEMO_CYCLONE_PATH: CyclonePath = {
  id: 'BOB-2024-07',
  name: 'Cyclone VAYU-B',
  currentPosition: {
    lat: 17.8,
    lng: 86.4,
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    windSpeedKmh: 220,
    category: 4,
  },
  forecastTrack: [
    { lat: 18.6, lng: 85.9, timestamp: new Date(Date.now() + 6 * 3600000).toISOString(), windSpeedKmh: 215, category: 4 },
    { lat: 19.4, lng: 85.5, timestamp: new Date(Date.now() + 12 * 3600000).toISOString(), windSpeedKmh: 200, category: 4 },
    { lat: 20.2, lng: 85.2, timestamp: new Date(Date.now() + 18 * 3600000).toISOString(), windSpeedKmh: 180, category: 3 },
    { lat: 21.0, lng: 84.9, timestamp: new Date(Date.now() + 24 * 3600000).toISOString(), windSpeedKmh: 155, category: 3 },
    { lat: 21.8, lng: 84.6, timestamp: new Date(Date.now() + 30 * 3600000).toISOString(), windSpeedKmh: 120, category: 2 },
  ],
  historicTrack: [
    { lat: 13.2, lng: 89.2, timestamp: new Date(Date.now() - 48 * 3600000).toISOString(), windSpeedKmh: 110, category: 2 },
    { lat: 14.5, lng: 88.5, timestamp: new Date(Date.now() - 36 * 3600000).toISOString(), windSpeedKmh: 155, category: 3 },
    { lat: 15.8, lng: 87.8, timestamp: new Date(Date.now() - 24 * 3600000).toISOString(), windSpeedKmh: 185, category: 4 },
    { lat: 16.8, lng: 87.1, timestamp: new Date(Date.now() - 12 * 3600000).toISOString(), windSpeedKmh: 210, category: 4 },
    { lat: 17.8, lng: 86.4, timestamp: new Date(Date.now() - 3600000).toISOString(), windSpeedKmh: 220, category: 4 },
  ],
  affectedRadius: 280,
};

// ─── Population Exposure ──────────────────────────────────────────────────────

export const DEMO_POPULATION: PopulationExposure = {
  totalExposed: 2_840_000,
  highRisk: 680_000,
  mediumRisk: 1_120_000,
  lowRisk: 1_040_000,
  evacuated: 214_000,
  shelterCapacity: 380_000,
  vulnerableGroups: {
    elderly: 148_000,
    children: 312_000,
    disabled: 58_000,
    medicalDependent: 24_000,
  },
};

// ─── Infrastructure Summary ───────────────────────────────────────────────────

export const DEMO_INFRASTRUCTURE: InfrastructureSummary[] = [
  { type: 'power', label: 'Power Substations', total: 84, atRisk: 31, damaged: 0, percentage: 37 },
  { type: 'roads', label: 'Major Roads (km)', total: 1240, atRisk: 460, damaged: 0, percentage: 37 },
  { type: 'bridges', label: 'Bridges', total: 142, atRisk: 68, damaged: 5, percentage: 52 },
  { type: 'hospitals', label: 'Hospitals', total: 38, atRisk: 14, damaged: 0, percentage: 37 },
  { type: 'shelters', label: 'Evacuation Shelters', total: 96, atRisk: 18, damaged: 0, percentage: 19 },
  { type: 'telecommunications', label: 'Telecom Towers', total: 218, atRisk: 84, damaged: 0, percentage: 39 },
  { type: 'water', label: 'Water Treatment Plants', total: 22, atRisk: 9, damaged: 0, percentage: 41 },
];

// ─── Risk Distribution ────────────────────────────────────────────────────────

export const DEMO_RISK_DISTRIBUTION: RiskDistribution[] = [
  { severity: 'critical', label: 'Critical', count: 8, population: 124000, percentage: 14, color: '#ef4444' },
  { severity: 'high', label: 'High', count: 23, population: 556000, percentage: 28, color: '#f97316' },
  { severity: 'medium', label: 'Medium', count: 41, population: 1120000, percentage: 36, color: '#f59e0b' },
  { severity: 'low', label: 'Low', count: 35, population: 1040000, percentage: 22, color: '#22c55e' },
];

// ─── Active Alerts ────────────────────────────────────────────────────────────

export const DEMO_ALERTS: Alert[] = [
  {
    id: 'alert-001',
    severity: 'critical',
    title: 'Imminent Landfall Warning',
    description: 'Cyclone VAYU-B projected to make landfall near Puri coast within 18 hours. Maximum sustained winds 220 km/h.',
    source: 'India Meteorological Department',
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    status: 'active',
    region: 'Puri District, Odisha',
    category: 'weather',
  },
  {
    id: 'alert-002',
    severity: 'critical',
    title: 'Storm Surge Advisory — 4.2m',
    description: 'Coastal inundation expected up to 4.2 m above normal tide levels in low-lying areas of Kendrapara and Jagatsinghpur.',
    source: 'National Disaster Management Authority',
    timestamp: new Date(Date.now() - 28 * 60000).toISOString(),
    status: 'active',
    region: 'Kendrapara, Jagatsinghpur',
    category: 'weather',
  },
  {
    id: 'alert-003',
    severity: 'high',
    title: '31 Power Substations At Risk',
    description: 'Projected wind speeds will exceed safe operating thresholds for 31 transmission substations. Preemptive shutdown recommended.',
    source: 'CYCLONEGUARD Infrastructure Monitor',
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    status: 'active',
    region: 'Coastal Odisha Grid Zone',
    category: 'infrastructure',
  },
  {
    id: 'alert-004',
    severity: 'high',
    title: 'Mandatory Evacuation Order — Zone A',
    description: '214,000 residents in coastal Zone A have received mandatory evacuation orders. Shelters at 56% capacity.',
    source: 'Odisha State Disaster Management Authority',
    timestamp: new Date(Date.now() - 92 * 60000).toISOString(),
    status: 'acknowledged',
    region: 'Puri, Chilika Coastal Zone',
    category: 'evacuation',
  },
  {
    id: 'alert-005',
    severity: 'high',
    title: 'Bridge Structural Risk Detected',
    description: '5 bridges flagged for potential structural stress exceeding design parameters under projected surge conditions.',
    source: 'CYCLONEGUARD Infrastructure Monitor',
    timestamp: new Date(Date.now() - 130 * 60000).toISOString(),
    status: 'active',
    region: 'Mahanadi Delta Region',
    category: 'infrastructure',
  },
  {
    id: 'alert-006',
    severity: 'medium',
    title: '14 Hospitals in Projected Impact Zone',
    description: 'Fourteen district hospitals within the projected wind radius. Backup power and patient transfer protocols advised.',
    source: 'CYCLONEGUARD Infrastructure Monitor',
    timestamp: new Date(Date.now() - 180 * 60000).toISOString(),
    status: 'acknowledged',
    region: 'Puri, Ganjam, Khurda Districts',
    category: 'infrastructure',
  },
  {
    id: 'alert-007',
    severity: 'medium',
    title: 'Heavy Rainfall Flash Flood Risk',
    description: '284 mm/24h rainfall modeled. River basins in Chilika and Rushikulya catchments show high runoff risk.',
    source: 'Central Water Commission',
    timestamp: new Date(Date.now() - 220 * 60000).toISOString(),
    status: 'active',
    region: 'Chilika Lake Basin, Rushikulya River',
    category: 'weather',
  },
];

// ─── Infrastructure Assets (Map Markers) ────────────────────────────────────

export const DEMO_INFRASTRUCTURE_ASSETS: InfrastructureAsset[] = [
  { id: 'h-001', type: 'hospitals', name: 'SCBMCH Cuttack', lat: 20.47, lng: 85.88, riskLevel: 'medium', status: 'at-risk', capacity: 850 },
  { id: 'h-002', type: 'hospitals', name: 'MKCG Medical College', lat: 19.31, lng: 84.81, riskLevel: 'high', status: 'at-risk', capacity: 600 },
  { id: 'h-003', type: 'hospitals', name: 'District HQ Hospital Puri', lat: 19.81, lng: 85.83, riskLevel: 'critical', status: 'at-risk', capacity: 300 },
  { id: 's-001', type: 'shelters', name: 'Puri Multipurpose Cyclone Shelter', lat: 19.80, lng: 85.84, riskLevel: 'high', status: 'operational', capacity: 3000 },
  { id: 's-002', type: 'shelters', name: 'Konark Cyclone Shelter', lat: 19.90, lng: 86.12, riskLevel: 'critical', status: 'operational', capacity: 2000 },
  { id: 'p-001', type: 'power', name: 'Chilikadar 220kV Substation', lat: 19.71, lng: 85.32, riskLevel: 'critical', status: 'at-risk' },
  { id: 'p-002', type: 'power', name: 'Bhubaneswar Grid Station', lat: 20.30, lng: 85.84, riskLevel: 'medium', status: 'operational' },
];

// ─── Risk Zones ───────────────────────────────────────────────────────────────

export const DEMO_RISK_ZONES: RiskZone[] = [
  {
    id: 'rz-001',
    name: 'Puri Coastal Zone',
    severity: 'critical',
    population: 124000,
    area: 180,
    coordinates: [[19.7, 85.7], [19.7, 86.0], [19.9, 86.0], [19.9, 85.7]],
  },
  {
    id: 'rz-002',
    name: 'Chilika Delta Region',
    severity: 'high',
    population: 215000,
    area: 340,
    coordinates: [[19.4, 85.2], [19.4, 85.6], [19.8, 85.6], [19.8, 85.2]],
  },
  {
    id: 'rz-003',
    name: 'Kendrapara Coastal Belt',
    severity: 'high',
    population: 341000,
    area: 420,
    coordinates: [[20.2, 86.2], [20.2, 86.8], [20.7, 86.8], [20.7, 86.2]],
  },
];

// ─── Chart: Wind Speed Timeline ───────────────────────────────────────────────

export const DEMO_WIND_TIMELINE = [
  { time: '-48h', value: 110 },
  { time: '-36h', value: 155 },
  { time: '-24h', value: 185 },
  { time: '-12h', value: 210 },
  { time: 'Now', value: 220 },
  { time: '+6h', value: 215 },
  { time: '+12h', value: 200 },
  { time: '+18h', value: 180 },
  { time: '+24h', value: 155 },
  { time: '+30h', value: 120 },
];

// ─── AI Situation Summary (Static Demo) ──────────────────────────────────────

export const DEMO_AI_SUMMARY = {
  headline: 'High-risk modeled exposure concentrated in low-elevation coastal zones.',
  body: `Cyclone VAYU-B is projected to make landfall near the Puri coastline within 18 hours, maintaining Category 4 intensity with maximum sustained winds of 220 km/h. Storm surge modeling indicates inundation up to 4.2 m above MSL across low-lying coastal sectors, affecting an estimated 680,000 residents in the highest-risk categories.

Several critical infrastructure assets — including 31 power substations, 5 bridges, and 3 district hospitals — fall within the simulated high-impact corridor. The Chilika Lake basin and Mahanadi delta regions present compounded flood risk from combined storm surge and anticipated 284 mm/24h rainfall.

Evacuation compliance in Zone A is estimated at 68%. Shelter capacity remains adequate at 56% occupancy but will approach saturation within 9–12 hours at current intake rates.`,
  confidence: 87,
  modelVersion: 'CG-IMPACT-v2.1',
  generatedAt: new Date(Date.now() - 8 * 60000).toISOString(),
  phase: 8,
};
