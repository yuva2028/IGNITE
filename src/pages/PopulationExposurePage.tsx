/**
 * CycloneGuard AI -- Population Exposure Page (Phase 6)
 *
 * DATA NOTICE: All population figures are SIMULATED DEMO DATA calibrated to
 * approximate Odisha coastal district profiles. Not based on real census data.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Users, AlertTriangle, TrendingUp, TrendingDown, MapPin,
  ChevronDown, ChevronUp, BarChart3, RotateCcw, Layers, Activity, Grid3x3,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, Sector,
} from 'recharts';
import L from 'leaflet';
import type {
  PopulationGridCell,
  PopulationGridSummary,
  PopulationZoneBreakdown,
} from '../types';
import {
  getBaselineGrid,
  getBaselineSummary,
  computeSummary,
  computeZoneBreakdowns,
  applyScenario,
  buildBarChartData,
} from '../services/populationService';

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ── Constants ────────────────────────────────────────────────────────────────
const SEV_HEX: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#f59e0b',
  low:      '#22c55e',
};

const SEV_BG: Record<string, string> = {
  critical: 'bg-red-500/10 border-red-500/25 text-red-400',
  high:     'bg-orange-500/10 border-orange-500/25 text-orange-400',
  medium:   'bg-amber-500/10 border-amber-500/25 text-amber-400',
  low:      'bg-green-500/10 border-green-500/25 text-green-400',
};

const PIE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#22c55e'];

const TIERS = [
  { key: 'critical' as const, pctKey: 'criticalPct' as const, cellsKey: 'criticalCells' as const,
    label: 'Critical', color: '#ef4444', textCls: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/5' },
  { key: 'high'     as const, pctKey: 'highPct'     as const, cellsKey: 'highCells'     as const,
    label: 'High',     color: '#f97316', textCls: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/5' },
  { key: 'medium'   as const, pctKey: 'mediumPct'   as const, cellsKey: 'mediumCells'   as const,
    label: 'Medium',   color: '#f59e0b', textCls: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/5' },
  { key: 'low'      as const, pctKey: 'lowPct'      as const, cellsKey: 'lowCells'      as const,
    label: 'Low',      color: '#22c55e', textCls: 'text-green-400', border: 'border-green-500/30', bg: 'bg-green-500/5' },
];

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ── Active Pie Shape ─────────────────────────────────────────────────────────
function ActivePieShape(props: {
  cx: number; cy: number; innerRadius: number; outerRadius: number;
  startAngle: number; endAngle: number; fill: string;
  payload: { name: string }; percent: number; value: number;
}) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#e2eaf4" fontSize={12} fontWeight={700}>{payload.name}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill={fill} fontSize={14} fontWeight={900}>{fmt(value)}</text>
      <text x={cx} y={cy + 28} textAnchor="middle" fill="#8fa3b8" fontSize={10}>{(percent * 100).toFixed(1)}%</text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 10} outerRadius={outerRadius + 12} startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
}

// ── Zone Table Row ────────────────────────────────────────────────────────────
function ZoneRow({ z, total }: { z: PopulationZoneBreakdown; total: number }) {
  const barWidth = Math.round((z.population / total) * 100);
  const color    = SEV_HEX[z.severity] || '#64748b';
  const badgeCls = SEV_BG[z.severity] || 'bg-slate-800 border-slate-700 text-slate-300';
  return (
    <tr className="border-t border-[#1e2d3d] hover:bg-[#101c2b]/50 transition-colors">
      <td className="py-2.5 pr-2 pl-1 text-xs font-medium text-[#e2eaf4] max-w-[160px] truncate">{z.zone_name}</td>
      <td className="py-2.5 pr-2">
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${badgeCls}`}>{z.severity}</span>
      </td>
      <td className="py-2.5 pr-2 font-mono text-sm font-bold text-white whitespace-nowrap">{fmt(z.population)}</td>
      <td className="py-2.5 pr-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-[#0f1a25] overflow-hidden min-w-[60px]">
            <div className="h-full rounded-full" style={{ width: `${barWidth}%`, backgroundColor: color }} />
          </div>
          <span className="text-[10px] font-mono text-[#8fa3b8] w-8 text-right">{z.pct_of_total}%</span>
        </div>
      </td>
      <td className="py-2.5 pr-2 text-[10px] font-mono text-center">
        <span style={{ color }}>{z.avg_risk_score}</span>
        <span className="text-[#4a6278]">/{z.max_risk_score}</span>
      </td>
      <td className="py-2.5 text-[10px] text-center text-[#8fa3b8]">{z.cell_count}</td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PopulationExposurePage() {
  const [cells,    setCells]    = useState<PopulationGridCell[]>(getBaselineGrid());
  const [summary,  setSummary]  = useState<PopulationGridSummary>(getBaselineSummary());
  const [zones,    setZones]    = useState<PopulationZoneBreakdown[]>([]);

  // scenario
  const [windSpeed,    setWindSpeed]    = useState(220);
  const [rainfall,     setRainfall]     = useState(284);
  const [stormSurge,   setStormSurge]   = useState(4.2);
  const [trackOffset,  setTrackOffset]  = useState(0);
  const [isScenario,   setIsScenario]   = useState(false);
  const [showControls, setShowControls] = useState(false);

  // chart
  const [activePieIndex, setActivePieIndex] = useState(0);
  const [sortDesc,       setSortDesc]       = useState(true);

  // map refs
  const mapRef         = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const dotLayerRef    = useRef<L.LayerGroup | null>(null);

  // Recompute summary & zones whenever cells change
  useEffect(() => {
    const s = computeSummary(cells);
    setSummary(s);
    setZones(computeZoneBreakdowns(cells, s.total));
  }, [cells]);

  const handleApplyScenario = useCallback(() => {
    setCells(applyScenario(windSpeed, rainfall, stormSurge, trackOffset));
    setIsScenario(true);
  }, [windSpeed, rainfall, stormSurge, trackOffset]);

  const handleReset = useCallback(() => {
    setCells(getBaselineGrid());
    setIsScenario(false);
    setWindSpeed(220); setRainfall(284); setStormSurge(4.2); setTrackOffset(0);
  }, []);

  const pieData = useMemo(() => [
    { name: 'Critical', value: summary.critical },
    { name: 'High',     value: summary.high     },
    { name: 'Medium',   value: summary.medium   },
    { name: 'Low',      value: summary.low      },
  ], [summary]);

  const barData   = useMemo(() => buildBarChartData(cells), [cells]);
  const sortedZones = useMemo(() =>
    [...zones].sort((a, b) => sortDesc ? b.population - a.population : a.population - b.population),
  [zones, sortDesc]);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, { center: [19.8, 85.8], zoom: 7, zoomControl: false, attributionControl: false });
    mapInstanceRef.current = map;
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16 }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    dotLayerRef.current = L.layerGroup().addTo(map);
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(mapRef.current);
    return () => { ro.disconnect(); map.remove(); mapInstanceRef.current = null; };
  }, []);

  // Update dot markers
  useEffect(() => {
    if (!dotLayerRef.current) return;
    dotLayerRef.current.clearLayers();
    cells.forEach(cell => {
      const color  = SEV_HEX[cell.risk_category] || '#64748b';
      const radius = Math.max(5, Math.min(22, Math.log10(cell.population + 1) * 5));
      const m = L.circleMarker([cell.lat, cell.lng], {
        radius, fillColor: color, color: '#ffffff', weight: 1.5, fillOpacity: 0.75, opacity: 0.9,
      });
      m.bindTooltip(
        `<div style="font-family:Inter,sans-serif;font-size:11px;color:#e2eaf4;min-width:160px">
          <p style="font-weight:700;margin-bottom:4px">${cell.name}</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;font-size:10px">
            <span style="color:#94a3b8">Population</span>
            <span style="font-weight:700;color:#fff;font-family:monospace">${cell.population.toLocaleString()}</span>
            <span style="color:#94a3b8">Risk Score</span>
            <span style="font-weight:700;color:${color};font-family:monospace">${cell.risk_score}/100</span>
            <span style="color:#94a3b8">Category</span>
            <span style="font-weight:700;color:${color};text-transform:uppercase;font-size:9px">${cell.risk_category}</span>
            <span style="color:#94a3b8">Elevation</span>
            <span style="font-family:monospace">${cell.elevation_m} m ASL</span>
          </div>
        </div>`,
        { sticky: true }
      );
      m.addTo(dotLayerRef.current!);
    });
  }, [cells]);

  const baseline = useMemo(() => getBaselineSummary(), []);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-[#050a10]">
      <div className="p-5 space-y-5 max-w-[1600px] mx-auto">

        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-500/30">
              <Users size={20} className="text-pink-400" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight">Population Exposure</h1>
              <p className="text-[11px] text-[#4a6278]">Phase 6 · 46-cell geographic grid · Odisha Coastal Districts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-1.5 rounded-lg border bg-amber-500/10 border-amber-500/30 text-amber-400 uppercase tracking-widest">
              <AlertTriangle size={11} /> SIMULATED DEMO DATA
            </span>
            {isScenario && (
              <span className="text-[9px] font-bold px-2.5 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 uppercase tracking-widest">
                SCENARIO ACTIVE
              </span>
            )}
          </div>
        </div>

        {/* Demo Notice */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-amber-950/20 border border-amber-500/20">
          <div className="flex items-center gap-3">
            <AlertTriangle size={14} className="text-amber-400 shrink-0" />
            <p className="text-[11px] text-slate-400">
              Population figures are synthetic estimates calibrated to Odisha coastal district profiles.
              Not based on real census, survey, or official demographic data.
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#0d1622] border border-[#1e2d3d] text-slate-400 shrink-0 ml-3">
            {cells.length} grid cells
          </span>
        </div>

        {/* ── Summary Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-3">
          {/* Total */}
          <div
            id="pop-total-card"
            className="flex flex-col gap-3 p-5 rounded-2xl bg-gradient-to-br from-[#0f1a25] to-[#091422] border border-cyan-500/25 shadow-lg shadow-cyan-500/5"
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/25">
                <Users size={14} className="text-cyan-400" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-400">Total Exposed</span>
            </div>
            <div>
              <div className="text-3xl font-black font-mono tracking-tight text-white">{fmt(summary.total)}</div>
              {isScenario && (
                <div className="flex items-center gap-1 text-[10px] mt-1">
                  {summary.total > baseline.total
                    ? <TrendingUp size={10} className="text-rose-400" />
                    : <TrendingDown size={10} className="text-green-400" />}
                  <span className={summary.total > baseline.total ? 'text-rose-400' : 'text-green-400'}>
                    {summary.total > baseline.total ? '+' : ''}{fmt(summary.total - baseline.total)} vs baseline
                  </span>
                </div>
              )}
            </div>
            <p className="text-[9px] text-[#4a6278]">
              {cells.length} cells · {summary.criticalCells + summary.highCells} at high/critical risk
            </p>
          </div>

          {/* Per-Tier Cards */}
          {TIERS.map(t => {
            const delta = isScenario ? summary[t.key] - baseline[t.key] : 0;
            return (
              <div
                id={`pop-${t.key}-card`}
                key={t.key}
                className={`flex flex-col gap-3 p-5 rounded-2xl border ${t.border} ${t.bg} transition-all hover:brightness-110`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-bold uppercase tracking-widest ${t.textCls}`}>{t.label} Risk</span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${t.textCls}`} style={{ borderColor: `${t.color}40`, backgroundColor: `${t.color}15` }}>
                    {summary[t.pctKey].toFixed(1)}%
                  </span>
                </div>
                <div>
                  <div className={`text-2xl font-black font-mono tracking-tight ${t.textCls}`}>{fmt(summary[t.key])}</div>
                  {isScenario && delta !== 0 && (
                    <div className={`text-[10px] font-bold mt-1 ${delta > 0 ? 'text-rose-400' : 'text-green-400'}`}>
                      {delta > 0 ? '+' : ''}{fmt(delta)}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="h-1.5 rounded-full bg-[#0d1622] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, summary[t.pctKey])}%`, backgroundColor: t.color }}
                    />
                  </div>
                  <p className="text-[9px] text-[#4a6278]">{summary[t.cellsKey]} cells</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Scenario Controls ──────────────────────────────────────────────── */}
        <div className="rounded-xl bg-[#0b131e] border border-[#1e2d3d]">
          <button
            onClick={() => setShowControls(!showControls)}
            className="w-full flex items-center justify-between p-3.5 text-left"
          >
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-cyan-400" />
              <span className="text-sm font-bold text-white">What-If Scenario Controls</span>
              <span className="text-[10px] text-slate-400">— adjust to dynamically update population exposure</span>
            </div>
            {showControls ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
          </button>

          {showControls && (
            <div className="px-4 pb-4 space-y-4 border-t border-[#1e2d3d] pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Wind Speed */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <label className="font-semibold text-slate-200">Wind Speed</label>
                    <div className="flex items-center bg-[#070d15] border border-[#1e2d3d] rounded px-1.5 py-0.5">
                      <input type="number" min={90} max={260} step={5} value={windSpeed}
                        onChange={e => setWindSpeed(Number(e.target.value))}
                        className="w-10 bg-transparent text-right font-mono text-xs font-bold text-white focus:outline-none" />
                      <span className="text-[10px] text-slate-400 ml-1">km/h</span>
                    </div>
                  </div>
                  <input type="range" min={90} max={260} step={5} value={windSpeed}
                    onChange={e => setWindSpeed(Number(e.target.value))}
                    className="w-full accent-cyan-400 h-2 rounded-lg cursor-pointer" />
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>90</span><span className="text-cyan-400">220 baseline</span><span>260</span>
                  </div>
                </div>
                {/* Rainfall */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <label className="font-semibold text-slate-200">Rainfall (24h)</label>
                    <div className="flex items-center bg-[#070d15] border border-[#1e2d3d] rounded px-1.5 py-0.5">
                      <input type="number" min={100} max={500} step={10} value={rainfall}
                        onChange={e => setRainfall(Number(e.target.value))}
                        className="w-10 bg-transparent text-right font-mono text-xs font-bold text-white focus:outline-none" />
                      <span className="text-[10px] text-slate-400 ml-1">mm</span>
                    </div>
                  </div>
                  <input type="range" min={100} max={500} step={10} value={rainfall}
                    onChange={e => setRainfall(Number(e.target.value))}
                    className="w-full accent-blue-400 h-2 rounded-lg cursor-pointer" />
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>100</span><span className="text-blue-400">284 baseline</span><span>500</span>
                  </div>
                </div>
                {/* Storm Surge */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <label className="font-semibold text-slate-200">Storm Surge</label>
                    <div className="flex items-center bg-[#070d15] border border-[#1e2d3d] rounded px-1.5 py-0.5">
                      <input type="number" min={0} max={5} step={0.1} value={stormSurge}
                        onChange={e => setStormSurge(Number(e.target.value))}
                        className="w-10 bg-transparent text-right font-mono text-xs font-bold text-white focus:outline-none" />
                      <span className="text-[10px] text-slate-400 ml-1">m</span>
                    </div>
                  </div>
                  <input type="range" min={0} max={5} step={0.1} value={stormSurge}
                    onChange={e => setStormSurge(Number(e.target.value))}
                    className="w-full accent-rose-400 h-2 rounded-lg cursor-pointer" />
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>0m</span><span className="text-rose-400">4.2m baseline</span><span>5m</span>
                  </div>
                </div>
                {/* Track Offset */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <label className="font-semibold text-slate-200">Track Offset</label>
                    <div className="flex items-center bg-[#070d15] border border-[#1e2d3d] rounded px-1.5 py-0.5">
                      <input type="number" min={-50} max={50} step={5} value={trackOffset}
                        onChange={e => setTrackOffset(Number(e.target.value))}
                        className="w-10 bg-transparent text-right font-mono text-xs font-bold text-white focus:outline-none" />
                      <span className="text-[10px] text-slate-400 ml-1">km</span>
                    </div>
                  </div>
                  <input type="range" min={-50} max={50} step={5} value={trackOffset}
                    onChange={e => setTrackOffset(Number(e.target.value))}
                    className="w-full accent-amber-400 h-2 rounded-lg cursor-pointer" />
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>-50km</span><span className="text-amber-400">0 baseline</span><span>+50km</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button id="pop-apply-scenario-btn" onClick={handleApplyScenario}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 transition-all">
                  Apply Scenario
                </button>
                <button id="pop-reset-btn" onClick={handleReset}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-xs text-slate-400 hover:text-white bg-[#0b131e] border border-[#1e2d3d] hover:border-[#2a3d52] transition-all">
                  <RotateCcw size={12} /> Reset Baseline
                </button>
                <span className="text-[10px] text-amber-400 font-semibold">SIMULATED — NOT AN OFFICIAL FORECAST</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Main Layout: Map + Charts ──────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-5">
          {/* Left: Map */}
          <div className="col-span-12 lg:col-span-7">
            <div className="rounded-2xl bg-[#0b131e] border border-[#1e2d3d] overflow-hidden shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2d3d]">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-pink-400" />
                  <h2 className="text-sm font-bold text-white">Population Grid Map</h2>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20">
                    {cells.length} CELLS
                  </span>
                  {isScenario && (
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                      SCENARIO
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                  {[
                    { label: 'Critical', color: '#ef4444' },
                    { label: 'High',     color: '#f97316' },
                    { label: 'Medium',   color: '#f59e0b' },
                    { label: 'Low',      color: '#22c55e' },
                  ].map(({ label, color }) => (
                    <span key={label} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <div ref={mapRef} className="h-[420px]" />
              <div className="px-4 py-2 border-t border-[#1e2d3d] bg-[#080d14] flex items-center justify-between">
                <p className="text-[9px] text-[#4a6278] font-mono">Marker size proportional to population · Colour = risk category</p>
                <p className="text-[9px] text-[#4a6278] font-mono">SIMULATED DEMO DATA</p>
              </div>
            </div>
          </div>

          {/* Right: Charts */}
          <div className="col-span-12 lg:col-span-5 space-y-4">
            {/* Donut Pie */}
            <div className="p-4 rounded-2xl bg-[#0b131e] border border-[#1e2d3d] shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <Activity size={14} className="text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Risk Distribution</h3>
                <span className="text-[9px] text-slate-400 ml-auto">{cells.length} cells</span>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={82}
                      dataKey="value"
                      {...({
                        activeIndex: activePieIndex,
                        activeShape: (props: any) => <ActivePieShape {...props} />,
                      } as any)}
                      onMouseEnter={(_, index) => setActivePieIndex(index)}
                    >
                      {pieData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i]} />))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => [fmt(Number(v) || 0), 'Population']}
                      contentStyle={{ background: '#0d1520', border: '1px solid #1e2d3d', borderRadius: 8, fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between px-2 py-1.5 rounded bg-[#080d14] border border-[#1e2d3d]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                      <span className="text-[10px] text-slate-300">{d.name}</span>
                    </div>
                    <span className="text-[10px] font-bold font-mono" style={{ color: PIE_COLORS[i] }}>{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Baseline vs Scenario */}
            {isScenario && (
              <div className="p-4 rounded-2xl bg-[#0b131e] border border-amber-500/25 shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={14} className="text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Baseline vs Scenario</h3>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold ml-auto">SCENARIO ACTIVE</span>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Total Exposed',  b: baseline.total,    s: summary.total,    color: '#00d4ff' },
                    { label: 'Critical-Risk',  b: baseline.critical, s: summary.critical, color: '#ef4444' },
                    { label: 'High-Risk',      b: baseline.high,     s: summary.high,     color: '#f97316' },
                    { label: 'Medium-Risk',    b: baseline.medium,   s: summary.medium,   color: '#f59e0b' },
                    { label: 'Low-Risk',       b: baseline.low,      s: summary.low,      color: '#22c55e' },
                  ].map(({ label, b, s, color }) => {
                    const delta = s - b;
                    const pct   = b > 0 ? Math.round((delta / b) * 100) : 0;
                    return (
                      <div key={label} className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 w-28 shrink-0">{label}</span>
                        <span className="font-mono text-slate-300">{fmt(b)}</span>
                        <span className="text-slate-500 mx-1">→</span>
                        <span className="font-mono font-bold" style={{ color }}>{fmt(s)}</span>
                        <span className={`ml-2 text-[10px] font-bold font-mono ${delta > 0 ? 'text-rose-400' : delta < 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {delta > 0 ? '+' : ''}{pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Bar Chart: Population by Zone ──────────────────────────────────── */}
        <div className="p-4 rounded-2xl bg-[#0b131e] border border-[#1e2d3d] shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={14} className="text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Population by Zone & Risk Category</h3>
            <span className="text-[10px] text-slate-400">Stacked by risk tier</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20 ml-auto">PHASE 6</span>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 64 }} barSize={18} barGap={2}>
                <XAxis
                  dataKey="zone"
                  tick={{ fill: '#4a6278', fontSize: 9, fontFamily: 'Inter' }}
                  axisLine={false} tickLine={false} angle={-38} textAnchor="end" interval={0}
                />
                <YAxis
                  tick={{ fill: '#4a6278', fontSize: 9, fontFamily: 'Inter' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`}
                />
                <Tooltip
                  formatter={(v: any, name: any) => [fmt(Number(v) || 0), String(name || '').charAt(0).toUpperCase() + String(name || '').slice(1)]}
                  contentStyle={{ background: '#0d1520', border: '1px solid #1e2d3d', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#e2eaf4', fontWeight: 700 }}
                  itemStyle={{ color: '#94a3b8' }}
                />
                <Legend wrapperStyle={{ paddingTop: 8, fontSize: 10, color: '#8fa3b8' }}
                  formatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)} />
                <Bar dataKey="critical" stackId="a" fill="#ef4444" fillOpacity={0.85} radius={[0, 0, 0, 0]} />
                <Bar dataKey="high"     stackId="a" fill="#f97316" fillOpacity={0.85} />
                <Bar dataKey="medium"   stackId="a" fill="#f59e0b" fillOpacity={0.85} />
                <Bar dataKey="low"      stackId="a" fill="#22c55e" fillOpacity={0.85} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Zone Detail Table ───────────────────────────────────────────────── */}
        <div className="p-4 rounded-2xl bg-[#0b131e] border border-[#1e2d3d] shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Grid3x3 size={14} className="text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Zone-Level Population Detail</h3>
              <span className="text-[9px] text-slate-400">· {sortedZones.length} zones</span>
            </div>
            <button
              onClick={() => setSortDesc(!sortDesc)}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition-colors"
            >
              {sortDesc ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
              Sort {sortDesc ? '↓ Largest' : '↑ Smallest'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[9px] text-[#4a6278] uppercase tracking-wider">
                  <th className="pb-2 text-left pr-2 pl-1">Zone</th>
                  <th className="pb-2 text-left pr-2">Risk Level</th>
                  <th className="pb-2 text-left pr-2">Population</th>
                  <th className="pb-2 text-left pr-2 min-w-[120px]">Share of Total</th>
                  <th className="pb-2 text-center pr-2">Score avg/max</th>
                  <th className="pb-2 text-center">Cells</th>
                </tr>
              </thead>
              <tbody>
                {sortedZones.map(z => <ZoneRow key={z.zone_id} z={z} total={summary.total} />)}
              </tbody>
            </table>
          </div>
          <div className="mt-4 pt-3 border-t border-[#1e2d3d] flex items-center justify-between">
            <div className="flex items-center gap-4 text-[9px] font-mono text-slate-500">
              <span>Critical: <strong className="text-red-400">{fmt(summary.critical)}</strong></span>
              <span>High: <strong className="text-orange-400">{fmt(summary.high)}</strong></span>
              <span>Medium: <strong className="text-amber-400">{fmt(summary.medium)}</strong></span>
              <span>Low: <strong className="text-green-400">{fmt(summary.low)}</strong></span>
            </div>
            <p className="text-[9px] text-[#4a6278] font-mono">SIMULATED DEMO DATA · Phase 6 · CycloneGuard AI</p>
          </div>
        </div>

      </div>
    </div>
  );
}