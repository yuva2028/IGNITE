/**
 * CycloneGuard AI — Evacuation Planner Page (Phase 7)
 *
 * SIMULATED DEMO DATA: All routes, times, shelter assignments, and road risk
 * labels are computed on a synthetic demo road graph. Not for operational use.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Navigation, AlertTriangle, Users, MapPin, Clock, Route,
  CheckCircle2, XCircle, ChevronDown, ChevronRight,
  RotateCcw, Layers, Zap, Shield, TrendingUp, Info,
  ArrowRight, Home, Car, BarChart3,
} from 'lucide-react';
import L from 'leaflet';
import type { EvacuationPlan, ShelterAllocation, EvacRoute } from '../types';
import {
  getAllZones,
  getAllShelters,
  generateEvacuationPlan,
  getScenarioEdges,
  getAllNodes,
  EVAC_RISK_COLORS,
  type ZoneInfo,
  type ShelterInfo,
} from '../services/evacuationService';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ── Constants ─────────────────────────────────────────────────────────────────
const SEV_COLOR: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#22c55e', safe: '#22c55e',
};
const SEV_BG: Record<string, string> = {
  critical: 'bg-red-500/10 border-red-500/25 text-red-400',
  high:     'bg-orange-500/10 border-orange-500/25 text-orange-400',
  medium:   'bg-amber-500/10 border-amber-500/25 text-amber-400',
  low:      'bg-green-500/10 border-green-500/25 text-green-400',
  safe:     'bg-green-500/10 border-green-500/25 text-green-400',
  blocked:  'bg-slate-600/20 border-slate-500/25 text-slate-400',
};

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SeverityBadge({ sev }: { sev: string }) {
  const cls = SEV_BG[sev] ?? SEV_BG.medium;
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${cls}`}>
      {sev}
    </span>
  );
}

function RouteRiskBadge({ risk }: { risk: string }) {
  return (
    <span
      className="text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider"
      style={{ color: EVAC_RISK_COLORS[risk] ?? '#94a3b8', borderColor: `${EVAC_RISK_COLORS[risk] ?? '#94a3b8'}40`, backgroundColor: `${EVAC_RISK_COLORS[risk] ?? '#94a3b8'}15` }}
    >
      {risk === 'blocked' ? 'BLOCKED' : `${risk} risk`}
    </span>
  );
}

function ShelterCard({ alloc, index }: { alloc: ShelterAllocation; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const fillPct = Math.round(((alloc.current_occupancy + alloc.allocated) / alloc.capacity) * 100);
  const availPct = Math.round((alloc.available_capacity / alloc.capacity) * 100);
  const route = alloc.route;

  return (
    <div className={`rounded-xl border transition-all ${alloc.overflow ? 'border-rose-500/30 bg-rose-500/5' : 'border-[#1e2d3d] bg-[#080d14]'}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/25 shrink-0">
          <Home size={12} className="text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold font-mono text-cyan-400 shrink-0">S{String(index + 1).padStart(2, '0')}</span>
            <span className="text-xs font-semibold text-white truncate">{alloc.shelter_name}</span>
            {alloc.overflow && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">OVER CAPACITY</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><Users size={9} /> Alloc: <strong className="text-white font-mono">{fmt(alloc.allocated)}</strong></span>
            <span className="text-slate-600">·</span>
            <span>Avail: <strong className="text-emerald-400 font-mono">{fmt(alloc.remaining_after)}</strong> remaining</span>
            {route && <span className="text-slate-600">·</span>}
            {route && (
              <span className="flex items-center gap-1">
                <Car size={9} />
                <strong className="font-mono">{route.total_distance_km} km</strong>
                <span>·</span>
                <Clock size={9} />
                <strong className="font-mono">{route.estimated_time_min} min</strong>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {route && <RouteRiskBadge risk={route.route_risk} />}
          {expanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
        </div>
      </button>

      {/* Capacity bar */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 text-[9px] text-slate-500 mb-1">
          <span>Capacity: {fmt(alloc.capacity)}</span>
          <span>·</span>
          <span>Pre-existing: {fmt(alloc.current_occupancy)}</span>
          <span>·</span>
          <span>Allocating: +{fmt(alloc.allocated)}</span>
          <span className={`ml-auto font-bold ${fillPct >= 90 ? 'text-rose-400' : fillPct >= 70 ? 'text-amber-400' : 'text-emerald-400'}`}>{fillPct}% full after</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#0d1622] overflow-hidden">
          <div className="h-full flex">
            <div className="h-full bg-slate-500/60" style={{ width: `${Math.min(100, (alloc.current_occupancy / alloc.capacity) * 100)}%` }} />
            <div className="h-full bg-cyan-400" style={{ width: `${Math.min(100, (alloc.allocated / alloc.capacity) * 100)}%` }} />
          </div>
        </div>
        <div className="flex justify-between text-[8px] text-slate-600 mt-0.5">
          <span>0</span><span className="text-slate-500">Available: {availPct}% before allocation</span><span>{fmt(alloc.capacity)}</span>
        </div>
      </div>

      {/* Expanded route detail */}
      {expanded && route && (
        <div className="px-3 pb-3 border-t border-[#1e2d3d] pt-2 space-y-2">
          <p className="text-[10px] font-bold text-slate-300 flex items-center gap-1.5"><Route size={10} className="text-cyan-400" /> Route Detail</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded bg-[#0a1520] border border-[#1e2d3d] text-center">
              <p className="text-[9px] text-slate-400">Distance</p>
              <p className="text-sm font-black font-mono text-white">{route.total_distance_km}<span className="text-[9px] font-normal text-slate-400"> km</span></p>
            </div>
            <div className="p-2 rounded bg-[#0a1520] border border-[#1e2d3d] text-center">
              <p className="text-[9px] text-slate-400">Est. Time</p>
              <p className="text-sm font-black font-mono text-white">{route.estimated_time_min}<span className="text-[9px] font-normal text-slate-400"> min</span></p>
            </div>
            <div className="p-2 rounded bg-[#0a1520] border border-[#1e2d3d] text-center">
              <p className="text-[9px] text-slate-400">Route Risk</p>
              <p className={`text-sm font-black uppercase`} style={{ color: EVAC_RISK_COLORS[route.route_risk] }}>{route.route_risk}</p>
            </div>
          </div>
          {route.warnings.length > 0 && (
            <div className="space-y-1">
              {route.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[10px] text-amber-300">
                  <AlertTriangle size={9} className="mt-0.5 shrink-0 text-amber-400" />
                  {w}
                </div>
              ))}
            </div>
          )}
          <p className="text-[9px] text-slate-600 font-mono">Segments: {route.edge_ids.length} · Nodes: {route.node_ids.length}</p>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function EvacuationPlannerPage() {
  const zones    = useMemo(() => getAllZones(), []);
  const shelters = useMemo(() => getAllShelters(), []);

  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones[0]?.id ?? '');
  const [evacuationRate, setEvacuationRate] = useState(0.8);
  const [windSpeed,      setWindSpeed]      = useState(220);
  const [stormSurge,     setStormSurge]     = useState(4.2);
  const [plan,           setPlan]           = useState<EvacuationPlan | null>(null);
  const [isGenerating,   setIsGenerating]   = useState(false);
  const [showScenario,   setShowScenario]   = useState(false);
  const [mapLayer,       setMapLayer]       = useState<'routes' | 'roads' | 'shelters'>('routes');

  // Map refs
  const mapRef          = useRef<HTMLDivElement>(null);
  const mapInstanceRef  = useRef<L.Map | null>(null);
  const layerGroupRef   = useRef<L.LayerGroup | null>(null);

  const selectedZone = useMemo(() => zones.find(z => z.id === selectedZoneId), [zones, selectedZoneId]);

  // Generate plan
  const generate = useCallback(() => {
    setIsGenerating(true);
    setTimeout(() => {
      const p = generateEvacuationPlan(selectedZoneId, evacuationRate, windSpeed, stormSurge);
      setPlan(p);
      setIsGenerating(false);
    }, 400);
  }, [selectedZoneId, evacuationRate, windSpeed, stormSurge]);

  // Auto-generate on mount / zone change
  useEffect(() => {
    generate();
  }, [selectedZoneId]);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, { center: [19.9, 85.8], zoom: 7, zoomControl: false, attributionControl: false });
    mapInstanceRef.current = map;
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16 }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    layerGroupRef.current = L.layerGroup().addTo(map);
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(mapRef.current);
    return () => { ro.disconnect(); map.remove(); mapInstanceRef.current = null; };
  }, []);

  // Update map layers
  useEffect(() => {
    if (!layerGroupRef.current || !mapInstanceRef.current) return;
    layerGroupRef.current.clearLayers();
    const lg = layerGroupRef.current;
    const nodes = getAllNodes();
    const edges = getScenarioEdges(windSpeed, stormSurge);
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    if (mapLayer === 'roads' || mapLayer === 'routes') {
      // Draw all road edges with risk colours
      for (const edge of edges) {
        const from = nodeMap.get(edge.from);
        const to   = nodeMap.get(edge.to);
        if (!from || !to) continue;
        const color  = edge.is_blocked ? '#6b7280' : EVAC_RISK_COLORS[edge.risk_level] ?? '#64748b';
        const weight = edge.is_blocked ? 2 : (edge.risk_level === 'critical' ? 4 : edge.risk_level === 'high' ? 3 : 2);
        const dash   = edge.is_blocked ? '6,4' : (edge.risk_level === 'critical' ? '8,4' : undefined);
        const pl = L.polyline([[from.lat, from.lng], [to.lat, to.lng]], {
          color, weight, opacity: 0.65, dashArray: dash,
        }).addTo(lg);
        pl.bindTooltip(
          `<div style="font-size:10px;color:#e2eaf4;font-family:Inter,sans-serif">
            <strong>${edge.road_name}</strong><br/>
            Risk: <span style="color:${color};font-weight:700;text-transform:uppercase">${edge.risk_level}</span>
            · ${edge.distance_km} km · ${edge.speed_kmh} km/h
            ${edge.is_blocked ? '<br/><span style="color:#ef4444">⚠ BLOCKED</span>' : ''}
          </div>`,
          { sticky: true }
        );
      }
    }

    // Draw evacuation route polylines (thick, highlighted)
    if (mapLayer === 'routes' && plan) {
      plan.routes.forEach((route, ri) => {
        if (route.path_coords.length < 2) return;
        const color = EVAC_RISK_COLORS[route.route_risk] ?? '#00d4ff';
        // Glow outer
        L.polyline(route.path_coords, { color: '#ffffff', weight: 7, opacity: 0.08 }).addTo(lg);
        const pl = L.polyline(route.path_coords, { color, weight: 4, opacity: 0.9 }).addTo(lg);
        pl.bindTooltip(
          `<div style="font-size:10px;font-family:Inter,sans-serif;color:#e2eaf4;min-width:180px">
            <p style="font-weight:700;margin-bottom:4px">Route ${ri + 1}: ${route.from_zone_name} → ${route.to_shelter_name}</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;font-size:10px">
              <span style="color:#94a3b8">Distance</span><span style="font-family:monospace;font-weight:700">${route.total_distance_km} km</span>
              <span style="color:#94a3b8">Est. Time</span><span style="font-family:monospace;font-weight:700">${route.estimated_time_min} min</span>
              <span style="color:#94a3b8">Route Risk</span><span style="color:${color};font-weight:700;text-transform:uppercase">${route.route_risk}</span>
            </div>
          </div>`,
          { sticky: false }
        );
      });
    }

    // Shelter markers
    for (const s of shelters) {
      const alloc = plan?.allocations.find(a => a.shelter_id === s.id);
      const isUsed = !!alloc && alloc.allocated > 0;
      const fillPct = Math.round(((s.currentOccupancy + (alloc?.allocated ?? 0)) / s.capacity) * 100);
      const color = isUsed ? '#00d4ff' : '#4a6278';
      const m = L.circleMarker([s.lat, s.lng], {
        radius: isUsed ? 10 : 6,
        fillColor: color, color: '#ffffff', weight: 2, fillOpacity: isUsed ? 0.9 : 0.5, opacity: 0.9,
      }).addTo(lg);
      m.bindTooltip(
        `<div style="font-size:10px;font-family:Inter,sans-serif;color:#e2eaf4;min-width:180px">
          <p style="font-weight:700;margin-bottom:4px">${s.name}</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px">
            <span style="color:#94a3b8">Capacity</span><span style="font-family:monospace;font-weight:700">${s.capacity.toLocaleString()}</span>
            <span style="color:#94a3b8">Available</span><span style="font-family:monospace;font-weight:700;color:#22c55e">${s.available.toLocaleString()}</span>
            ${isUsed ? `<span style="color:#94a3b8">Allocated</span><span style="font-family:monospace;font-weight:700;color:#00d4ff">${alloc!.allocated.toLocaleString()}</span>` : ''}
            <span style="color:#94a3b8">Fill After</span><span style="font-family:monospace;font-weight:700;color:${fillPct >= 90 ? '#ef4444' : fillPct >= 70 ? '#f59e0b' : '#22c55e'}">${fillPct}%</span>
          </div>
        </div>`,
        { sticky: true }
      );
    }

    // Zone centroid markers
    if (selectedZone) {
      const [lat, lng] = selectedZone.centroid;
      const color = SEV_COLOR[selectedZone.severity] ?? '#f59e0b';
      const m = L.circleMarker([lat, lng], {
        radius: 14, fillColor: color, color: '#ffffff', weight: 2.5, fillOpacity: 0.3, opacity: 0.9,
      }).addTo(lg);
      m.bindTooltip(`<strong style="color:${color}">${selectedZone.name}</strong><br/>Population: ${selectedZone.population.toLocaleString()}`, { sticky: true });

      // Fit bounds to selected zone + routes
      if (plan && plan.routes.length > 0) {
        const allCoords: [number, number][] = [[lat, lng]];
        plan.routes.forEach(r => allCoords.push(...r.path_coords));
        shelters.forEach(s => { if (plan.allocations.find(a => a.shelter_id === s.id)) allCoords.push([s.lat, s.lng]); });
        if (allCoords.length > 1) {
          mapInstanceRef.current?.fitBounds(L.latLngBounds(allCoords).pad(0.15), { maxZoom: 9 });
        }
      }
    }

  }, [plan, shelters, mapLayer, windSpeed, stormSurge, selectedZone]);

  // Stats
  const stats = useMemo(() => {
    if (!plan) return null;
    const totalRoutes     = plan.routes.length;
    const safeRoutes      = plan.routes.filter(r => r.route_risk === 'safe' || r.route_risk === 'medium').length;
    const unsafeRoutes    = plan.routes.filter(r => r.route_risk === 'high' || r.route_risk === 'critical').length;
    const blockedRoutes   = plan.routes.filter(r => r.route_risk === 'blocked').length;
    const avgTime         = totalRoutes > 0 ? Math.round(plan.routes.reduce((s, r) => s + r.estimated_time_min, 0) / totalRoutes) : 0;
    const avgDist         = totalRoutes > 0 ? Math.round(plan.routes.reduce((s, r) => s + r.total_distance_km, 0) / totalRoutes * 10) / 10 : 0;
    return { totalRoutes, safeRoutes, unsafeRoutes, blockedRoutes, avgTime, avgDist };
  }, [plan]);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-[#050a10]">
      <div className="p-5 space-y-5 max-w-[1800px] mx-auto">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
              <Navigation size={20} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight">Evacuation Planner</h1>
              <p className="text-[11px] text-[#4a6278]">Phase 7 · Graph-routing engine · Odisha Coastal Districts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-1.5 rounded-lg border bg-amber-500/10 border-amber-500/30 text-amber-400 uppercase tracking-widest">
              <AlertTriangle size={11} /> SIMULATED DEMO
            </span>
            <span className="flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-1.5 rounded-lg border bg-slate-700/30 border-slate-600/30 text-slate-300 uppercase tracking-widest">
              Dijkstra Routing
            </span>
          </div>
        </div>

        {/* Demo Notice */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-950/20 border border-amber-500/20">
          <AlertTriangle size={14} className="text-amber-400 shrink-0" />
          <p className="text-[11px] text-slate-400">
            Routes are computed on a <strong className="text-amber-300">synthetic demo road graph</strong>. Distances and travel times are estimates only.
            <strong className="text-rose-300"> Do not use for real emergency operations.</strong>
          </p>
        </div>

        {/* ── Control Row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-4">
          {/* Zone selector */}
          <div className="col-span-12 lg:col-span-4 p-4 rounded-2xl bg-[#0b131e] border border-[#1e2d3d]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Select High-Risk Zone
            </label>
            <div className="space-y-1.5">
              {zones.map(z => (
                <button
                  key={z.id}
                  id={`zone-btn-${z.id}`}
                  onClick={() => setSelectedZoneId(z.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                    selectedZoneId === z.id
                      ? 'border-cyan-500/40 bg-cyan-500/10'
                      : 'border-[#1e2d3d] bg-[#080d14] hover:border-[#2a3d52]'
                  }`}
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: SEV_COLOR[z.severity] ?? '#f59e0b' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{z.name}</p>
                    <p className="text-[9px] text-slate-400">{fmt(z.population)} pop · {z.area_km2} km²</p>
                  </div>
                  <SeverityBadge sev={z.severity} />
                </button>
              ))}
            </div>
          </div>

          {/* Zone detail card + controls */}
          <div className="col-span-12 lg:col-span-8 space-y-3">
            {/* Zone detail */}
            {selectedZone && (
              <div className="p-4 rounded-2xl bg-[#0b131e] border border-[#1e2d3d]">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} style={{ color: SEV_COLOR[selectedZone.severity] }} />
                      <h2 className="text-base font-black text-white">{selectedZone.name}</h2>
                      <SeverityBadge sev={selectedZone.severity} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">District HQ: {selectedZone.districtHq} · Elevation: {selectedZone.elevation_m}m ASL</p>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-1 rounded bg-[#0d1622] border border-[#1e2d3d] text-slate-400">{selectedZone.id}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="p-3 rounded-xl bg-[#070d15] border border-[#1e2d3d] text-center">
                    <p className="text-[9px] text-slate-400">Total Population</p>
                    <p className="text-lg font-black font-mono text-white">{fmt(selectedZone.population)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#070d15] border border-[#1e2d3d] text-center">
                    <p className="text-[9px] text-slate-400">Area</p>
                    <p className="text-lg font-black font-mono text-white">{selectedZone.area_km2}<span className="text-xs font-normal text-slate-400"> km²</span></p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#070d15] border border-[#1e2d3d] text-center">
                    <p className="text-[9px] text-slate-400">To Evacuate ({Math.round(evacuationRate * 100)}%)</p>
                    <p className="text-lg font-black font-mono text-cyan-400">{fmt(Math.round(selectedZone.population * evacuationRate))}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedZone.riskFactors.map((rf, i) => (
                    <span key={i} className="text-[9px] px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">{rf}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Scenario / controls */}
            <div className="rounded-xl bg-[#0b131e] border border-[#1e2d3d]">
              <button
                onClick={() => setShowScenario(!showScenario)}
                className="w-full flex items-center justify-between p-3.5"
              >
                <div className="flex items-center gap-2">
                  <Layers size={13} className="text-cyan-400" />
                  <span className="text-sm font-bold text-white">Scenario & Route Parameters</span>
                </div>
                {showScenario ? <ChevronDown size={13} className="text-slate-400" /> : <ChevronRight size={13} className="text-slate-400" />}
              </button>

              {showScenario && (
                <div className="px-4 pb-4 border-t border-[#1e2d3d] pt-3 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Evacuation Rate */}
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <label className="font-semibold text-slate-200">Evacuation Rate</label>
                        <span className="font-mono text-cyan-400 font-bold">{Math.round(evacuationRate * 100)}%</span>
                      </div>
                      <input type="range" min={0.3} max={1.0} step={0.05} value={evacuationRate}
                        onChange={e => setEvacuationRate(Number(e.target.value))}
                        className="w-full accent-cyan-400 h-1.5 rounded cursor-pointer" />
                    </div>
                    {/* Wind Speed */}
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <label className="font-semibold text-slate-200">Wind Speed</label>
                        <span className="font-mono text-amber-400 font-bold">{windSpeed} km/h</span>
                      </div>
                      <input type="range" min={90} max={260} step={5} value={windSpeed}
                        onChange={e => setWindSpeed(Number(e.target.value))}
                        className="w-full accent-amber-400 h-1.5 rounded cursor-pointer" />
                    </div>
                    {/* Storm Surge */}
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <label className="font-semibold text-slate-200">Storm Surge</label>
                        <span className="font-mono text-rose-400 font-bold">{stormSurge.toFixed(1)} m</span>
                      </div>
                      <input type="range" min={0} max={5} step={0.1} value={stormSurge}
                        onChange={e => setStormSurge(Number(e.target.value))}
                        className="w-full accent-rose-400 h-1.5 rounded cursor-pointer" />
                    </div>
                    {/* Generate button */}
                    <div className="flex items-end gap-2">
                      <button
                        id="evac-generate-btn"
                        onClick={generate}
                        disabled={isGenerating}
                        className="flex-1 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                      >
                        {isGenerating ? 'Routing…' : 'Generate Plan'}
                      </button>
                      <button
                        onClick={() => { setWindSpeed(220); setStormSurge(4.2); setEvacuationRate(0.8); }}
                        className="p-2 rounded-xl border border-[#1e2d3d] text-slate-400 hover:text-white"
                      >
                        <RotateCcw size={13} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[9px] text-amber-400 font-semibold">Road conditions update dynamically based on scenario parameters.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Main Layout: Map + Plan ────────────────────────────────────── */}
        {plan && (
          <>
            {/* Summary KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'To Evacuate',     value: fmt(plan.total_to_evacuate), color: 'text-cyan-400',    icon: <Users size={13} /> },
                { label: 'Allocated',        value: fmt(plan.total_allocated),   color: 'text-emerald-400', icon: <CheckCircle2 size={13} /> },
                { label: 'Unallocated',      value: fmt(plan.total_unallocated), color: plan.total_unallocated > 0 ? 'text-rose-400' : 'text-slate-400', icon: <XCircle size={13} /> },
                { label: 'Shelters Used',    value: `${plan.allocations.length}`, color: 'text-blue-400',   icon: <Home size={13} /> },
                { label: 'Routes Generated', value: `${plan.routes.length}`,      color: 'text-purple-400', icon: <Route size={13} /> },
              ].map(({ label, value, color, icon }) => (
                <div key={label} className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#0b131e] border border-[#1e2d3d]">
                  <div className={`shrink-0 ${color}`}>{icon}</div>
                  <div>
                    <p className={`text-lg font-black font-mono ${color}`}>{value}</p>
                    <p className="text-[9px] text-slate-400 uppercase">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Capacity validation banner */}
            {plan.capacity_satisfied ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <p className="text-[11px] text-emerald-300 font-semibold">
                  Capacity validated — all {fmt(plan.total_to_evacuate)} evacuees can be accommodated across {plan.allocations.length} shelter(s). No overflow.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                <XCircle size={14} className="text-rose-400 shrink-0" />
                <p className="text-[11px] text-rose-300 font-semibold">
                  Capacity warning — {fmt(plan.total_unallocated)} persons cannot be accommodated in nearby shelters. Consider adding more shelters or reducing evacuation radius.
                </p>
              </div>
            )}

            <div className="grid grid-cols-12 gap-5">
              {/* Map */}
              <div className="col-span-12 lg:col-span-7">
                <div className="rounded-2xl bg-[#0b131e] border border-[#1e2d3d] overflow-hidden shadow-xl">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2d3d]">
                    <div className="flex items-center gap-2">
                      <Route size={14} className="text-emerald-400" />
                      <h2 className="text-sm font-bold text-white">Evacuation Route Map</h2>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">SIMULATED</span>
                    </div>
                    {/* Layer switcher */}
                    <div className="flex items-center gap-1">
                      {(['routes', 'roads', 'shelters'] as const).map(l => (
                        <button
                          key={l}
                          onClick={() => setMapLayer(l)}
                          className={`text-[9px] font-bold px-2 py-1 rounded transition-all capitalize ${
                            mapLayer === l
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div ref={mapRef} className="h-[420px]" />
                  {/* Map legend */}
                  <div className="px-4 py-2.5 border-t border-[#1e2d3d] bg-[#080d14] flex items-center gap-4 flex-wrap">
                    {Object.entries(EVAC_RISK_COLORS).map(([label, color]) => (
                      <span key={label} className="flex items-center gap-1.5 text-[9px] text-slate-400">
                        <span className="w-8 h-1 rounded-full inline-block" style={{ backgroundColor: color }} />
                        {label === 'blocked' ? 'Blocked' : `${label.charAt(0).toUpperCase() + label.slice(1)} risk`}
                      </span>
                    ))}
                    <span className="text-[9px] text-slate-600 ml-auto font-mono">Cyan circles = active shelters</span>
                  </div>
                </div>

                {/* Road risk table */}
                <div className="mt-4 p-4 rounded-2xl bg-[#0b131e] border border-[#1e2d3d]">
                  <div className="flex items-center gap-2 mb-3">
                    <Layers size={13} className="text-cyan-400" />
                    <h3 className="text-sm font-bold text-white">Road Conditions (Scenario)</h3>
                    <span className="text-[9px] text-amber-300 font-semibold ml-auto">Wind {windSpeed} km/h · Surge {stormSurge}m</span>
                  </div>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                    {getScenarioEdges(windSpeed, stormSurge).map(edge => (
                      <div key={edge.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-[#080d14] border border-[#1e2d3d]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: edge.is_blocked ? '#6b7280' : EVAC_RISK_COLORS[edge.risk_level] }}
                          />
                          <span className="text-[10px] text-slate-300 truncate">{edge.road_name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-[9px] font-mono text-slate-400">{edge.distance_km} km</span>
                          <span className="text-[9px] font-mono text-slate-500">{edge.speed_kmh} km/h</span>
                          {edge.is_blocked
                            ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400 border border-slate-600/30">BLOCKED</span>
                            : <RouteRiskBadge risk={edge.risk_level} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right panel: Evacuation Plan */}
              <div className="col-span-12 lg:col-span-5 space-y-4">
                {/* Summary box */}
                <div className="p-4 rounded-2xl bg-[#0b131e] border border-[#1e2d3d]">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 size={13} className="text-cyan-400" />
                    <h3 className="text-sm font-bold text-white">Evacuation Summary</h3>
                    <span className="text-[9px] text-slate-400 ml-auto font-mono">PHASE 7</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[11px] py-1 border-b border-[#1e2d3d]">
                      <span className="text-slate-400">Zone</span>
                      <span className="font-semibold text-white">{plan.zone_name}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] py-1 border-b border-[#1e2d3d]">
                      <span className="text-slate-400">Total Population</span>
                      <span className="font-mono font-bold text-white">{fmt(plan.zone_population)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] py-1 border-b border-[#1e2d3d]">
                      <span className="text-slate-400">Evacuation Rate</span>
                      <span className="font-mono font-bold text-cyan-400">{Math.round(plan.evacuation_rate * 100)}%</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] py-1 border-b border-[#1e2d3d]">
                      <span className="text-slate-400">To Evacuate</span>
                      <span className="font-mono font-bold text-white">{fmt(plan.total_to_evacuate)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] py-1 border-b border-[#1e2d3d]">
                      <span className="text-slate-400">Total Allocated</span>
                      <span className="font-mono font-bold text-emerald-400">{fmt(plan.total_allocated)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] py-1 border-b border-[#1e2d3d]">
                      <span className="text-slate-400">Unallocated</span>
                      <span className={`font-mono font-bold ${plan.total_unallocated > 0 ? 'text-rose-400' : 'text-slate-400'}`}>{fmt(plan.total_unallocated)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] py-1">
                      <span className="text-slate-400">Capacity Status</span>
                      <span className={`font-bold text-[10px] px-2 py-0.5 rounded border ${plan.capacity_satisfied ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-rose-400 border-rose-500/30 bg-rose-500/10'}`}>
                        {plan.capacity_satisfied ? '✓ SATISFIED' : '⚠ OVERFLOW'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Route stats */}
                {stats && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Safe Routes',   value: stats.safeRoutes,   color: 'text-emerald-400' },
                      { label: 'Unsafe Routes', value: stats.unsafeRoutes, color: 'text-orange-400'  },
                      { label: 'Avg Time',      value: `${stats.avgTime}m`, color: 'text-cyan-400'   },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="p-3 rounded-xl bg-[#0b131e] border border-[#1e2d3d] text-center">
                        <p className={`text-xl font-black font-mono ${color}`}>{value}</p>
                        <p className="text-[9px] text-slate-400">{label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Shelter allocations */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Home size={13} className="text-cyan-400" />
                    <h3 className="text-sm font-bold text-white">Shelter Allocation</h3>
                    <span className="text-[9px] text-slate-400">· {plan.allocations.length} shelters</span>
                  </div>
                  <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                    {plan.allocations.length === 0 ? (
                      <div className="p-4 rounded-xl bg-[#080d14] border border-[#1e2d3d] text-center">
                        <p className="text-sm text-slate-400">No shelters reachable from this zone under current scenario.</p>
                      </div>
                    ) : (
                      plan.allocations.map((alloc, i) => (
                        <ShelterCard key={alloc.shelter_id} alloc={alloc} index={i} />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── All-Shelters Table ──────────────────────────────────────── */}
            <div className="p-4 rounded-2xl bg-[#0b131e] border border-[#1e2d3d]">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={13} className="text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Candidate Shelter Inventory</h3>
                <span className="text-[9px] text-slate-400">· {shelters.length} shelters total</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[9px] text-[#4a6278] uppercase tracking-wider border-b border-[#1e2d3d]">
                      <th className="pb-2 text-left pr-3">ID</th>
                      <th className="pb-2 text-left pr-3">Name</th>
                      <th className="pb-2 text-center pr-3">Risk</th>
                      <th className="pb-2 text-right pr-3">Capacity</th>
                      <th className="pb-2 text-right pr-3">Occupied</th>
                      <th className="pb-2 text-right pr-3">Available</th>
                      <th className="pb-2 text-right pr-3">Allocated</th>
                      <th className="pb-2 text-right pr-3">After Fill%</th>
                      <th className="pb-2 text-center">Amenities</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shelters.map(s => {
                      const alloc  = plan.allocations.find(a => a.shelter_id === s.id);
                      const filled = alloc ? alloc.allocated : 0;
                      const fillPct = Math.round(((s.currentOccupancy + filled) / s.capacity) * 100);
                      const isUsed = filled > 0;
                      return (
                        <tr key={s.id} className={`border-t border-[#1e2d3d] hover:bg-[#101c2b]/50 ${isUsed ? 'bg-cyan-500/3' : ''}`}>
                          <td className="py-2 pr-3 font-mono text-[10px] text-slate-400">{s.id}</td>
                          <td className="py-2 pr-3 font-medium text-[11px] text-white max-w-[160px] truncate">{s.name}</td>
                          <td className="py-2 pr-3 text-center"><SeverityBadge sev={s.riskLevel} /></td>
                          <td className="py-2 pr-3 text-right font-mono text-[11px] text-slate-200">{s.capacity.toLocaleString()}</td>
                          <td className="py-2 pr-3 text-right font-mono text-[11px] text-slate-400">{s.currentOccupancy.toLocaleString()}</td>
                          <td className="py-2 pr-3 text-right font-mono text-[11px] text-emerald-400">{s.available.toLocaleString()}</td>
                          <td className={`py-2 pr-3 text-right font-mono font-bold text-[11px] ${isUsed ? 'text-cyan-400' : 'text-slate-600'}`}>
                            {filled > 0 ? `+${filled.toLocaleString()}` : '—'}
                          </td>
                          <td className="py-2 pr-3 text-right">
                            <span className={`text-[10px] font-bold font-mono ${fillPct >= 90 ? 'text-rose-400' : fillPct >= 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {fillPct}%
                            </span>
                          </td>
                          <td className="py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {s.hasWater   && <span title="Water"   className="text-[8px] px-1 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/20">💧</span>}
                              {s.hasMedical && <span title="Medical" className="text-[8px] px-1 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/20">🏥</span>}
                              {s.hasPower   && <span title="Power"   className="text-[8px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/20">⚡</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#1e2d3d]">
                      <td colSpan={3} className="pt-2 text-[9px] text-slate-500 font-bold">TOTALS</td>
                      <td className="pt-2 text-right font-mono font-bold text-[11px] text-white">{shelters.reduce((s, sh) => s + sh.capacity, 0).toLocaleString()}</td>
                      <td className="pt-2 text-right font-mono font-bold text-[11px] text-slate-400">{shelters.reduce((s, sh) => s + sh.currentOccupancy, 0).toLocaleString()}</td>
                      <td className="pt-2 text-right font-mono font-bold text-[11px] text-emerald-400">{shelters.reduce((s, sh) => s + sh.available, 0).toLocaleString()}</td>
                      <td className="pt-2 text-right font-mono font-bold text-[11px] text-cyan-400">+{fmt(plan.total_allocated)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Footer notice */}
        <div className="py-3 text-center">
          <p className="text-[9px] text-[#2a3d52] font-mono">
            SIMULATED DEMO DATA — Phase 7 · CycloneGuard AI · Dijkstra routing on synthetic road graph · Do not use for real emergency operations
          </p>
        </div>

      </div>
    </div>
  );
}
