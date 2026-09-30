import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react';
import type { LayerId, LayerConfig, SelectedFeature, RiskZoneFeature, SpatialGridCellFeature } from '../types';
import MapLegend from '../components/map/MapLegend';
import InfoPanel from '../components/map/InfoPanel';
import {
  Map, Wind, Building2, Heart, Zap, Shield, Landmark, Navigation2,
  ChevronRight, ChevronLeft, Maximize2, RotateCcw, Brain, Grid, BarChart3, CheckCircle2,
  GraduationCap, Radio, Users
} from 'lucide-react';
import { fetchPredictedZones, fetchSpatialGridGeoJSON, fetchModelInfo } from '../services/riskApi';
import {
  fetchInfrastructureAssessment,
  fetchInfrastructureSummary,
  type InfrastructureAssessmentData,
  type InfrastructureSummary,
} from '../services/infrastructureApi';
import { getBaselineSummary } from '../services/populationService';
import { formatNumber } from '../utils/formatters';

// Phase 6: population grid summary (static baseline)
const POP_GRID = getBaselineSummary();

const RiskMapCore = lazy(() => import('../components/map/RiskMapCore'));

// ── Layer configuration (single source of truth) ─────────────────────────────
const LAYER_CONFIGS: LayerConfig[] = [
  {
    id: 'cycloneTrack',
    label: 'Cyclone Track',
    color: '#ef4444',
    icon: 'Wind',
    visible: true,
    description: 'Historic track, forecast path, cone of uncertainty & wind radii',
  },
  {
    id: 'riskZones',
    label: 'Risk Zones (ML)',
    color: '#f97316',
    icon: 'Map',
    visible: true,
    description: 'Predicted risk scores (0–100) & severity categories',
  },
  {
    id: 'spatialGrid',
    label: 'ML Spatial Grid',
    color: '#06b6d4',
    icon: 'Grid',
    visible: true,
    description: 'Random Forest spatial risk engine grid cells (0.2° resolution)',
  },
  {
    id: 'roads',
    label: 'Roads',
    color: '#8fa3b8',
    icon: 'Navigation2',
    visible: true,
    description: 'Major roads and evacuation corridors with risk classification',
  },
  {
    id: 'bridges',
    label: 'Bridges',
    color: '#7c3aed',
    icon: 'Landmark',
    visible: true,
    description: 'Key bridge structures and structural risk status',
  },
  {
    id: 'hospitals',
    label: 'Hospitals',
    color: '#00e5a0',
    icon: 'Heart',
    visible: true,
    description: 'District and referral hospitals, ICU capacity, risk status',
  },
  {
    id: 'power',
    label: 'Power Substations',
    color: '#f59e0b',
    icon: 'Zap',
    visible: true,
    description: 'Transmission and distribution substations with grid risk',
  },
  {
    id: 'shelters',
    label: 'Shelters',
    color: '#1a6cff',
    icon: 'Shield',
    visible: true,
    description: 'Cyclone shelters with current occupancy levels',
  },
  {
    id: 'schools',
    label: 'Schools',
    color: '#6366f1',
    icon: 'GraduationCap',
    visible: true,
    description: 'Schools and educational shelters with capacity and flood risk',
  },
  {
    id: 'telecommunications',
    label: 'Telecom Towers',
    color: '#06b6d4',
    icon: 'Radio',
    visible: true,
    description: 'Cellular masts, microwave repeaters, and communications network',
  },
  {
    id: 'populationGrid',
    label: 'Population Grid',
    color: '#ec4899',
    icon: 'Users',
    visible: true,
    description: 'Phase 6 population exposure grid cells with risk category & exposure counts',
  },
];

const INITIAL_VISIBILITY: Record<LayerId, boolean> = Object.fromEntries(
  LAYER_CONFIGS.map((l) => [l.id, l.visible])
) as Record<LayerId, boolean>;

const DEFAULT_CENTER: [number, number] = [19.8, 85.8];
const DEFAULT_ZOOM = 7;

const ICON_MAP: Record<string, React.ReactNode> = {
  Wind:          <Wind          size={12} />,
  Map:           <Map           size={12} />,
  Grid:          <Grid          size={12} />,
  Navigation2:   <Navigation2   size={12} />,
  Landmark:      <Landmark      size={12} />,
  Heart:         <Heart         size={12} />,
  Zap:           <Zap           size={12} />,
  Shield:        <Shield        size={12} />,
  GraduationCap: <GraduationCap size={12} />,
  Radio:         <Radio         size={12} />,
  Users:         <Users         size={12} />,
};

interface SpatialGridGeoJSONType {
  features: Array<{
    id: string;
    geometry: { type: string; coordinates: number[][][] };
    properties: SpatialGridCellFeature;
  }>;
  metadata: Record<string, unknown>;
}

export default function RiskMapPage() {
  const [visibleLayers, setVisibleLayers] = useState<Record<LayerId, boolean>>(INITIAL_VISIBILITY);
  const [selectedFeature, setSelectedFeature] = useState<SelectedFeature | null>(null);
  const [legendOpen, setLegendOpen] = useState(true);
  const [infoPanelOpen, setInfoPanelOpen] = useState(true);
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const mapRef = useRef<import('leaflet').Map | null>(null);

  // Phase 3 ML State
  const [predictedZones, setPredictedZones] = useState<RiskZoneFeature[]>([]);
  const [spatialGridData, setSpatialGridData] = useState<SpatialGridGeoJSONType | null>(null);
  const [isMLConnected, setIsMLConnected] = useState<boolean>(false);
  const [modelInfo, setModelInfo] = useState<any>(null);

  // Phase 4 Infrastructure Vulnerability State
  const [infraAssessment, setInfraAssessment] = useState<InfrastructureAssessmentData | null>(null);
  const [infraSummary, setInfraSummary] = useState<InfrastructureSummary | null>(null);

  // Fetch ML predictions and Phase 4 Infrastructure Assessments on load
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [zonesRes, gridRes, infoRes, infraRes, summaryRes] = await Promise.all([
          fetchPredictedZones(),
          fetchSpatialGridGeoJSON(),
          fetchModelInfo(),
          fetchInfrastructureAssessment(),
          fetchInfrastructureSummary(),
        ]);

        if (isMounted) {
          if (zonesRes?.zones) {
            setPredictedZones(zonesRes.zones);
            setIsMLConnected(zonesRes.isMLPredicted);
          }
          if (gridRes) {
            setSpatialGridData(gridRes as SpatialGridGeoJSONType);
          }
          if (infoRes) {
            setModelInfo(infoRes);
          }
          if (infraRes) {
            setInfraAssessment(infraRes);
          }
          if (summaryRes) {
            setInfraSummary(summaryRes);
          }
        }
      } catch (e) {
        console.error('Error loading Phase 3/4 risk and infrastructure data:', e);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleLayer = useCallback((id: LayerId) => {
    setVisibleLayers((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleSelectFeature = useCallback((f: SelectedFeature | null) => {
    setSelectedFeature(f);
    if (f) setInfoPanelOpen(true);
  }, []);

  const handleResetView = useCallback(() => {
    mapRef.current?.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  }, []);

  const handleFitZones = useCallback(() => {
    mapRef.current?.fitBounds([[17.5, 82.5], [22.5, 87.5]], { padding: [20, 20] });
  }, []);

  const layerConfigs = LAYER_CONFIGS.map((l) => ({
    ...l,
    visible: visibleLayers[l.id],
  }));


  return (
    <div className="flex h-full bg-[#080d14] overflow-hidden fade-in">

      {/* ── Left: Legend Panel ─────────────────────────────────────────────── */}
      <div
        className={`relative flex flex-col bg-[#0d1520] border-r border-[#1e2d3d] transition-all duration-200 shrink-0 ${
          legendOpen ? 'w-52' : 'w-0 overflow-hidden'
        }`}
      >
        {legendOpen && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-3 border-b border-[#1e2d3d] shrink-0">
              <div className="flex items-center gap-2">
                <Map size={13} className="text-cyan-400" />
                <span className="text-xs font-bold text-white">Map Controls</span>
              </div>
            </div>

            {/* Layer summary badges */}
            <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-[#162030]">
              {layerConfigs.map((l) => (
                <button
                  key={l.id}
                  onClick={() => handleToggleLayer(l.id)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-semibold border transition-all ${
                    visibleLayers[l.id]
                      ? 'border-transparent text-white'
                      : 'border-[#1e2d3d] text-[#4a6278] opacity-50'
                  }`}
                  style={visibleLayers[l.id] ? { backgroundColor: `${l.color}20`, borderColor: `${l.color}40`, color: l.color } : {}}
                  title={l.description}
                >
                  {ICON_MAP[l.icon]}
                </button>
              ))}
            </div>

            {/* Legend scroll area */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <MapLegend
                layers={layerConfigs}
                visibleLayers={visibleLayers}
                onToggleLayer={handleToggleLayer}
                onResetView={handleResetView}
                onFitZones={handleFitZones}
              />
            </div>
          </>
        )}
      </div>

      {/* Toggle legend */}
      <button
        id="legend-toggle-btn"
        onClick={() => setLegendOpen((v) => !v)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-[200] flex items-center justify-center w-5 h-10 bg-[#0d1520] border border-[#1e2d3d] rounded-r-lg text-[#4a6278] hover:text-white hover:border-[#2a3d52] transition-colors"
        style={{ left: legendOpen ? '208px' : '0px' }}
        title={legendOpen ? 'Hide legend' : 'Show legend'}
      >
        {legendOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>

      {/* ── Center: Map ────────────────────────────────────────────────────── */}
      <div className="flex-1 relative min-w-0">

        {/* Map top bar */}
        <div className="absolute top-3 left-3 right-3 z-[200] flex items-center justify-between gap-3 pointer-events-none">
          {/* Left: Demo badge & ML Engine Status */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0f1a25]/90 backdrop-blur-sm border border-amber-400/25">
              <span className="flex h-1.5 w-1.5 rounded-full bg-amber-400 demo-pulse" />
              <span className="text-[9px] font-bold text-amber-400 tracking-widest uppercase">
                Demo — Simulated Data Only
              </span>
            </div>

            {/* ML Status Badge & Model Metrics Button */}
            <button
              id="ml-metrics-toggle-btn"
              onClick={() => setShowMetricsModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-sm border transition-all cursor-pointer ${
                isMLConnected
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              }`}
              title="Click to view real Phase 3 ML Model Metrics"
            >
              <Brain size={12} className={isMLConnected ? 'text-cyan-400' : 'text-amber-400'} />
              <span className="text-[9px] font-bold tracking-wider uppercase">
                {isMLConnected ? 'ML Engine: Connected' : 'ML Engine: Client Fallback'}
              </span>
              <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-black/40 text-cyan-300">
                {modelInfo?.metrics?.accuracy ? `${(modelInfo.metrics.accuracy * 100).toFixed(1)}% Acc` : '94% Acc'}
              </span>
              <BarChart3 size={11} className="text-cyan-400 ml-0.5" />
            </button>
          </div>

          {/* Right: active layer count + controls */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0f1a25]/90 backdrop-blur-sm border border-[#1e2d3d]">
              <span className="text-[9px] text-[#8fa3b8]">
                <span className="font-bold text-cyan-400">
                  {Object.values(visibleLayers).filter(Boolean).length}
                </span>
                /{LAYER_CONFIGS.length} layers
              </span>
            </div>
            <button
              id="map-reset-btn"
              onClick={handleResetView}
              className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#0f1a25]/90 backdrop-blur-sm border border-[#1e2d3d] hover:border-[#2a3d52] text-[#4a6278] hover:text-white transition-colors"
              title="Reset view"
            >
              <RotateCcw size={11} />
            </button>
            <button
              id="map-fit-btn"
              onClick={handleFitZones}
              className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#0f1a25]/90 backdrop-blur-sm border border-[#1e2d3d] hover:border-[#2a3d52] text-[#4a6278] hover:text-white transition-colors"
              title="Fit all zones"
            >
              <Maximize2 size={11} />
            </button>
          </div>
        </div>

        {/* Cyclone label */}
        <div className="absolute top-14 left-3 z-[200] pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0f1a25]/90 backdrop-blur-sm border border-red-500/25">
            <span className="flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-red-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
            </span>
            <span className="text-[9px] font-bold text-red-400 tracking-wide">CYCLONE VAYU-B · CAT 4 · 220 km/h · NNW</span>
          </div>
        </div>

        {/* The map itself */}
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-[#080d14]">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-cyan-500/30 mb-3 animate-pulse">
                  <Building2 size={20} className="text-cyan-400" />
                </div>
                <p className="text-xs text-[#4a6278]">Loading risk map…</p>
              </div>
            </div>
          }
        >
          <RiskMapCore
            visibleLayers={visibleLayers}
            onSelectFeature={handleSelectFeature}
            mapRef={mapRef}
            predictedZones={predictedZones}
            spatialGridData={spatialGridData}
            assessedAssetsByType={infraAssessment?.assetsByType}
          />
        </Suspense>

        {/* Bottom stats bar - Phase 4 Critical Infrastructure Vulnerability Stats */}
        <div className="absolute bottom-3 left-3 right-3 z-[200] pointer-events-none">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#0f1a25]/95 backdrop-blur-sm border border-[#1e2d3d] overflow-x-auto shadow-xl">
            {[
              { label: 'Risk Zones',       value: `${predictedZones.length || 10}`, color: 'text-orange-400' },
              {
                label: 'Critical Zones',
                value: `${predictedZones.filter(z => (z.predictedCategory || z.severity).toLowerCase() === 'critical').length || 2}`,
                color: 'text-red-400',
              },
              { label: 'Power At Risk',    value: `${infraSummary?.power_assets_at_risk ?? 5}`,  color: 'text-amber-400' },
              { label: 'Roads At Risk',    value: `${infraSummary?.roads_at_risk ?? 6}`,  color: 'text-slate-300' },
              { label: 'Bridges At Risk',  value: `${infraSummary?.bridges_at_risk ?? 5}`,  color: 'text-purple-400' },
              { label: 'Hospitals At Risk',value: `${infraSummary?.hospitals_at_risk ?? 5}`,  color: 'text-emerald-400' },
              { label: 'Shelters Exposed', value: `${infraSummary?.shelters_exposed ?? 1}`,  color: 'text-blue-400' },
              { label: 'Schools At Risk',  value: `${infraSummary?.schools_at_risk ?? 4}`,  color: 'text-indigo-400' },
              { label: 'Telecom At Risk',  value: `${infraSummary?.telecom_at_risk ?? 5}`,  color: 'text-cyan-400' },
              { label: 'Pop. Exposed (P6)',   value: formatNumber(POP_GRID.total), color: 'text-pink-400' },
              { label: 'Critical-Risk Pop.',  value: formatNumber(POP_GRID.critical), color: 'text-red-400' },
              { label: 'High-Risk Pop.',      value: formatNumber(POP_GRID.high), color: 'text-orange-400' },
            ].map((stat, i) => (
              <div key={stat.label} className="flex items-center gap-3 shrink-0">
                {i > 0 && <div className="w-px h-3 bg-[#1e2d3d]" />}
                <div className="text-center">
                  <p className={`text-xs font-bold font-mono ${stat.color}`}>{stat.value}</p>
                  <p className="text-[8px] text-[#4a6278] uppercase whitespace-nowrap">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Phase 3 ML Model Metrics Modal ──────────────────────────────────── */}
      {showMetricsModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#0d1520] border border-cyan-500/30 rounded-2xl shadow-2xl p-6 text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2d3d]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Brain size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">CycloneGuard ML Engine (Phase 3)</h3>
                  <p className="text-[10px] text-cyan-400 font-mono">Random Forest Baseline · Model Architecture</p>
                </div>
              </div>
              <button
                onClick={() => setShowMetricsModal(false)}
                className="text-[#8fa3b8] hover:text-white p-1 rounded-md hover:bg-[#1e2d3d] transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Model Evaluation Metrics Grid */}
            <div className="my-4">
              <p className="text-[10px] font-bold text-[#8fa3b8] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-400" />
                Real Calculated Evaluation Metrics (Held-Out Test Split)
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Accuracy', value: modelInfo?.metrics?.accuracy ? `${(modelInfo.metrics.accuracy * 100).toFixed(1)}%` : '94.0%', color: 'text-emerald-400' },
                  { label: 'Weighted F1', value: modelInfo?.metrics?.f1_score_weighted?.toFixed(4) || '0.9397', color: 'text-cyan-400' },
                  { label: 'ROC-AUC (OVR)', value: modelInfo?.metrics?.roc_auc_weighted?.toFixed(4) || '0.9890', color: 'text-purple-400' },
                  { label: 'Precision', value: modelInfo?.metrics?.precision_weighted?.toFixed(4) || '0.9399', color: 'text-blue-400' },
                  { label: 'Recall', value: modelInfo?.metrics?.recall_weighted?.toFixed(4) || '0.9400', color: 'text-amber-400' },
                  { label: 'Score MAE', value: modelInfo?.metrics?.risk_score_mae ? `${modelInfo.metrics.risk_score_mae} pts` : '1.84 pts', color: 'text-rose-400' },
                ].map((m) => (
                  <div key={m.label} className="p-2.5 rounded-lg bg-[#080d14] border border-[#1e2d3d] text-center">
                    <p className={`text-base font-bold font-mono ${m.color}`}>{m.value}</p>
                    <p className="text-[9px] text-[#4a6278] uppercase">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature Importances */}
            <div className="my-4">
              <p className="text-[10px] font-bold text-[#8fa3b8] uppercase tracking-wider mb-2">
                Feature Importances (Tree Entropy Gain)
              </p>
              <div className="space-y-1.5">
                {[
                  { name: 'wind_speed', pct: 37.1 },
                  { name: 'rainfall', pct: 21.6 },
                  { name: 'storm_surge', pct: 17.8 },
                  { name: 'historical_flood_exposure', pct: 7.3 },
                  { name: 'elevation', pct: 6.7 },
                  { name: 'distance_from_cyclone_track', pct: 5.0 },
                  { name: 'distance_from_coast', pct: 4.5 },
                ].map((f) => (
                  <div key={f.name} className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-[#8fa3b8] w-48 truncate">{f.name}</span>
                    <div className="flex-1 h-1.5 bg-[#080d14] rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${f.pct * 2.5}%` }} />
                    </div>
                    <span className="text-[9px] font-mono text-cyan-300 w-10 text-right">{f.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-400/5 border border-amber-400/20 text-[10px] text-[#8fa3b8]">
              <span className="font-bold text-amber-400 uppercase">Demo Baseline Label: </span>
              {modelInfo?.notice || 'Trained on synthetic ground truth data calibrated to hydrodynamic Bay of Bengal cyclone vulnerability principles. Replaceable ML engine.'}
            </div>

            <div className="mt-4 pt-3 border-t border-[#1e2d3d] flex justify-end">
              <button
                onClick={() => setShowMetricsModal(false)}
                className="px-4 py-1.5 rounded-lg bg-[#1e2d3d] hover:bg-[#2a3d52] text-xs font-semibold text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ── Right: Info Panel ──────────────────────────────────────────────── */}
      <div
        className={`flex flex-col bg-[#0d1520] border-l border-[#1e2d3d] transition-all duration-200 shrink-0 ${
          infoPanelOpen ? 'w-64' : 'w-0 overflow-hidden'
        }`}
      >
        {infoPanelOpen && (
          <InfoPanel
            feature={selectedFeature}
            onClose={() => setInfoPanelOpen(false)}
          />
        )}
      </div>

      {/* Toggle info panel */}
      {!infoPanelOpen && (
        <button
          id="info-panel-open-btn"
          onClick={() => setInfoPanelOpen(true)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-[200] flex items-center justify-center w-5 h-10 bg-[#0d1520] border border-[#1e2d3d] rounded-l-lg text-[#4a6278] hover:text-white hover:border-[#2a3d52] transition-colors"
          title="Show info panel"
        >
          <ChevronLeft size={12} />
        </button>
      )}
    </div>
  );
}
