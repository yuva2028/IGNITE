import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  Compass,
  Layers,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { RiskZoneFeature } from '../../types';
import type { TrackPoint } from '../../services/simulationApi';
import cycloneData from '../../data/cyclone.json';
import riskZonesData from '../../data/risk-zones.json';

// Fix default marker icon paths in Leaflet
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#22c55e',
};

const CAT_COLORS: Record<number, string> = {
  1: '#22c55e',
  2: '#f59e0b',
  3: '#f97316',
  4: '#ef4444',
  5: '#dc2626',
};

interface ScenarioMapProps {
  scenarioZones?: RiskZoneFeature[];
  baselineTrack?: TrackPoint[];
  shiftedTrack?: TrackPoint[];
  trackOffsetKm?: number;
  simulatedWind?: number;
  simulatedSurge?: number;
  isSimulating?: boolean;
}

export default function ScenarioMap({
  scenarioZones,
  baselineTrack,
  shiftedTrack,
  trackOffsetKm = 0,
  simulatedWind = 220,
  simulatedSurge: _simulatedSurge = 4.2,
  isSimulating = false,
}: ScenarioMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const zonesLayerRef = useRef<L.LayerGroup | null>(null);
  const baselineTrackLayerRef = useRef<L.LayerGroup | null>(null);
  const shiftedTrackLayerRef = useRef<L.LayerGroup | null>(null);

  const [compareMode, setCompareMode] = useState<boolean>(true);
  const [showRadius, setShowRadius] = useState<boolean>(true);
  const [selectedZone, setSelectedZone] = useState<RiskZoneFeature | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapInstanceRef.current) return;

    const map = L.map(containerRef.current, {
      center: [19.8, 85.8],
      zoom: 7,
      minZoom: 5,
      maxZoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    // Dark Map Base Tiles
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 16,
      }
    ).addTo(map);

    // Layer groups
    zonesLayerRef.current = L.layerGroup().addTo(map);
    baselineTrackLayerRef.current = L.layerGroup().addTo(map);
    shiftedTrackLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tracks (Baseline vs Shifted)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !baselineTrackLayerRef.current || !shiftedTrackLayerRef.current) return;

    baselineTrackLayerRef.current.clearLayers();
    shiftedTrackLayerRef.current.clearLayers();

    // 1. Render Official Baseline Track (Cyan dashed)
    const bPoints = baselineTrack && baselineTrack.length > 0
      ? baselineTrack
      : (cycloneData.forecastTrack || []).map((pt) => ({
          lat: pt.lat,
          lng: pt.lng,
          label: pt.label,
          category: pt.category,
          wind_speed_kmh: pt.windSpeedKmh,
        }));

    const bCoords: [number, number][] = bPoints.map((p) => [p.lat, p.lng]);

    // Current position connecting line
    const curCoord: [number, number] = [cycloneData.currentPosition.lat, cycloneData.currentPosition.lng];
    L.polyline([curCoord, ...bCoords], {
      color: '#38bdf8',
      weight: 2,
      opacity: compareMode ? 0.45 : 0.2,
      dashArray: '5 6',
    }).addTo(baselineTrackLayerRef.current);

    // Baseline track markers
    bPoints.forEach((pt) => {
      const marker = L.circleMarker([pt.lat, pt.lng], {
        radius: 4,
        fillColor: '#38bdf8',
        color: '#0369a1',
        weight: 1.5,
        fillOpacity: 0.7,
      });
      marker.bindTooltip(
        `<div class="text-[10px] font-sans">
          <p class="font-bold text-cyan-400">Baseline ${pt.label}</p>
          <p class="text-slate-300">Cat ${pt.category} • ${pt.wind_speed_kmh} km/h</p>
        </div>`,
        { direction: 'top', className: 'cg-map-tooltip' }
      );
      marker.addTo(baselineTrackLayerRef.current!);
    });

    // 2. Render Shifted Scenario Track (Vibrant Amber / Red)
    const sPoints = shiftedTrack && shiftedTrack.length > 0 ? shiftedTrack : bPoints;
    const sCoords: [number, number][] = sPoints.map((p) => [p.lat, p.lng]);

    // Shifted Polyline
    L.polyline([curCoord, ...sCoords], {
      color: '#f59e0b',
      weight: 3.5,
      opacity: 0.95,
      dashArray: '8 4',
    }).addTo(shiftedTrackLayerRef.current);

    // Connecting offset bridge line at landfall point (index 2 / T+18h)
    if (bPoints[2] && sPoints[2] && Math.abs(trackOffsetKm) > 1) {
      const bLandfall: [number, number] = [bPoints[2].lat, bPoints[2].lng];
      const sLandfall: [number, number] = [sPoints[2].lat, sPoints[2].lng];

      L.polyline([bLandfall, sLandfall], {
        color: '#e11d48',
        weight: 2,
        dashArray: '3 3',
        opacity: 0.8,
      }).addTo(shiftedTrackLayerRef.current);

      // Midpoint offset label
      const midLat = (bLandfall[0] + sLandfall[0]) / 2;
      const midLng = (bLandfall[1] + sLandfall[1]) / 2;
      const offsetIcon = L.divIcon({
        className: 'bg-transparent',
        html: `<div class="px-1.5 py-0.5 rounded bg-rose-950/90 border border-rose-500/50 text-[9px] font-mono text-rose-300 whitespace-nowrap shadow-md">
          ${trackOffsetKm > 0 ? '▶' : '◀'} ${Math.abs(trackOffsetKm)}km ${trackOffsetKm > 0 ? 'East' : 'West'}
        </div>`,
        iconAnchor: [35, 10],
      });
      L.marker([midLat, midLng], { icon: offsetIcon }).addTo(shiftedTrackLayerRef.current);
    }

    // Shifted Track Waypoint Markers
    sPoints.forEach((pt, i) => {
      const catColor = CAT_COLORS[pt.category] || '#f59e0b';
      const isLandfall = i === 2;

      const marker = L.circleMarker([pt.lat, pt.lng], {
        radius: isLandfall ? 7 : 5,
        fillColor: catColor,
        color: '#ffffff',
        weight: isLandfall ? 2 : 1.5,
        fillOpacity: 0.95,
      });

      marker.bindTooltip(
        `<div class="text-[10px] font-sans p-1">
          <p class="font-bold text-amber-400">${pt.label}</p>
          <p class="text-white font-semibold">Simulated Cat ${pt.category} (${pt.wind_speed_kmh} km/h)</p>
          ${isLandfall ? '<p class="text-rose-400 font-bold text-[9px] mt-0.5">⚠️ SIMULATED LANDFALL ZONE</p>' : ''}
        </div>`,
        { direction: 'top', className: 'cg-map-tooltip' }
      );
      marker.addTo(shiftedTrackLayerRef.current!);
    });

    // Swath impact circle around simulated landfall
    if (showRadius && sPoints[2]) {
      const landfallPt = sPoints[2];
      const radiusKm = Math.min(220, Math.max(80, simulatedWind * 0.75));

      L.circle([landfallPt.lat, landfallPt.lng], {
        radius: radiusKm * 1000,
        color: '#f59e0b',
        fillColor: '#f59e0b',
        fillOpacity: 0.06,
        weight: 1.5,
        dashArray: '6 6',
      }).addTo(shiftedTrackLayerRef.current);
    }
  }, [baselineTrack, shiftedTrack, trackOffsetKm, simulatedWind, compareMode, showRadius]);

  // Update Risk Zones on Map
  useEffect(() => {
    if (!zonesLayerRef.current) return;
    zonesLayerRef.current.clearLayers();

    // Use scenarioZones if provided, else fallback to static zones
    const zonesToRender = scenarioZones && scenarioZones.length > 0
      ? scenarioZones
      : (riskZonesData.zones as unknown as RiskZoneFeature[]);

    // Find baseline lookup for comparison
    const baselineMap = new Map(riskZonesData.zones.map((z) => [z.id, z.severity]));

    zonesToRender.forEach((z) => {
      // Find polygon coordinates
      const staticZone = riskZonesData.zones.find((sz) => sz.id === z.id);
      const coords = staticZone?.coordinates || [];
      if (!coords || coords.length === 0) return;

      const latLngs: [number, number][] = coords.map((c) => [c[1], c[0]]);

      const scenarioColor = SEVERITY_COLORS[z.severity] || '#f59e0b';
      const baselineSeverity = baselineMap.get(z.id) || 'medium';
      const hasUpgraded = z.severity === 'critical' && baselineSeverity !== 'critical';

      const polygon = L.polygon(latLngs, {
        color: scenarioColor,
        weight: hasUpgraded ? 2.5 : 1.5,
        fillColor: scenarioColor,
        fillOpacity: z.severity === 'critical' ? 0.38 : z.severity === 'high' ? 0.26 : 0.15,
        dashArray: compareMode && baselineSeverity !== z.severity ? '4 2' : undefined,
      });

      polygon.on('click', () => {
        setSelectedZone(z);
      });

      polygon.bindTooltip(
        `<div class="text-[11px] font-sans">
          <p class="font-bold text-white">${z.name}</p>
          <div class="flex items-center gap-1.5 mt-0.5">
            <span class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase" style="background:${scenarioColor}20; color:${scenarioColor}; border:1px solid ${scenarioColor}40">
              ${z.severity}
            </span>
            ${z.riskScore ? `<span class="text-slate-300 font-mono text-[10px]">Score: ${z.riskScore}/100</span>` : ''}
          </div>
          ${hasUpgraded ? '<p class="text-rose-400 font-semibold text-[9px] mt-1">⚠️ Escalated from ' + baselineSeverity + '</p>' : ''}
        </div>`,
        { direction: 'top', sticky: true, className: 'cg-map-tooltip' }
      );

      polygon.addTo(zonesLayerRef.current!);
    });
  }, [scenarioZones, compareMode]);

  const handleResetView = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([19.8, 85.8], 7, { animate: true });
    }
  }, []);

  return (
    <div className="relative w-full h-full min-h-[460px] rounded-xl overflow-hidden border border-[#1e2d3d] bg-[#050a10]">
      {/* Map Container */}
      <div ref={containerRef} className="w-full h-full min-h-[460px]" />

      {/* Loading Overlay */}
      {isSimulating && (
        <div className="absolute inset-0 bg-[#080d14]/70 backdrop-blur-xs flex items-center justify-center z-1000">
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#0d1622] border border-cyan-500/30 shadow-2xl">
            <div className="w-8 h-8 rounded-full border-2 border-cyan-400/20 border-t-cyan-400 animate-spin" />
            <p className="text-xs font-semibold text-cyan-400">Recalculating Risk Grid & Exposure...</p>
            <p className="text-[10px] text-slate-400">Evaluating multi-hazard physical models</p>
          </div>
        </div>
      )}

      {/* Top Disclaimer Badge (Prompt Requirement) */}
      <div className="absolute top-3 left-3 z-500 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-950/80 border border-amber-500/40 backdrop-blur-md shadow-lg">
          <AlertTriangle size={13} className="text-amber-400 shrink-0" />
          <span className="text-[10px] font-bold text-amber-300 tracking-wider uppercase">
            SIMULATED SCENARIO — NOT AN OFFICIAL FORECAST
          </span>
        </div>
      </div>

      {/* Map Controls (Top Right) */}
      <div className="absolute top-3 right-3 z-500 flex flex-col gap-1.5">
        <button
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="w-8 h-8 rounded-lg bg-[#0d1622]/90 border border-[#1e2d3d] hover:border-cyan-500/40 text-slate-300 hover:text-white flex items-center justify-center transition-colors shadow-lg"
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="w-8 h-8 rounded-lg bg-[#0d1622]/90 border border-[#1e2d3d] hover:border-cyan-500/40 text-slate-300 hover:text-white flex items-center justify-center transition-colors shadow-lg"
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>
        <button
          onClick={handleResetView}
          className="w-8 h-8 rounded-lg bg-[#0d1622]/90 border border-[#1e2d3d] hover:border-cyan-500/40 text-slate-300 hover:text-white flex items-center justify-center transition-colors shadow-lg"
          title="Reset Odisha View"
        >
          <Compass size={14} />
        </button>
      </div>

      {/* Legend & Layer Toggles (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-500 max-w-sm">
        <div className="p-3 rounded-xl bg-[#080d14]/90 border border-[#1e2d3d] backdrop-blur-md shadow-xl text-xs space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1e2d3d]">
            <span className="text-[10px] font-bold text-slate-300 tracking-wider uppercase flex items-center gap-1.5">
              <Layers size={11} className="text-cyan-400" /> Scenario Map Layers
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCompareMode(!compareMode)}
                className={`px-2 py-0.5 rounded text-[9px] font-semibold transition-colors ${
                  compareMode
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-[#121e2c] text-slate-400 border border-[#1e2d3d]'
                }`}
              >
                Compare: {compareMode ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => setShowRadius(!showRadius)}
                className={`px-2 py-0.5 rounded text-[9px] font-semibold transition-colors ${
                  showRadius
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-[#121e2c] text-slate-400 border border-[#1e2d3d]'
                }`}
              >
                Swath: {showRadius ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Tracks Legend */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 border-t border-dashed border-[#38bdf8]" />
              <span className="text-slate-300">Baseline Track</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-[#f59e0b]" />
              <span className="text-amber-400 font-medium">Scenario Track</span>
            </div>
          </div>

          {/* Risk Zones Legend */}
          <div className="flex items-center gap-2 pt-1 border-t border-[#1e2d3d]/50 text-[10px]">
            <span className="text-slate-400 text-[9px]">Severity:</span>
            <span className="flex items-center gap-1 text-red-400">
              <span className="w-2 h-2 rounded-xs bg-red-500" /> Critical
            </span>
            <span className="flex items-center gap-1 text-orange-400">
              <span className="w-2 h-2 rounded-xs bg-orange-500" /> High
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2 h-2 rounded-xs bg-amber-500" /> Medium
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-xs bg-emerald-500" /> Low
            </span>
          </div>
        </div>
      </div>

      {/* Selected Zone Detail Overlay */}
      {selectedZone && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-500 max-w-md w-full px-4">
          <div className="p-3.5 rounded-xl bg-[#080d14]/95 border border-cyan-500/40 backdrop-blur-md shadow-2xl space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white">{selectedZone.name}</h4>
              <button
                onClick={() => setSelectedZone(null)}
                className="text-slate-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div className="p-1.5 rounded bg-[#0d1622] border border-[#1e2d3d]">
                <span className="text-slate-400">Severity</span>
                <p className="font-bold uppercase text-red-400">{selectedZone.severity}</p>
              </div>
              <div className="p-1.5 rounded bg-[#0d1622] border border-[#1e2d3d]">
                <span className="text-slate-400">Risk Score</span>
                <p className="font-bold text-cyan-400">{selectedZone.riskScore || 75}/100</p>
              </div>
              <div className="p-1.5 rounded bg-[#0d1622] border border-[#1e2d3d]">
                <span className="text-slate-400">Population</span>
                <p className="font-bold text-white">{selectedZone.population.toLocaleString()}</p>
              </div>
            </div>
            {selectedZone.riskFactors && (
              <p className="text-[10px] text-slate-300">
                <span className="text-slate-400">Factors:</span> {selectedZone.riskFactors.slice(0, 3).join(', ')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
