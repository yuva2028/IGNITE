import {
  X, MapPin, AlertTriangle, Info, Zap, Heart, Shield, Wind, Landmark,
  Navigation2, Brain, Cpu, Grid, GraduationCap, Radio, Droplets, Waves, Building2, Users
} from 'lucide-react';
import type {
  SelectedFeature,
  SchoolFeature,
  TelecomTowerFeature,
  InfrastructureVulnerability,
  PopulationGridCell,
} from '../../types';
import { formatNumber } from '../../utils/formatters';

interface InfoPanelProps {
  feature: SelectedFeature | null;
  onClose: () => void;
}

const SEVERITY_STYLE: Record<string, { text: string; bg: string; border: string; dot: string; bar: string }> = {
  critical: { text: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/25',    dot: 'bg-red-400',    bar: '#ef4444' },
  high:     { text: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/25', dot: 'bg-orange-400', bar: '#f97316' },
  medium:   { text: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/25',  dot: 'bg-amber-400',  bar: '#f59e0b' },
  low:      { text: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/25',  dot: 'bg-green-400',  bar: '#22c55e' },
};

const STATUS_STYLE: Record<string, string> = {
  'operational': 'text-green-400 bg-green-400/10 border-green-400/20',
  'at-risk':     'text-orange-400 bg-orange-400/10 border-orange-400/20',
  'damaged':     'text-red-400 bg-red-400/10 border-red-400/20',
  'offline':     'text-[#4a6278] bg-[#0f1a25] border-[#1e2d3d]',
};

function Row({ label, value, highlight }: { label: string; value: string | number | boolean | undefined; highlight?: string }) {
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (value ?? '—');
  return (
    <div className="flex items-start justify-between gap-2 py-1.5 border-b border-[#0f1a25] last:border-0">
      <span className="text-[10px] text-[#4a6278] shrink-0">{label}</span>
      <span className={`text-[10px] font-medium text-right ${highlight ?? 'text-[#e2eaf4]'}`}>{display.toString()}</span>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const s = SEVERITY_STYLE[severity] ?? SEVERITY_STYLE.low;
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${s.bg} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      <span className={`text-[9px] font-bold tracking-widest uppercase ${s.text}`}>{severity}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.offline;
  return (
    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded border tracking-wider uppercase ${s}`}>
      {status.replace('-', ' ')}
    </span>
  );
}

function HospitalPanel({ data }: { data: Extract<SelectedFeature, { kind: 'hospital' }>['data'] }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-400/10 border border-emerald-400/20">
          <Heart size={14} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-[9px] text-[#4a6278] uppercase tracking-wider">Hospital</p>
          <h3 className="text-sm font-bold text-white leading-tight">{data.name}</h3>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <SeverityBadge severity={data.riskLevel} />
        <StatusBadge status={data.status} />
      </div>
      <div className="space-y-0">
        <Row label="Address" value={data.address} />
        <Row label="Total Capacity" value={`${data.capacity} beds`} />
        <Row label="ICU Beds" value={data.icu_beds} />
        <Row label="Backup Power" value={data.backupPower} highlight={data.backupPower ? 'text-green-400' : 'text-red-400'} />
        <Row label="Flood Risk" value={data.floodRisk} highlight={data.floodRisk ? 'text-red-400' : 'text-green-400'} />
      </div>
      <div className="mt-3 p-2.5 rounded-lg bg-[#080d14] border border-[#1e2d3d]">
        <p className="text-[9px] text-[#4a6278] uppercase tracking-wider mb-1">Assessment Note</p>
        <p className="text-[10px] text-[#8fa3b8] leading-relaxed">{data.notes}</p>
      </div>
    </>
  );
}

function ShelterPanel({ data }: { data: Extract<SelectedFeature, { kind: 'shelter' }>['data'] }) {
  const pct = Math.round((data.currentOccupancy / data.capacity) * 100);
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-400/10 border border-blue-400/20">
          <Shield size={14} className="text-blue-400" />
        </div>
        <div>
          <p className="text-[9px] text-[#4a6278] uppercase tracking-wider">Evacuation Shelter</p>
          <h3 className="text-sm font-bold text-white leading-tight">{data.name}</h3>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <SeverityBadge severity={data.riskLevel} />
        <StatusBadge status={data.status} />
      </div>
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[9px] text-[#4a6278]">Occupancy</span>
          <span className={`text-[10px] font-bold font-mono ${pct > 80 ? 'text-red-400' : pct > 50 ? 'text-orange-400' : 'text-green-400'}`}>
            {pct}% ({formatNumber(data.currentOccupancy)} / {formatNumber(data.capacity)})
          </span>
        </div>
        <div className="h-1.5 bg-[#080d14] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor: pct > 80 ? '#ef4444' : pct > 50 ? '#f97316' : '#22c55e',
            }}
          />
        </div>
      </div>
      <div className="space-y-0">
        <Row label="Address" value={data.address} />
        <Row label="Total Capacity" value={`${formatNumber(data.capacity)} persons`} />
        <Row label="Water Supply" value={data.hasWater} highlight={data.hasWater ? 'text-green-400' : 'text-red-400'} />
        <Row label="Medical Unit" value={data.hasMedical} highlight={data.hasMedical ? 'text-green-400' : 'text-amber-400'} />
        <Row label="Power Supply" value={data.hasPower} highlight={data.hasPower ? 'text-green-400' : 'text-red-400'} />
      </div>
      <div className="mt-3 p-2.5 rounded-lg bg-[#080d14] border border-[#1e2d3d]">
        <p className="text-[9px] text-[#4a6278] mb-1 uppercase tracking-wider">Assessment Note</p>
        <p className="text-[10px] text-[#8fa3b8] leading-relaxed">{data.notes}</p>
      </div>
    </>
  );
}

function PowerPanel({ data }: { data: Extract<SelectedFeature, { kind: 'power' }>['data'] }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20">
          <Zap size={14} className="text-amber-400" />
        </div>
        <div>
          <p className="text-[9px] text-[#4a6278] uppercase tracking-wider">Power Substation</p>
          <h3 className="text-sm font-bold text-white leading-tight">{data.name}</h3>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <SeverityBadge severity={data.riskLevel} />
        <StatusBadge status={data.status} />
      </div>
      <div className="space-y-0">
        <Row label="Voltage" value={`${data.voltageKv} kV`} />
        <Row label="Affected Population" value={formatNumber(data.affectedPopulation)} />
        <Row label="Backup Line" value={data.backupLine} highlight={data.backupLine ? 'text-green-400' : 'text-red-400'} />
        <Row label="Coordinates" value={`${data.lat.toFixed(3)}°N, ${data.lng.toFixed(3)}°E`} />
      </div>
      <div className="mt-3 p-2.5 rounded-lg bg-[#080d14] border border-[#1e2d3d]">
        <p className="text-[9px] text-[#4a6278] mb-1 uppercase tracking-wider">Assessment Note</p>
        <p className="text-[10px] text-[#8fa3b8] leading-relaxed">{data.notes}</p>
      </div>
    </>
  );
}

function BridgePanel({ data }: { data: Extract<SelectedFeature, { kind: 'bridge' }>['data'] }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-400/10 border border-purple-400/20">
          <Landmark size={14} className="text-purple-400" />
        </div>
        <div>
          <p className="text-[9px] text-[#4a6278] uppercase tracking-wider">Bridge</p>
          <h3 className="text-sm font-bold text-white leading-tight">{data.name}</h3>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <SeverityBadge severity={data.riskLevel} />
        <StatusBadge status={data.status} />
      </div>
      <div className="space-y-0">
        <Row label="Route" value={data.route} />
        <Row label="Span Length" value={`${data.spanM} m`} />
        <Row label="Year Built" value={data.yearBuilt} />
        <Row label="Condition" value={data.condition} highlight={data.condition === 'Good' ? 'text-green-400' : data.condition === 'Fair' ? 'text-amber-400' : 'text-red-400'} />
        <Row label="Coordinates" value={`${data.lat.toFixed(3)}°N, ${data.lng.toFixed(3)}°E`} />
      </div>
      <div className="mt-3 p-2.5 rounded-lg bg-[#080d14] border border-[#1e2d3d]">
        <p className="text-[9px] text-[#4a6278] mb-1 uppercase tracking-wider">Assessment Note</p>
        <p className="text-[10px] text-[#8fa3b8] leading-relaxed">{data.notes}</p>
      </div>
    </>
  );
}

function RoadPanel({ data }: { data: Extract<SelectedFeature, { kind: 'road' }>['data'] }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-400/10 border border-slate-400/20">
          <Navigation2 size={14} className="text-slate-400" />
        </div>
        <div>
          <p className="text-[9px] text-[#4a6278] uppercase tracking-wider">Road Corridor</p>
          <h3 className="text-sm font-bold text-white leading-tight">{data.name}</h3>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <SeverityBadge severity={data.riskLevel} />
        <StatusBadge status={data.status} />
      </div>
      <div className="space-y-0">
        <Row label="Length" value={`${data.lengthKm} km`} />
      </div>
      <div className="mt-3 p-2.5 rounded-lg bg-[#080d14] border border-[#1e2d3d]">
        <p className="text-[9px] text-[#4a6278] mb-1 uppercase tracking-wider">Assessment Note</p>
        <p className="text-[10px] text-[#8fa3b8] leading-relaxed">{data.notes}</p>
      </div>
    </>
  );
}


function RiskScoreCard({
  score,
  category,
  factors,
  modelType,
}: {
  score?: number;
  category: string;
  factors: string[];
  modelType?: string;
}) {
  const s = SEVERITY_STYLE[category.toLowerCase()] ?? SEVERITY_STYLE.low;
  const numScore = score != null ? Math.round(score) : (category.toLowerCase() === 'critical' ? 88 : category.toLowerCase() === 'high' ? 72 : category.toLowerCase() === 'medium' ? 45 : 18);

  return (
    <div className="mb-3 p-3 rounded-xl bg-gradient-to-b from-[#131d2a] to-[#0c131c] border border-[#1e2d3d] shadow-sm">
      {/* Model tag */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[#1b2737]">
        <div className="flex items-center gap-1.5">
          <Brain size={12} className="text-cyan-400" />
          <span className="text-[9px] font-bold text-cyan-300 uppercase tracking-wider">
            {modelType || 'ML Random Forest Baseline'}
          </span>
        </div>
        <span className="text-[8px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
          PHASE 3
        </span>
      </div>

      {/* Main Score and Category */}
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <div>
          <p className="text-[9px] font-semibold text-[#8fa3b8] uppercase tracking-wider">Risk Score</p>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-2xl font-black font-mono tracking-tight ${s.text}`}>{numScore}</span>
            <span className="text-[10px] text-[#4a6278] font-mono">/ 100</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-semibold text-[#4a6278] uppercase tracking-wider mb-1">Category</p>
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border font-bold text-[10px] tracking-widest uppercase ${s.bg} ${s.border} ${s.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {category.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Score Progress Bar */}
      <div className="mb-3">
        <div className="h-2 w-full bg-[#080d14] rounded-full overflow-hidden p-0.5 border border-[#1e2d3d]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, Math.max(5, numScore))}%`,
              backgroundColor: s.bar,
              boxShadow: `0 0 10px ${s.bar}60`,
            }}
          />
        </div>
      </div>

      {/* Risk Factors */}
      {factors.length > 0 && (
        <div className="pt-2 border-t border-[#1b2737]">
          <p className="text-[9px] font-bold text-[#8fa3b8] mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle size={10} className={s.text} />
            Contributing Risk Factors
          </p>
          <div className="space-y-1">
            {factors.map((f, i) => (
              <div key={i} className="flex items-start gap-1.5 px-2 py-1 rounded bg-[#090e16]/60 border border-[#1b2737]">
                <span className={`text-[10px] font-bold ${s.text} shrink-0 mt-px`}>•</span>
                <p className="text-[10px] text-[#cbd5e1] leading-tight font-medium">{f}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RiskZonePanel({ data }: { data: Extract<SelectedFeature, { kind: 'riskZone' }>['data'] }) {
  const s = SEVERITY_STYLE[data.severity] ?? SEVERITY_STYLE.low;
  const f = data.mlFeatures;

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg border ${s.bg} ${s.border}`}>
          <MapPin size={14} className={s.text} />
        </div>
        <div>
          <p className="text-[9px] text-[#4a6278] uppercase tracking-wider">Risk Zone Feature</p>
          <h3 className="text-sm font-bold text-white leading-tight">{data.name}</h3>
        </div>
      </div>

      {/* Prominent Phase 3 Risk Score, Category & Factors Display */}
      <RiskScoreCard
        score={data.riskScore}
        category={data.predictedCategory || data.severity}
        factors={data.riskFactors || []}
        modelType={data.modelType}
      />

      <div className="space-y-0 mt-3 p-2.5 rounded-lg bg-[#080d14] border border-[#1e2d3d]">
        <p className="text-[9px] text-[#4a6278] uppercase tracking-wider mb-1.5 font-bold">Zone Geography & Demographics</p>
        <Row label="District HQ" value={data.districtHq} />
        <Row label="Population Exposed" value={formatNumber(data.population)} highlight="text-orange-400" />
        <Row label="Total Area" value={`${data.area_km2} km²`} />
        <Row label="Mean Elevation" value={`~${data.elevation_m} m`} />
      </div>

      {f && (
        <div className="space-y-0 mt-3 p-2.5 rounded-lg bg-[#080d14] border border-[#1e2d3d]">
          <p className="text-[9px] text-cyan-400 uppercase tracking-wider mb-1.5 font-bold flex items-center gap-1.5">
            <Cpu size={10} />
            Input Environmental Features
          </p>
          <Row label="Wind Speed" value={`${f.wind_speed} km/h`} highlight="text-red-400" />
          <Row label="24h Rainfall" value={`${f.rainfall} mm`} highlight="text-cyan-400" />
          <Row label="Storm Surge" value={`${f.storm_surge} m`} highlight="text-amber-400" />
          <Row label="Elevation" value={`${f.elevation} m`} />
          <Row label="Dist. from Coast" value={`${f.distance_from_coast} km`} />
          <Row label="Dist. from Cyclone Track" value={`${f.distance_from_cyclone_track} km`} />
          <Row label="Flood Susceptibility" value={`${Math.round(f.historical_flood_exposure * 100)}%`} />
        </div>
      )}
    </>
  );
}

function SpatialGridPanel({ data }: { data: Extract<SelectedFeature, { kind: 'spatialGrid' }>['data'] }) {
  const s = SEVERITY_STYLE[data.severity] ?? SEVERITY_STYLE.low;

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg border ${s.bg} ${s.border}`}>
          <Grid size={14} className={s.text} />
        </div>
        <div>
          <p className="text-[9px] text-cyan-400 uppercase tracking-wider font-semibold">ML Spatial Grid Cell</p>
          <h3 className="text-xs font-bold text-white leading-tight">{data.name}</h3>
        </div>
      </div>

      {/* Prominent Risk Score, Category & Factors Card */}
      <RiskScoreCard
        score={data.risk_score}
        category={data.risk_category}
        factors={data.risk_factors}
        modelType={data.model_type}
      />

      <div className="space-y-0 mt-3 p-2.5 rounded-lg bg-[#080d14] border border-[#1e2d3d]">
        <p className="text-[9px] text-cyan-400 uppercase tracking-wider mb-1.5 font-bold flex items-center gap-1.5">
          <Cpu size={10} />
          Spatial Feature Parameters
        </p>
        <Row label="Center Coordinates" value={`${data.center[0]}°N, ${data.center[1]}°E`} />
        <Row label="Wind Speed" value={`${data.wind_speed} km/h`} highlight="text-red-400" />
        <Row label="24h Rainfall" value={`${data.rainfall} mm`} highlight="text-cyan-400" />
        <Row label="Storm Surge" value={`${data.storm_surge} m`} highlight="text-amber-400" />
        <Row label="Elevation" value={`${data.elevation} m`} />
        <Row label="Dist. from Coast" value={`${data.distance_from_coast} km`} />
        <Row label="Dist. from Cyclone Track" value={`${data.distance_from_cyclone_track} km`} />
        <Row label="Historical Flood Exposure" value={`${Math.round(data.historical_flood_exposure * 100)}%`} />
      </div>
    </>
  );
}


function CyclonePanel({ data }: { data: Extract<SelectedFeature, { kind: 'cyclone' }>['data'] }) {
  const catColor: Record<number, string> = { 1: 'text-green-400', 2: 'text-amber-400', 3: 'text-orange-400', 4: 'text-red-400', 5: 'text-red-600' };
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-400/10 border border-red-400/20">
          <Wind size={14} className="text-red-400" />
        </div>
        <div>
          <p className="text-[9px] text-[#4a6278] uppercase tracking-wider">
            Cyclone VAYU-B — {data.type === 'historic' ? 'Historic' : data.type === 'current' ? 'Current' : 'Forecast'} Position
          </p>
          <h3 className="text-sm font-bold text-white">{data.label}</h3>
        </div>
      </div>
      <div className="space-y-0">
        <Row label="Category" value={`Category ${data.category}`} highlight={catColor[data.category]} />
        <Row label="Wind Speed" value={`${data.windSpeedKmh} km/h`} highlight="text-red-400" />
        <Row label="Central Pressure" value={`${data.pressureHpa} hPa`} />
        <Row label="Coordinates" value={`${data.lat.toFixed(2)}°N, ${data.lng.toFixed(2)}°E`} />
      </div>
      <div className="mt-3 p-2.5 rounded-lg bg-[#080d14] border border-[#1e2d3d]">
        <p className="text-[10px] text-[#8fa3b8] leading-relaxed">{data.note}</p>
      </div>
    </>
  );
}

function SchoolPanel({ data }: { data: SchoolFeature }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-400/10 border border-indigo-400/20">
          <GraduationCap size={14} className="text-indigo-400" />
        </div>
        <div>
          <p className="text-[9px] text-[#4a6278] uppercase tracking-wider">School / Shelter Facility</p>
          <h3 className="text-sm font-bold text-white leading-tight">{data.name}</h3>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <SeverityBadge severity={data.riskLevel} />
        <StatusBadge status={data.status} />
      </div>
      <div className="space-y-0">
        <Row label="Address" value={data.address} />
        <Row label="Capacity" value={`${data.capacity} students / evacuees`} />
        <Row label="Elevation" value={`${data.elevation} m`} />
        <Row label="Backup Power" value={data.backupPower} highlight={data.backupPower ? 'text-green-400' : 'text-red-400'} />
        <Row label="Flood Risk" value={data.floodRisk} highlight={data.floodRisk ? 'text-red-400' : 'text-green-400'} />
      </div>
      <div className="mt-3 p-2.5 rounded-lg bg-[#080d14] border border-[#1e2d3d]">
        <p className="text-[9px] text-[#4a6278] uppercase tracking-wider mb-1">Assessment Note</p>
        <p className="text-[10px] text-[#8fa3b8] leading-relaxed">{data.notes}</p>
      </div>
    </>
  );
}

function TelecomPanel({ data }: { data: TelecomTowerFeature }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-400/10 border border-cyan-400/20">
          <Radio size={14} className="text-cyan-400" />
        </div>
        <div>
          <p className="text-[9px] text-[#4a6278] uppercase tracking-wider">Communication Tower</p>
          <h3 className="text-sm font-bold text-white leading-tight">{data.name}</h3>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <SeverityBadge severity={data.riskLevel} />
        <StatusBadge status={data.status} />
      </div>
      <div className="space-y-0">
        <Row label="Mast Height" value={`${data.heightM} m`} />
        <Row label="Elevation" value={`${data.elevation} m`} />
        <Row label="Backup Battery" value={`${data.backupBatteryHours} hours`} />
        <Row label="Coverage Population" value={formatNumber(data.affectedPopulation)} highlight="text-cyan-400" />
      </div>
      <div className="mt-3 p-2.5 rounded-lg bg-[#080d14] border border-[#1e2d3d]">
        <p className="text-[9px] text-[#4a6278] uppercase tracking-wider mb-1">Assessment Note</p>
        <p className="text-[10px] text-[#8fa3b8] leading-relaxed">{data.notes}</p>
      </div>
    </>
  );
}

function InfrastructureDetailPanel({ data }: { data: InfrastructureVulnerability }) {
  const s = SEVERITY_STYLE[data.riskLevel.toLowerCase()] ?? SEVERITY_STYLE.low;

  const typeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    power: { label: 'POWER SUBSTATION', icon: <Zap size={14} className="text-amber-400" />, color: 'text-amber-400' },
    bridges: { label: 'BRIDGE', icon: <Landmark size={14} className="text-purple-400" />, color: 'text-purple-400' },
    roads: { label: 'ROAD CORRIDOR', icon: <Navigation2 size={14} className="text-slate-300" />, color: 'text-slate-300' },
    hospitals: { label: 'HOSPITAL', icon: <Heart size={14} className="text-emerald-400" />, color: 'text-emerald-400' },
    schools: { label: 'SCHOOL', icon: <GraduationCap size={14} className="text-indigo-400" />, color: 'text-indigo-400' },
    shelters: { label: 'SHELTER', icon: <Shield size={14} className="text-blue-400" />, color: 'text-blue-400' },
    telecommunications: { label: 'COMMUNICATION TOWER', icon: <Radio size={14} className="text-cyan-400" />, color: 'text-cyan-400' },
  };

  const assetInfo = typeConfig[data.type] || {
    label: (data.type || 'INFRASTRUCTURE').toUpperCase(),
    icon: <Building2 size={14} className="text-cyan-400" />,
    color: 'text-cyan-400',
  };

  return (
    <>
      {/* Asset Type & Name Header */}
      <div className="flex items-start gap-2.5 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 bg-[#141f2e] border border-[#1e2d3d]">
          {assetInfo.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#4a6278]">
            {assetInfo.label}
          </p>
          <h3 className="text-sm font-bold text-white leading-tight truncate">{data.name}</h3>
          <p className="text-[9px] font-mono text-cyan-400/80">ID: {data.id.toUpperCase()}</p>
        </div>
      </div>

      {/* Risk Level & Score */}
      <div className="flex items-center justify-between gap-2 mb-3 p-2 rounded-lg bg-[#080d14] border border-[#1e2d3d]">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#8fa3b8] font-bold">Risk:</span>
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md border font-bold text-[10px] tracking-wider uppercase ${s.bg} ${s.border} ${s.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {data.riskLevel.toUpperCase()}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-[#4a6278]">Score:</span>
          <span className={`text-xs font-black font-mono ${s.text}`}>{data.riskScore}</span>
          <span className="text-[9px] text-[#4a6278] font-mono">/100</span>
        </div>
      </div>

      {/* Exposures Section */}
      <div className="p-3 rounded-xl bg-gradient-to-b from-[#131d2a] to-[#0c131c] border border-[#1e2d3d] mb-3 space-y-2">
        <div className="flex items-center justify-between pb-1.5 border-b border-[#1b2737]">
          <p className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
            <Cpu size={10} />
            Hazard Exposures
          </p>
          <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            SIMULATED
          </span>
        </div>

        {/* Flood Exposure */}
        <div>
          <div className="flex justify-between items-center text-[10px] mb-0.5">
            <span className="text-[#cbd5e1] flex items-center gap-1">
              <Droplets size={10} className="text-blue-400" />
              Flood exposure:
            </span>
            <span className="font-bold font-mono text-blue-400">{data.floodExposure}%</span>
          </div>
          <div className="h-1.5 bg-[#080d14] rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, data.floodExposure)}%` }} />
          </div>
        </div>

        {/* Wind Exposure */}
        <div>
          <div className="flex justify-between items-center text-[10px] mb-0.5">
            <span className="text-[#cbd5e1] flex items-center gap-1">
              <Wind size={10} className="text-red-400" />
              Wind exposure:
            </span>
            <span className="font-bold font-mono text-red-400">{data.windExposure}%</span>
          </div>
          <div className="h-1.5 bg-[#080d14] rounded-full overflow-hidden">
            <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, data.windExposure)}%` }} />
          </div>
        </div>

        {/* Storm-Surge Exposure */}
        <div>
          <div className="flex justify-between items-center text-[10px] mb-0.5">
            <span className="text-[#cbd5e1] flex items-center gap-1">
              <Waves size={10} className="text-amber-400" />
              Storm-surge exposure:
            </span>
            <span className="font-bold font-mono text-amber-400">{data.stormSurgeExposure}%</span>
          </div>
          <div className="h-1.5 bg-[#080d14] rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, data.stormSurgeExposure)}%` }} />
          </div>
        </div>

        {/* Location Vulnerability */}
        <div>
          <div className="flex justify-between items-center text-[10px] mb-0.5">
            <span className="text-[#cbd5e1] flex items-center gap-1">
              <MapPin size={10} className="text-purple-400" />
              Location vulnerability:
            </span>
            <span className="font-bold font-mono text-purple-400">{data.locationVulnerability}%</span>
          </div>
          <div className="h-1.5 bg-[#080d14] rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, data.locationVulnerability)}%` }} />
          </div>
        </div>
      </div>

      {/* Population Dependent */}
      {data.populationDependent != null && (
        <div className="mb-3 p-2.5 rounded-lg bg-[#080d14] border border-[#1e2d3d] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Users size={12} className="text-cyan-400" />
            <span className="text-[10px] text-[#8fa3b8]">Population dependent:</span>
          </div>
          <span className="text-[11px] font-bold font-mono text-white">
            {formatNumber(data.populationDependent)}
          </span>
        </div>
      )}

      {/* Risk Factors */}
      <div className="mb-3 p-2.5 rounded-lg bg-[#080d14] border border-[#1e2d3d]">
        <p className="text-[9px] font-bold text-[#8fa3b8] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <AlertTriangle size={10} className={s.text} />
          Risk factors:
        </p>
        <div className="space-y-1">
          {data.riskFactors && data.riskFactors.length > 0 ? (
            data.riskFactors.map((f, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[10px] text-[#cbd5e1]">
                <span className={`text-[10px] font-bold ${s.text} shrink-0`}>-</span>
                <span className="leading-tight">{f}</span>
              </div>
            ))
          ) : (
            <p className="text-[10px] text-[#4a6278]">- standard coastal exposure</p>
          )}
        </div>
      </div>

      {/* Preparedness Note */}
      <div className="mb-3 p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/25">
        <p className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider mb-1 flex items-center gap-1">
          <Shield size={10} />
          Preparedness note:
        </p>
        <p className="text-[10px] text-[#93c5fd] leading-relaxed">
          {data.preparednessNote}
        </p>
      </div>

      {/* Details / Status */}
      <div className="space-y-0 p-2 rounded-lg bg-[#080d14] border border-[#1e2d3d]">
        <Row label="Status" value={data.status} />
        {data.elevation_m != null && <Row label="Elevation" value={`${data.elevation_m} m ASL`} />}
        {data.lat != null && data.lng != null && (
          <Row label="Coordinates" value={`${data.lat.toFixed(3)}°N, ${data.lng.toFixed(3)}°E`} />
        )}
        {data.notes && <Row label="Operational Note" value={data.notes} />}
      </div>
    </>
  );
}

function PopulationCellPanel({ data }: { data: PopulationGridCell }) {
  const isHighOrCrit = data.risk_category === 'critical' || data.risk_category === 'high';
  return (
    <>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <span className="text-[9px] font-bold text-pink-400 tracking-wider uppercase">
            POPULATION GRID CELL (PHASE 6)
          </span>
          <h3 className="text-sm font-bold text-white leading-tight">{data.name}</h3>
          <p className="text-[10px] text-[#4a6278] font-mono mt-0.5">ID: {data.id} · Zone: {data.zone_id}</p>
        </div>
        <SeverityBadge severity={data.risk_category} />
      </div>

      {/* Population card */}
      <div className="p-3 rounded-xl bg-[#080d14] border border-[#1e2d3d] mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#8fa3b8] flex items-center gap-1.5 font-medium">
            <Users size={12} className="text-pink-400" />
            Modeled Population
          </span>
          <span className="text-[9px] font-mono text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/20">
            {data.risk_category.toUpperCase()}
          </span>
        </div>
        <div className="text-2xl font-black font-mono text-white tracking-tight">
          {formatNumber(data.population)}
        </div>
        <p className="text-[9px] text-[#4a6278] mt-1">
          Simulated population estimated in this geographic grid cell
        </p>
      </div>

      {/* Risk Score */}
      <div className="p-3 rounded-xl bg-[#080d14] border border-[#1e2d3d] mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-[#8fa3b8] font-medium">Risk Score</span>
          <span className="text-sm font-bold font-mono text-white">{data.risk_score}/100</span>
        </div>
        <div className="h-2 rounded-full bg-[#152030] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${data.risk_score}%`,
              backgroundColor: SEVERITY_STYLE[data.risk_category]?.bar ?? '#f59e0b',
            }}
          />
        </div>
      </div>

      {/* Geography Details */}
      <div className="space-y-0 p-2.5 rounded-lg bg-[#080d14] border border-[#1e2d3d] mb-3">
        <Row label="Elevation" value={`${data.elevation_m} m ASL`} />
        {data.area_km2 > 0 && <Row label="Grid Area" value={`${data.area_km2} km²`} />}
        <Row label="Coordinates" value={`${data.lat.toFixed(3)}°N, ${data.lng.toFixed(3)}°E`} />
        <Row label="Risk Zone ID" value={data.zone_id} />
      </div>

      {/* Advisory */}
      <div className={`p-2.5 rounded-lg border text-[10px] leading-relaxed ${
        isHighOrCrit
          ? 'bg-rose-500/10 border-rose-500/25 text-rose-300'
          : 'bg-blue-500/10 border-blue-500/25 text-blue-300'
      }`}>
        <div className="flex items-center gap-1.5 font-bold mb-1">
          <AlertTriangle size={11} />
          <span>{isHighOrCrit ? 'High Exposure Alert' : 'Advisory Note'}</span>
        </div>
        {isHighOrCrit
          ? 'High cyclone hazard exposure. Pre-emptive evacuation and shelter readiness recommended for residents in this cell.'
          : 'Moderate/low hazard exposure. Monitor cyclone track updates and local warnings.'}
      </div>
    </>
  );
}

export default function InfoPanel({ feature, onClose }: InfoPanelProps) {
  if (!feature) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 rounded-xl bg-[#141f2e] border border-[#1e2d3d] flex items-center justify-center mb-3">
          <Info size={18} className="text-[#4a6278]" />
        </div>
        <p className="text-xs font-semibold text-[#8fa3b8] mb-1">Select a Feature</p>
        <p className="text-[10px] text-[#4a6278] leading-relaxed">
          Click any critical infrastructure asset, risk zone, grid cell, or cyclone track point on the map to view detailed vulnerability metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2d3d] shrink-0">
        <p className="text-[9px] font-bold text-[#4a6278] uppercase tracking-widest">Selected Feature</p>
        <button
          id="info-panel-close-btn"
          onClick={onClose}
          className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-[#1e2d3d] text-[#4a6278] hover:text-white transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {feature.kind === 'infrastructure' && <InfrastructureDetailPanel data={feature.data} />}
        {feature.kind === 'hospital'        && <HospitalPanel             data={feature.data} />}
        {feature.kind === 'shelter'         && <ShelterPanel              data={feature.data} />}
        {feature.kind === 'power'           && <PowerPanel                data={feature.data} />}
        {feature.kind === 'bridge'          && <BridgePanel               data={feature.data} />}
        {feature.kind === 'road'            && <RoadPanel                 data={feature.data} />}
        {feature.kind === 'school'          && <SchoolPanel               data={feature.data} />}
        {feature.kind === 'telecom'         && <TelecomPanel              data={feature.data} />}
        {feature.kind === 'riskZone'        && <RiskZonePanel             data={feature.data} />}
        {feature.kind === 'spatialGrid'     && <SpatialGridPanel          data={feature.data} />}
        {feature.kind === 'populationCell'  && <PopulationCellPanel       data={feature.data} />}
        {feature.kind === 'cyclone'         && <CyclonePanel              data={feature.data} />}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-[#1e2d3d] shrink-0">
        <p className="text-[8px] text-[#4a6278] text-center font-mono">SIMULATED DEMO DATA — Not for operational use</p>
      </div>
    </div>
  );
}
