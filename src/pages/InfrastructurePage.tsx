/**
 * CycloneGuard AI - Critical Infrastructure Vulnerability Dashboard (Phase 4)
 *
 * Implements multi-hazard vulnerability calculations across 7 asset types:
 * - Power substations
 * - Bridges
 * - Roads
 * - Hospitals
 * - Schools
 * - Shelters
 * - Communication towers
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Landmark,
  Navigation2,
  Heart,
  GraduationCap,
  Shield,
  Radio,
  Building2,
  AlertTriangle,
  Search,
  MapPin,
  Wind,
  Droplets,
  Waves,
  Users,
  X,
  ExternalLink,
  Cpu,
} from 'lucide-react';

import MetricCard from '../components/ui/MetricCard';
import {
  fetchInfrastructureAssessment,
  fetchInfrastructureSummary,
  type InfrastructureAssessmentData,
  type InfrastructureSummary,
} from '../services/infrastructureApi';
import type { InfrastructureVulnerability } from '../types';
import { formatNumber } from '../utils/formatters';

const SEVERITY_STYLE: Record<string, { text: string; bg: string; border: string; dot: string; bar: string }> = {
  critical: { text: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/30',    dot: 'bg-red-400',    bar: '#ef4444' },
  high:     { text: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30', dot: 'bg-orange-400', bar: '#f97316' },
  medium:   { text: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/30',  dot: 'bg-amber-400',  bar: '#f59e0b' },
  low:      { text: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/30',  dot: 'bg-green-400',  bar: '#22c55e' },
};

const ASSET_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; border: string }> = {
  power: {
    label: 'Power Substations',
    icon: <Zap size={14} />,
    color: 'text-amber-400',
    border: 'border-amber-400/30',
  },
  bridges: {
    label: 'Bridges',
    icon: <Landmark size={14} />,
    color: 'text-purple-400',
    border: 'border-purple-400/30',
  },
  roads: {
    label: 'Roads',
    icon: <Navigation2 size={14} />,
    color: 'text-slate-300',
    border: 'border-slate-400/30',
  },
  hospitals: {
    label: 'Hospitals',
    icon: <Heart size={14} />,
    color: 'text-emerald-400',
    border: 'border-emerald-400/30',
  },
  schools: {
    label: 'Schools',
    icon: <GraduationCap size={14} />,
    color: 'text-indigo-400',
    border: 'border-indigo-400/30',
  },
  shelters: {
    label: 'Shelters',
    icon: <Shield size={14} />,
    color: 'text-blue-400',
    border: 'border-blue-400/30',
  },
  telecommunications: {
    label: 'Communication Towers',
    icon: <Radio size={14} />,
    color: 'text-cyan-400',
    border: 'border-cyan-400/30',
  },
};

export default function InfrastructurePage() {
  const navigate = useNavigate();

  const [assessmentData, setAssessmentData] = useState<InfrastructureAssessmentData | null>(null);
  const [summaryData, setSummaryData] = useState<InfrastructureSummary | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<InfrastructureVulnerability | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [assessRes, sumRes] = await Promise.all([
          fetchInfrastructureAssessment(),
          fetchInfrastructureSummary(),
        ]);
        if (isMounted) {
          setAssessmentData(assessRes);
          setSummaryData(sumRes);
        }
      } catch (err) {
        console.error('Failed to load infrastructure risk assessment:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered asset list
  const filteredAssets = useMemo(() => {
    if (!assessmentData?.allAssets) return [];
    return assessmentData.allAssets.filter((asset) => {
      // Type filter
      if (selectedType !== 'all' && asset.type !== selectedType) return false;
      // Severity filter
      if (selectedSeverity !== 'all' && asset.riskLevel.toLowerCase() !== selectedSeverity) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = asset.name.toLowerCase().includes(q);
        const matchesId = asset.id.toLowerCase().includes(q);
        const matchesFactors = asset.riskFactors.some((f) => f.toLowerCase().includes(q));
        if (!matchesName && !matchesId && !matchesFactors) return false;
      }
      return true;
    });
  }, [assessmentData, selectedType, selectedSeverity, searchQuery]);

  if (isLoading && !assessmentData) {
    return (
      <div className="h-full flex items-center justify-center bg-[#080d14]">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-cyan-500/30 mb-3 animate-pulse">
            <Building2 size={20} className="text-cyan-400" />
          </div>
          <p className="text-xs text-[#8fa3b8]">Evaluating multi-hazard infrastructure vulnerability...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-[#080d14] text-white">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* ── Demo Simulated Data Banner ─────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-400/5 border border-amber-400/20">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 demo-pulse" />
            <span className="text-xs font-bold text-amber-400 tracking-widest uppercase">
              Phase 4 Infrastructure Vulnerability Engine — Simulated Data
            </span>
            <span className="text-[11px] text-[#8fa3b8] hidden md:inline">
              Multi-hazard vulnerability calculated from spatial hydrodynamic and wind field outputs.
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-amber-300 border border-amber-400/20">
            DEMO BASELINE
          </span>
        </div>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-widest uppercase px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                Phase 4 Module
              </span>
              <span className="text-[10px] text-[#4a6278] font-mono">7 Critical Asset Classes</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mt-1">
              Critical Infrastructure Risk & Vulnerability
            </h1>
            <p className="text-xs text-[#8fa3b8] mt-0.5">
              Multi-hazard exposure engine combining flood inundation, gale wind gusts, and storm surge dynamics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/risk-map')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold transition-all"
            >
              <MapPin size={13} />
              Open Phase 2 Risk Map
            </button>
          </div>
        </div>

        {/* ── Dashboard KPI Statistics (The 5 Prompt-Requested Stats + Extras) ─ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard
            id="metric-power-risk"
            label="Power Assets at Risk"
            value={summaryData ? `${summaryData.power_assets_at_risk}` : '5'}
            unit="substations"
            subValue="Grid continuity threat"
            severity="high"
            icon={<Zap size={14} />}
            pulse
          />
          <MetricCard
            id="metric-roads-risk"
            label="Roads at Risk"
            value={summaryData ? `${summaryData.roads_at_risk}` : '6'}
            unit="corridors"
            subValue="Evacuation routes cut"
            severity="high"
            icon={<Navigation2 size={14} />}
          />
          <MetricCard
            id="metric-bridges-risk"
            label="Bridges at Risk"
            value={summaryData ? `${summaryData.bridges_at_risk}` : '5'}
            unit="structures"
            subValue="Scour & surge exposure"
            severity="critical"
            icon={<Landmark size={14} />}
            pulse
          />
          <MetricCard
            id="metric-hospitals-risk"
            label="Hospitals at Risk"
            value={summaryData ? `${summaryData.hospitals_at_risk}` : '5'}
            unit="facilities"
            subValue="ICU & backup power"
            severity="high"
            icon={<Heart size={14} />}
          />
          <MetricCard
            id="metric-shelters-exposed"
            label="Shelters Exposed"
            value={summaryData ? `${summaryData.shelters_exposed}` : '1'}
            unit="shelters"
            subValue="Flood ingress monitored"
            severity="medium"
            icon={<Shield size={14} />}
          />
        </div>

        {/* Secondary stats bar: Schools & Telecom & Total Impact */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-[#0f1a25] border border-indigo-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <GraduationCap size={16} />
              </div>
              <div>
                <p className="text-[10px] text-[#8fa3b8] uppercase tracking-wider font-semibold">Schools At Risk</p>
                <p className="text-lg font-black text-indigo-400 font-mono">
                  {summaryData?.schools_at_risk ?? 4} <span className="text-xs text-[#4a6278] font-normal">facilities</span>
                </p>
              </div>
            </div>
            <span className="text-[9px] font-mono text-[#4a6278]">Secondary Shelters</span>
          </div>

          <div className="p-3 rounded-xl bg-[#0f1a25] border border-cyan-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Radio size={16} />
              </div>
              <div>
                <p className="text-[10px] text-[#8fa3b8] uppercase tracking-wider font-semibold">Telecom Towers At Risk</p>
                <p className="text-lg font-black text-cyan-400 font-mono">
                  {summaryData?.telecom_at_risk ?? 5} <span className="text-xs text-[#4a6278] font-normal">masts</span>
                </p>
              </div>
            </div>
            <span className="text-[9px] font-mono text-[#4a6278]">High Wind Field</span>
          </div>

          <div className="p-3 rounded-xl bg-[#0f1a25] border border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Users size={16} />
              </div>
              <div>
                <p className="text-[10px] text-[#8fa3b8] uppercase tracking-wider font-semibold">Total Dependent Population</p>
                <p className="text-lg font-black text-white font-mono">
                  {formatNumber(summaryData?.total_population_affected ?? 2275850)}
                </p>
              </div>
            </div>
            <span className="text-[9px] font-mono text-emerald-400/80">Served Across All 7 Types</span>
          </div>
        </div>

        {/* ── Search & Filter Controls ───────────────────────────────────── */}
        <div className="p-4 rounded-xl bg-[#0f1a25] border border-[#1e2d3d] space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Asset Type Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <button
                onClick={() => setSelectedType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedType === 'all'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-[#141f2e] text-[#8fa3b8] border border-transparent hover:border-[#1e2d3d]'
                }`}
              >
                All Assets ({assessmentData?.allAssets?.length || 46})
              </button>
              {Object.entries(ASSET_TYPE_CONFIG).map(([key, config]) => {
                const count = assessmentData?.assetsByType?.[key]?.length || 0;
                const active = selectedType === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedType(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      active
                        ? `bg-[#141f2e] ${config.color} border ${config.border}`
                        : 'bg-[#141f2e]/60 text-[#8fa3b8] border border-transparent hover:border-[#1e2d3d]'
                    }`}
                  >
                    {config.icon}
                    <span>{config.label}</span>
                    <span className="text-[10px] font-mono opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6278]" />
              <input
                type="text"
                placeholder="Search asset, ID, or factor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#141f2e] border border-[#1e2d3d] rounded-lg text-white placeholder-[#4a6278] focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          {/* Severity Filter Pills */}
          <div className="flex items-center justify-between pt-2 border-t border-[#162030] text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#4a6278] uppercase font-bold tracking-wider">Risk Level:</span>
              {(['all', 'critical', 'high', 'medium', 'low'] as const).map((sev) => {
                const active = selectedSeverity === sev;
                const count = sev === 'all'
                  ? assessmentData?.allAssets?.length || 0
                  : assessmentData?.allAssets?.filter((a) => a.riskLevel.toLowerCase() === sev).length || 0;
                return (
                  <button
                    key={sev}
                    onClick={() => setSelectedSeverity(sev)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                      active
                        ? 'bg-white/10 text-white border border-white/30'
                        : 'text-[#4a6278] hover:text-[#8fa3b8]'
                    }`}
                  >
                    {sev} ({count})
                  </button>
                );
              })}
            </div>

            <span className="text-[11px] text-[#8fa3b8] font-mono">
              Showing <b className="text-white">{filteredAssets.length}</b> assessed assets
            </span>
          </div>
        </div>

        {/* ── Asset Cards Grid ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => {
            const s = SEVERITY_STYLE[asset.riskLevel.toLowerCase()] ?? SEVERITY_STYLE.low;
            const typeConfig = ASSET_TYPE_CONFIG[asset.type] || {
              label: asset.type.toUpperCase(),
              icon: <Building2 size={14} />,
              color: 'text-cyan-400',
              border: 'border-cyan-400/30',
            };

            return (
              <div
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className="group relative p-4 rounded-xl bg-[#0f1a25] border border-[#1e2d3d] hover:border-cyan-500/40 hover:bg-[#131d2b] transition-all cursor-pointer flex flex-col justify-between shadow-lg"
              >
                <div>
                  {/* Top Bar: Type, ID & Risk Score */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`${typeConfig.color}`}>{typeConfig.icon}</span>
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${typeConfig.color}`}>
                        {typeConfig.label.toUpperCase()}
                      </span>
                      <span className="text-[9px] font-mono text-[#4a6278] bg-[#141f2e] px-1.5 py-0.2 rounded border border-[#1e2d3d]">
                        {asset.id.toUpperCase()}
                      </span>
                    </div>

                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md border font-bold text-[9px] tracking-wider uppercase ${s.bg} ${s.border} ${s.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {asset.riskLevel} ({asset.riskScore})
                    </div>
                  </div>

                  {/* Asset Name */}
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors leading-tight mb-2">
                    {asset.name}
                  </h3>

                  {/* Multi-hazard exposures progress bars */}
                  <div className="space-y-1.5 p-2.5 rounded-lg bg-[#080d14] border border-[#1b2737] mb-3">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[#8fa3b8] flex items-center gap-1">
                        <Droplets size={10} className="text-blue-400" />
                        Flood exposure:
                      </span>
                      <span className="font-bold font-mono text-blue-400">{asset.floodExposure}%</span>
                    </div>
                    <div className="h-1 bg-[#141f2e] rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${asset.floodExposure}%` }} />
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[#8fa3b8] flex items-center gap-1">
                        <Wind size={10} className="text-red-400" />
                        Wind exposure:
                      </span>
                      <span className="font-bold font-mono text-red-400">{asset.windExposure}%</span>
                    </div>
                    <div className="h-1 bg-[#141f2e] rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${asset.windExposure}%` }} />
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[#8fa3b8] flex items-center gap-1">
                        <Waves size={10} className="text-amber-400" />
                        Storm-surge exposure:
                      </span>
                      <span className="font-bold font-mono text-amber-400">{asset.stormSurgeExposure}%</span>
                    </div>
                    <div className="h-1 bg-[#141f2e] rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${asset.stormSurgeExposure}%` }} />
                    </div>
                  </div>

                  {/* Risk Factors */}
                  <div className="mb-2">
                    <p className="text-[9px] font-bold text-[#8fa3b8] uppercase tracking-wider mb-1">Risk Factors:</p>
                    <div className="space-y-0.5">
                      {asset.riskFactors.slice(0, 2).map((factor, i) => (
                        <p key={i} className="text-[10px] text-[#cbd5e1] leading-tight flex items-start gap-1">
                          <span className={`text-[10px] font-bold ${s.text}`}>•</span>
                          <span>{factor}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer: Dependent population & Preparedness Note hint */}
                <div className="pt-2 border-t border-[#1b2737] flex items-center justify-between text-[10px] text-[#4a6278]">
                  {asset.populationDependent != null ? (
                    <span className="text-[#8fa3b8] flex items-center gap-1">
                      <Users size={11} className="text-cyan-400" />
                      {formatNumber(asset.populationDependent)} dependent
                    </span>
                  ) : (
                    <span>Elevation: {asset.elevation_m ?? 5}m</span>
                  )}
                  <span className="text-cyan-400 font-semibold group-hover:underline flex items-center gap-0.5">
                    Inspect <ExternalLink size={10} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Asset Inspection Modal (Exact format matching prompt) ──────── */}
        {selectedAsset && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-[#0d1520] border border-cyan-500/40 rounded-2xl shadow-2xl p-6 text-white max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between pb-3 border-b border-[#1e2d3d]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#141f2e] border border-[#1e2d3d] text-cyan-400">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono font-bold text-[#4a6278] uppercase tracking-widest">
                      {selectedAsset.type.toUpperCase()}
                    </p>
                    <h2 className="text-base font-bold text-white leading-tight">
                      {selectedAsset.name}
                    </h2>
                    <p className="text-[10px] font-mono text-cyan-400">ID: {selectedAsset.id.toUpperCase()}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="text-[#8fa3b8] hover:text-white p-1 rounded-md hover:bg-[#1e2d3d] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Exact format from prompt example:
                  Risk: HIGH (Score: 78.4)
                  Flood exposure: 87%
                  Wind exposure: 71%
                  Storm-surge exposure: 82%
                  Risk factors:
                  - low elevation
                  - close to coastline
                  - high modeled rainfall
              */}
              <div className="my-4 space-y-4">
                <div className="p-3 rounded-xl bg-[#080d14] border border-[#1e2d3d] flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-[#8fa3b8] font-semibold uppercase">Risk Level</p>
                    <p className={`text-xl font-black font-mono uppercase ${SEVERITY_STYLE[selectedAsset.riskLevel.toLowerCase()]?.text || 'text-orange-400'}`}>
                      {selectedAsset.riskLevel}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[#8fa3b8] font-semibold uppercase">Overall Vulnerability Score</p>
                    <p className="text-xl font-black font-mono text-white">
                      {selectedAsset.riskScore} <span className="text-xs text-[#4a6278] font-normal">/ 100</span>
                    </p>
                  </div>
                </div>

                {/* Exposure details */}
                <div className="p-3 rounded-xl bg-[#080d14] border border-[#1e2d3d] space-y-2">
                  <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Cpu size={12} />
                    Multi-Hazard Exposure Percentages
                  </p>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-0.5">
                      <span className="text-[#cbd5e1]">Flood exposure:</span>
                      <span className="font-bold font-mono text-blue-400">{selectedAsset.floodExposure}%</span>
                    </div>
                    <div className="h-2 bg-[#141f2e] rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${selectedAsset.floodExposure}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-0.5">
                      <span className="text-[#cbd5e1]">Wind exposure:</span>
                      <span className="font-bold font-mono text-red-400">{selectedAsset.windExposure}%</span>
                    </div>
                    <div className="h-2 bg-[#141f2e] rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${selectedAsset.windExposure}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-0.5">
                      <span className="text-[#cbd5e1]">Storm-surge exposure:</span>
                      <span className="font-bold font-mono text-amber-400">{selectedAsset.stormSurgeExposure}%</span>
                    </div>
                    <div className="h-2 bg-[#141f2e] rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${selectedAsset.stormSurgeExposure}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-0.5">
                      <span className="text-[#cbd5e1]">Location vulnerability:</span>
                      <span className="font-bold font-mono text-purple-400">{selectedAsset.locationVulnerability}%</span>
                    </div>
                    <div className="h-2 bg-[#141f2e] rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${selectedAsset.locationVulnerability}%` }} />
                    </div>
                  </div>
                </div>

                {/* Population dependent */}
                {selectedAsset.populationDependent != null && (
                  <div className="p-3 rounded-xl bg-[#080d14] border border-[#1e2d3d] flex items-center justify-between">
                    <span className="text-xs text-[#8fa3b8] flex items-center gap-1.5">
                      <Users size={14} className="text-cyan-400" />
                      Population dependent:
                    </span>
                    <span className="text-sm font-bold font-mono text-white">
                      {formatNumber(selectedAsset.populationDependent)} residents / commuters
                    </span>
                  </div>
                )}

                {/* Risk Factors */}
                <div className="p-3 rounded-xl bg-[#080d14] border border-[#1e2d3d]">
                  <p className="text-[10px] font-bold text-[#8fa3b8] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle size={12} className="text-orange-400" />
                    Risk Factors:
                  </p>
                  <ul className="space-y-1">
                    {selectedAsset.riskFactors.map((rf, idx) => (
                      <li key={idx} className="text-xs text-[#cbd5e1] flex items-start gap-2">
                        <span className="text-orange-400 font-bold">•</span>
                        <span>{rf}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Preparedness Note */}
                <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
                  <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Shield size={12} />
                    Preparedness Note:
                  </p>
                  <p className="text-xs text-[#93c5fd] leading-relaxed">
                    {selectedAsset.preparednessNote}
                  </p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-[#1e2d3d] flex items-center justify-between">
                <span className="text-[10px] text-[#4a6278] font-mono">SIMULATED DEMO CALCULATION</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedAsset(null);
                      navigate('/risk-map');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-colors"
                  >
                    <MapPin size={12} />
                    Locate on Map
                  </button>
                  <button
                    onClick={() => setSelectedAsset(null)}
                    className="px-3 py-1.5 rounded-lg bg-[#1e2d3d] hover:bg-[#2a3d52] text-xs font-semibold text-white transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
