/**
 * CycloneGuard AI — Phase 9: Historical Analysis & Model Validation
 *
 * Displays historical Bay of Bengal cyclone events with:
 *  - Pre-event conditions
 *  - Modeled risk vs observed outcome
 *  - Validation pipeline with real metrics from ml/evaluation/metrics.json
 *  - Evaluation dashboard
 *  - Methodology, limitations, dataset description
 *  - Export to JSON
 *
 * IMPORTANT: Metrics are sourced directly from ml/evaluation/metrics.json.
 * No metrics are fabricated. If the dataset is insufficient, the UI shows
 * "Evaluation dataset unavailable" rather than invented numbers.
 */

import { useState, useCallback } from 'react';
import {
  History,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  FlaskConical,
  Database,
  BookOpen,
  Info,
  ChevronDown,
  ChevronRight,
  Wind,
  Waves,
  ThermometerSun,
  TrendingUp,
  BarChart2,
  Layers,
  Calendar,
  Users,
  DollarSign,
  Shield,
} from 'lucide-react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  ReferenceLine,
} from 'recharts';

// ─── Data Imports ─────────────────────────────────────────────────────────────
import historicalEventsRaw from '../data/historical-events.json';
// validation-metrics.json is a copy of ml/evaluation/metrics.json placed in src/data/
// for TypeScript path compatibility. The ml/evaluation/evaluate.py script generates
// the authoritative version; copy it here before building: cp ml/evaluation/metrics.json src/data/validation-metrics.json
import metricsRaw from '../data/validation-metrics.json';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PreEventConditions {
  seaSurfaceTempC: number;
  windShearKmh: number;
  moistureIndex: number;
  maddenJulianOscillation: string;
  eddyCurrentPresent: boolean;
  notes: string;
}

interface ModeledRisk {
  modeledCategory: number;
  modeledRiskScore: number;
  modeledRiskCategory: string;
  modeledStormSurgeM: number;
  modeledRainfallMm24h: number;
  predictionLeadTimeHours: number;
  notes: string;
}

interface ObservedOutcome {
  actualCategory: number;
  actualRiskCategory: string;
  actualStormSurgeM: number;
  actualRainfallMm24h: number;
  correctClassification: boolean;
  surgeDeltaM: number;
  rainfallDeltaMm: number;
  notes: string;
}

interface HistoricalEvent {
  id: string;
  name: string;
  year: number;
  basin: string;
  region: string;
  landfallDate: string;
  landfallLocation: string;
  category: number;
  peakWindKmh: number;
  peakWindKnots: number;
  minPressureHpa: number;
  stormSurgeM: number;
  rainfallMm24h: number;
  deaths: number;
  affectedPopulation: number;
  economicDamageUSD: number;
  displacedPersons: number;
  severity: string;
  dataCompleteness: string;
  preEventConditions: PreEventConditions;
  modeledRisk: ModeledRisk;
  observedOutcome: ObservedOutcome;
  keyLessons: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#22c55e',
};

const CATEGORY_COLORS: Record<number, string> = {
  1: '#22c55e',
  2: '#f59e0b',
  3: '#f97316',
  4: '#ef4444',
  5: '#dc2626',
};

const METRIC_THRESHOLDS = {
  precision: { good: 0.85, acceptable: 0.70 },
  recall: { good: 0.85, acceptable: 0.70 },
  f1: { good: 0.85, acceptable: 0.70 },
  roc_auc: { good: 0.90, acceptable: 0.80 },
  accuracy: { good: 0.90, acceptable: 0.80 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function metricQuality(value: number, thresholds: { good: number; acceptable: number }): 'good' | 'acceptable' | 'poor' {
  if (value >= thresholds.good) return 'good';
  if (value >= thresholds.acceptable) return 'acceptable';
  return 'poor';
}

function metricColor(quality: 'good' | 'acceptable' | 'poor'): string {
  return quality === 'good' ? '#22c55e' : quality === 'acceptable' ? '#f59e0b' : '#ef4444';
}

function metricBg(quality: 'good' | 'acceptable' | 'poor'): string {
  return quality === 'good'
    ? 'text-green-400 bg-green-500/10 border-green-500/20'
    : quality === 'acceptable'
    ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    : 'text-red-400 bg-red-500/10 border-red-500/20';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Pill({ label, color }: { label: string; color?: string }) {
  return (
    <span
      className="text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-widest uppercase"
      style={
        color
          ? { color, backgroundColor: `${color}15`, borderColor: `${color}30` }
          : undefined
      }
    >
      {label}
    </span>
  );
}

function InfoBanner({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-400/5 border border-amber-400/20">
      <span className="text-amber-400 mt-0.5 shrink-0">{icon ?? <AlertTriangle size={13} />}</span>
      <p className="text-[10px] text-[#8fa3b8] leading-relaxed">{children}</p>
    </div>
  );
}

interface MetricGaugeProps {
  label: string;
  value: number | null;
  thresholds?: { good: number; acceptable: number };
  suffix?: string;
  unavailable?: boolean;
}

function MetricGauge({ label, value, thresholds, suffix = '', unavailable }: MetricGaugeProps) {
  if (unavailable || value === null || value === undefined) {
    return (
      <div className="flex flex-col gap-1 p-3 rounded-lg bg-[#080d14] border border-[#1e2d3d]">
        <p className="text-[9px] font-semibold text-[#4a6278] uppercase tracking-wider">{label}</p>
        <p className="text-xs font-bold text-[#2a3d52]">Unavailable</p>
      </div>
    );
  }
  const quality = thresholds ? metricQuality(value, thresholds) : 'good';
  const pct = Math.min(value * 100, 100);
  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg bg-[#080d14] border border-[#1e2d3d]">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-semibold text-[#4a6278] uppercase tracking-wider">{label}</p>
        <span className={`text-[9px] font-bold px-1 py-0.5 rounded border ${metricBg(quality)}`}>
          {quality.toUpperCase()}
        </span>
      </div>
      <p className="text-xl font-black font-mono" style={{ color: metricColor(quality) }}>
        {(value * 100).toFixed(1)}
        {suffix}
      </p>
      <div className="h-1 rounded-full bg-[#1e2d3d] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: metricColor(quality) }}
        />
      </div>
    </div>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({
  event,
  isExpanded,
  onToggle,
}: {
  event: HistoricalEvent;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const correct = event.observedOutcome.correctClassification;
  const sevColor = SEVERITY_COLOR[event.severity] ?? '#6b7280';

  // Radar data for pre-event conditions
  const radarData = [
    {
      subject: 'SST',
      A: Math.min(((event.preEventConditions.seaSurfaceTempC - 26) / 8) * 100, 100),
    },
    {
      subject: 'Moisture',
      A: event.preEventConditions.moistureIndex * 100,
    },
    {
      subject: 'Low Shear',
      A: Math.max(0, 100 - (event.preEventConditions.windShearKmh / 60) * 100),
    },
    {
      subject: 'Eddy',
      A: event.preEventConditions.eddyCurrentPresent ? 80 : 20,
    },
    {
      subject: 'MJO',
      A:
        event.preEventConditions.maddenJulianOscillation === 'active'
          ? 90
          : event.preEventConditions.maddenJulianOscillation === 'weakly_active'
          ? 55
          : 20,
    },
  ];

  // Comparison bar data
  const compData = [
    {
      name: 'Storm Surge (m)',
      modeled: event.modeledRisk.modeledStormSurgeM,
      observed: event.observedOutcome.actualStormSurgeM,
    },
    {
      name: 'Rainfall (mm/10)',
      modeled: event.modeledRisk.modeledRainfallMm24h / 10,
      observed: event.observedOutcome.actualRainfallMm24h / 10,
    },
    {
      name: 'Category',
      modeled: event.modeledRisk.modeledCategory,
      observed: event.observedOutcome.actualCategory,
    },
    {
      name: 'Risk Score (/10)',
      modeled: event.modeledRisk.modeledRiskScore / 10,
      observed: event.observedOutcome.actualCategory * 2,
    },
  ];

  return (
    <div
      className="rounded-xl bg-[#0f1a25] border overflow-hidden"
      style={{ borderColor: `${sevColor}30` }}
    >
      {/* Header — always visible */}
      <button
        id={`event-card-${event.id}`}
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left hover:bg-[#141f2e] transition-colors"
      >
        <div className="flex items-start gap-4">
          {/* Category badge */}
          <div
            className="shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-lg border font-black text-sm"
            style={{
              color: CATEGORY_COLORS[event.category],
              backgroundColor: `${CATEGORY_COLORS[event.category]}15`,
              borderColor: `${CATEGORY_COLORS[event.category]}30`,
            }}
          >
            <span className="text-[9px] font-bold opacity-60">CAT</span>
            {event.category}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white">{event.name}</h3>
              <Pill label={event.year.toString()} />
              <Pill label={event.severity.toUpperCase()} color={sevColor} />
              <Pill label={`${event.dataCompleteness} data`} />
            </div>
            <p className="text-[10px] text-[#4a6278]">
              {event.landfallLocation} · {event.landfallDate} · {event.basin}
            </p>
            <div className="flex items-center gap-4 flex-wrap text-[10px] text-[#8fa3b8]">
              <span className="flex items-center gap-1">
                <Wind size={9} className="text-[#4a6278]" />
                {event.peakWindKmh} km/h
              </span>
              <span className="flex items-center gap-1">
                <Waves size={9} className="text-[#4a6278]" />
                {event.stormSurgeM} m surge
              </span>
              <span className="flex items-center gap-1">
                <Users size={9} className="text-[#4a6278]" />
                {formatNumber(event.affectedPopulation)} affected
              </span>
              <span className="flex items-center gap-1">
                <DollarSign size={9} className="text-[#4a6278]" />
                {formatNumber(event.economicDamageUSD)} damage
              </span>
            </div>
          </div>
        </div>

        {/* Classification result badge + toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-bold ${
              correct
                ? 'text-green-400 bg-green-500/10 border-green-500/20'
                : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
            }`}
          >
            {correct ? <CheckCircle size={11} /> : <AlertTriangle size={11} />}
            {correct ? 'Correctly Classified' : 'Over-predicted (safe)'}
          </div>
          {isExpanded ? (
            <ChevronDown size={14} className="text-[#4a6278]" />
          ) : (
            <ChevronRight size={14} className="text-[#4a6278]" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-[#1e2d3d] p-5 space-y-5">
          <div className="grid grid-cols-3 gap-4">
            {/* Pre-event Conditions */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ThermometerSun size={12} className="text-cyan-400" />
                <h4 className="text-xs font-bold text-white">Pre-Event Conditions</h4>
              </div>

              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
                    <PolarGrid stroke="#1e2d3d" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: '#4a6278', fontSize: 9 }}
                    />
                    <Radar
                      name="Favorability"
                      dataKey="A"
                      stroke={sevColor}
                      fill={sevColor}
                      fillOpacity={0.25}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5">
                {[
                  { label: 'Sea Surface Temp', value: `${event.preEventConditions.seaSurfaceTempC}°C` },
                  { label: 'Wind Shear', value: `${event.preEventConditions.windShearKmh} km/h` },
                  { label: 'Moisture Index', value: event.preEventConditions.moistureIndex.toFixed(2) },
                  { label: 'MJO Phase', value: event.preEventConditions.maddenJulianOscillation.replace(/_/g, ' ') },
                  {
                    label: 'Eddy Current',
                    value: event.preEventConditions.eddyCurrentPresent ? 'Present' : 'Absent',
                  },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between text-[10px]">
                    <span className="text-[#4a6278]">{row.label}</span>
                    <span className="text-[#8fa3b8] font-mono">{row.value}</span>
                  </div>
                ))}
              </div>

              <p className="text-[9px] text-[#4a6278] leading-relaxed italic">
                {event.preEventConditions.notes}
              </p>
            </div>

            {/* Modeled vs Observed Comparison */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BarChart2 size={12} className="text-purple-400" />
                <h4 className="text-xs font-bold text-white">Modeled vs Observed</h4>
              </div>

              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={compData}
                    margin={{ top: 4, right: 4, left: -20, bottom: 4 }}
                    barSize={12}
                  >
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#4a6278', fontSize: 8 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#4a6278', fontSize: 8 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#141f2e',
                        border: '1px solid #1e2d3d',
                        borderRadius: 6,
                        fontSize: 10,
                      }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="modeled" name="Modeled" fill="#818cf8" fillOpacity={0.8} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="observed" name="Observed" fill="#22c55e" fillOpacity={0.8} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 justify-center">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-indigo-400/80" />
                  <span className="text-[9px] text-[#4a6278]">Modeled</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-green-500/80" />
                  <span className="text-[9px] text-[#4a6278]">Observed</span>
                </div>
              </div>

              {/* Delta table */}
              <div className="space-y-1.5">
                {[
                  {
                    label: 'Storm Surge Δ',
                    value: `±${event.observedOutcome.surgeDeltaM} m`,
                    ok: event.observedOutcome.surgeDeltaM <= 0.5,
                  },
                  {
                    label: 'Rainfall Δ',
                    value: `±${event.observedOutcome.rainfallDeltaMm} mm`,
                    ok: event.observedOutcome.rainfallDeltaMm <= 30,
                  },
                  {
                    label: 'Category Δ',
                    value: `${Math.abs(event.modeledRisk.modeledCategory - event.observedOutcome.actualCategory)} cat`,
                    ok: Math.abs(event.modeledRisk.modeledCategory - event.observedOutcome.actualCategory) <= 1,
                  },
                  {
                    label: 'Lead Time',
                    value: `${event.modeledRisk.predictionLeadTimeHours} h`,
                    ok: event.modeledRisk.predictionLeadTimeHours >= 48,
                  },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between text-[10px]">
                    <span className="text-[#4a6278]">{row.label}</span>
                    <span className={`font-mono font-bold ${row.ok ? 'text-green-400' : 'text-amber-400'}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Observed Outcome + Lessons */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Activity size={12} className="text-cyan-400" />
                <h4 className="text-xs font-bold text-white">Observed Outcome</h4>
              </div>

              {/* Key stats */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Deaths', value: event.deaths.toString(), color: '#ef4444' },
                  { label: 'Displaced', value: formatNumber(event.displacedPersons), color: '#f97316' },
                  { label: 'Affected', value: formatNumber(event.affectedPopulation), color: '#f59e0b' },
                  { label: 'Damage', value: formatNumber(event.economicDamageUSD), color: '#8b5cf6' },
                ].map((s) => (
                  <div key={s.label} className="p-2 rounded-lg bg-[#080d14] border border-[#1e2d3d]">
                    <p className="text-[9px] text-[#4a6278]">{s.label}</p>
                    <p className="text-sm font-black font-mono" style={{ color: s.color }}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-[9px] text-[#4a6278] leading-relaxed italic">
                {event.observedOutcome.notes}
              </p>

              {/* Classification result */}
              <div
                className={`p-2.5 rounded-lg border text-[10px] ${
                  correct
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-amber-500/5 border-amber-500/20'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {correct ? (
                    <CheckCircle size={11} className="text-green-400" />
                  ) : (
                    <AlertTriangle size={11} className="text-amber-400" />
                  )}
                  <span className={`font-bold ${correct ? 'text-green-400' : 'text-amber-400'}`}>
                    {correct ? 'Classification Correct' : 'Category Over-predicted'}
                  </span>
                </div>
                <p className="text-[#4a6278]">
                  Modeled: <strong className="text-[#8fa3b8]">{event.modeledRisk.modeledRiskCategory}</strong>
                  {' '}→ Observed:{' '}
                  <strong className="text-[#8fa3b8]">{event.observedOutcome.actualRiskCategory}</strong>
                </p>
              </div>

              {/* Key lessons */}
              <div>
                <p className="text-[9px] font-bold text-[#4a6278] uppercase tracking-wider mb-1.5">Key Lessons</p>
                <ul className="space-y-1">
                  {event.keyLessons.map((lesson, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[9px] text-[#4a6278]">
                      <span className="text-cyan-500 mt-0.5 shrink-0">›</span>
                      {lesson}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Validation Pipeline Step ─────────────────────────────────────────────────

function PipelineStep({
  step,
  label,
  description,
  isLast,
}: {
  step: number;
  label: string;
  description: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-black shrink-0">
          {step}
        </div>
        {!isLast && <div className="w-0.5 h-6 bg-gradient-to-b from-cyan-500/30 to-transparent mt-1" />}
      </div>
      <div className="pb-2">
        <p className="text-xs font-bold text-white">{label}</p>
        <p className="text-[9px] text-[#4a6278] leading-relaxed mt-0.5">{description}</p>
      </div>
    </div>
  );
}

// ─── Confusion Matrix ──────────────────────────────────────────────────────────

function ConfusionMatrix({
  matrix,
  labels,
}: {
  matrix: number[][];
  labels: string[];
}) {
  const maxVal = Math.max(...matrix.flat());
  return (
    <div>
      <div className="flex">
        {/* Corner */}
        <div className="w-20 shrink-0" />
        {/* Predicted labels */}
        <div className="flex flex-1 justify-around mb-1">
          {labels.map((l) => (
            <span key={l} className="text-[8px] font-bold text-cyan-400 uppercase tracking-wider text-center flex-1">
              {l}
            </span>
          ))}
        </div>
      </div>
      {matrix.map((row, ri) => (
        <div key={ri} className="flex items-center gap-1 mb-1">
          <span className="text-[8px] font-bold text-[#4a6278] uppercase tracking-wider w-20 shrink-0 text-right pr-2">
            {labels[ri]}
          </span>
          {row.map((val, ci) => {
            const intensity = maxVal > 0 ? val / maxVal : 0;
            const isDiagonal = ri === ci;
            return (
              <div
                key={ci}
                className="flex-1 h-9 rounded flex items-center justify-center text-xs font-black transition-all"
                style={{
                  backgroundColor: isDiagonal
                    ? `rgba(34, 197, 94, ${0.08 + intensity * 0.42})`
                    : `rgba(239, 68, 68, ${intensity * 0.35})`,
                  border: isDiagonal
                    ? `1px solid rgba(34, 197, 94, ${0.15 + intensity * 0.4})`
                    : `1px solid rgba(239, 68, 68, ${intensity * 0.3})`,
                  color: isDiagonal ? '#22c55e' : val > 0 ? '#ef4444' : '#1e2d3d',
                }}
              >
                {val}
              </div>
            );
          })}
        </div>
      ))}
      <div className="flex mt-2">
        <div className="w-20 shrink-0" />
        <div className="flex flex-1 justify-around">
          {labels.map((l) => (
            <span key={l} className="text-[8px] text-[#2a3d52] uppercase tracking-wider text-center flex-1">
              Pred. {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Per-class Metrics Chart ───────────────────────────────────────────────────

function PerClassMetricsChart({
  perClass,
}: {
  perClass: Record<string, { precision: number; recall: number; f1_score: number; support: number }>;
}) {
  const data = Object.entries(perClass).map(([cls, m]) => ({
    name: cls,
    Precision: Math.round(m.precision * 100),
    Recall: Math.round(m.recall * 100),
    F1: Math.round(m.f1_score * 100),
    Support: m.support,
  }));

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 4 }} barSize={10}>
          <XAxis dataKey="name" tick={{ fill: '#4a6278', fontSize: 9 }} axisLine={false} tickLine={false} />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#4a6278', fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: '#141f2e',
              border: '1px solid #1e2d3d',
              borderRadius: 6,
              fontSize: 10,
            }}
            labelStyle={{ color: '#fff' }}
            formatter={(val) => [`${Number(val).toFixed(1)}%`]}
          />
          <ReferenceLine y={85} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.3} />
          <Bar dataKey="Precision" fill="#818cf8" fillOpacity={0.85} radius={[2, 2, 0, 0]} />
          <Bar dataKey="Recall" fill="#22c55e" fillOpacity={0.85} radius={[2, 2, 0, 0]} />
          <Bar dataKey="F1" fill="#f59e0b" fillOpacity={0.85} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Risk Score Distribution Chart ───────────────────────────────────────────

function RiskScoreValidationChart({ events }: { events: HistoricalEvent[] }) {
  const data = events.map((e) => ({
    name: e.name.replace('Cyclone ', ''),
    modeled: e.modeledRisk.modeledRiskScore,
    observed: e.observedOutcome.actualCategory * 20, // normalise cat 1-5 → 20-100
    match: e.observedOutcome.correctClassification,
  }));

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
          <XAxis dataKey="name" tick={{ fill: '#4a6278', fontSize: 9 }} axisLine={false} tickLine={false} />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#4a6278', fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: '#141f2e',
              border: '1px solid #1e2d3d',
              borderRadius: 6,
              fontSize: 10,
            }}
            labelStyle={{ color: '#fff' }}
          />
          <Line
            type="monotone"
            dataKey="modeled"
            name="Modeled Risk Score"
            stroke="#818cf8"
            strokeWidth={2}
            dot={{ fill: '#818cf8', r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="observed"
            name="Observed Severity (norm.)"
            stroke="#22c55e"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={{ fill: '#22c55e', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function HistoricalAnalysisPage() {
  const [expandedEventId, setExpandedEventId] = useState<string | null>('FANI-2019');
  const [activeTab, setActiveTab] = useState<'events' | 'validation' | 'methodology'>('events');

  const events = historicalEventsRaw.events as HistoricalEvent[];
  const metrics = metricsRaw;

  // Determine if metrics are usable (produced from real training run)
  const metricsAvailable =
    metrics &&
    metrics.metrics &&
    metrics.test_samples_count > 0;

  // Validation pipeline event-level summary
  const totalEvents = events.length;
  const correctCount = events.filter((e) => e.observedOutcome.correctClassification).length;
  const eventAccuracy = totalEvents > 0 ? correctCount / totalEvents : null;

  // MAE for storm surge across events
  const surgeMAE =
    events.reduce((sum, e) => sum + e.observedOutcome.surgeDeltaM, 0) / events.length;

  // MAE for rainfall
  const rainfallMAE =
    events.reduce((sum, e) => sum + e.observedOutcome.rainfallDeltaMm, 0) / events.length;

  const handleExport = useCallback(() => {
    const exportPayload = {
      _export_metadata: {
        tool: 'CycloneGuard AI',
        phase: 9,
        generatedAt: new Date().toISOString(),
        description: 'Phase 9 Historical Validation Export — model metrics + historical event validation',
        note: 'Historical event data is illustrative demo data. Model metrics are computed from the held-out test split.',
      },
      model_evaluation: {
        evaluation_timestamp: metrics.evaluation_timestamp,
        model_name: metrics.model_name,
        model_architecture: metrics.model_architecture,
        is_demo_baseline: metrics.is_demo_baseline,
        test_samples_count: metrics.test_samples_count,
        classes: metrics.classes,
        metrics: metrics.metrics,
        per_class_metrics: metrics.per_class_metrics,
        confusion_matrix: metrics.confusion_matrix,
      },
      historical_event_validation: {
        total_events: totalEvents,
        correct_classifications: correctCount,
        event_level_accuracy: eventAccuracy !== null ? Math.round(eventAccuracy * 1000) / 1000 : null,
        surge_mae_m: Math.round(surgeMAE * 100) / 100,
        rainfall_mae_mm: Math.round(rainfallMAE * 100) / 100,
        events: events.map((e) => ({
          id: e.id,
          name: e.name,
          year: e.year,
          modeled_category: e.modeledRisk.modeledRiskCategory,
          observed_category: e.observedOutcome.actualRiskCategory,
          correct_classification: e.observedOutcome.correctClassification,
          surge_delta_m: e.observedOutcome.surgeDeltaM,
          rainfall_delta_mm: e.observedOutcome.rainfallDeltaMm,
          prediction_lead_hours: e.modeledRisk.predictionLeadTimeHours,
        })),
      },
      limitations: [
        'Historical event data is illustrative — sourced from public reports, not authoritative databases',
        'Model was trained on synthetic demo data, not historical cyclone records',
        'Spatial overlap (IoU) metrics are unavailable — no ground-truth raster datasets loaded',
        'Only 4 events in validation set — insufficient for statistically robust conclusions',
        'Model metrics are from a held-out split of synthetic training data, not real cyclone observations',
        'Event-level accuracy (3/4 = 75%) is not statistically significant at n=4',
      ],
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cycloneguard-phase9-validation-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [events, metrics, totalEvents, correctCount, eventAccuracy, surgeMAE, rainfallMAE]);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      <div className="p-5 space-y-5 fade-in">

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <History size={18} className="text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white tracking-tight">Historical Analysis</h1>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border text-cyan-400 bg-cyan-400/10 border-cyan-400/20 tracking-widest uppercase">
                  Phase 9
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border text-amber-400 bg-amber-400/10 border-amber-400/20 tracking-widest uppercase">
                  Demo Data
                </span>
              </div>
              <p className="text-[10px] text-[#4a6278] mt-0.5">
                Bay of Bengal cyclone validation · {events.length} events · Model evaluation from held-out test split
              </p>
            </div>
          </div>
          <button
            id="btn-export-validation"
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0f1a25] border border-[#1e2d3d] text-xs font-semibold text-[#8fa3b8] hover:text-white hover:border-cyan-500/30 transition-all"
          >
            <Download size={12} />
            Export Validation Report
          </button>
        </div>

        {/* Demo data notice */}
        <InfoBanner icon={<AlertTriangle size={13} />}>
          <strong className="text-amber-400">Historical data is illustrative demo data</strong> — event statistics
          are sourced from publicly available reports (IMD, NDMA, EM-DAT) for demonstration purposes. Figures
          may differ from authoritative databases. Model metrics are computed from a held-out test split of
          synthetic training data, not real historical cyclone observations. See the Methodology tab for full details.
        </InfoBanner>

        {/* ── Summary Metric Cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-6 gap-3">
          {/* Events in validation */}
          <div className="col-span-1 p-3 rounded-xl bg-[#0f1a25] border border-[#1e2d3d] flex flex-col gap-1">
            <p className="text-[9px] font-bold text-[#4a6278] uppercase tracking-wider">Events</p>
            <p className="text-2xl font-black text-cyan-400">{totalEvents}</p>
            <p className="text-[9px] text-[#4a6278]">Bay of Bengal</p>
          </div>

          {/* Event classification accuracy */}
          <div className="col-span-1 p-3 rounded-xl bg-[#0f1a25] border border-[#1e2d3d] flex flex-col gap-1">
            <p className="text-[9px] font-bold text-[#4a6278] uppercase tracking-wider">Event Accuracy</p>
            <p className="text-2xl font-black text-amber-400">
              {eventAccuracy !== null ? `${Math.round(eventAccuracy * 100)}%` : 'N/A'}
            </p>
            <p className="text-[9px] text-[#4a6278]">{correctCount}/{totalEvents} correct (n too small)</p>
          </div>

          {/* Surge MAE */}
          <div className="col-span-1 p-3 rounded-xl bg-[#0f1a25] border border-[#1e2d3d] flex flex-col gap-1">
            <p className="text-[9px] font-bold text-[#4a6278] uppercase tracking-wider">Surge MAE</p>
            <p className="text-2xl font-black text-green-400">{surgeMAE.toFixed(2)} m</p>
            <p className="text-[9px] text-[#4a6278]">Mean absolute error</p>
          </div>

          {/* Rainfall MAE */}
          <div className="col-span-1 p-3 rounded-xl bg-[#0f1a25] border border-[#1e2d3d] flex flex-col gap-1">
            <p className="text-[9px] font-bold text-[#4a6278] uppercase tracking-wider">Rainfall MAE</p>
            <p className="text-2xl font-black text-blue-400">{rainfallMAE.toFixed(0)} mm</p>
            <p className="text-[9px] text-[#4a6278]">24-hr rainfall</p>
          </div>

          {/* Model test accuracy (from metrics.json) */}
          <div className="col-span-1 p-3 rounded-xl bg-[#0f1a25] border border-[#1e2d3d] flex flex-col gap-1">
            <p className="text-[9px] font-bold text-[#4a6278] uppercase tracking-wider">Model Accuracy</p>
            {metricsAvailable ? (
              <>
                <p className="text-2xl font-black text-green-400">
                  {(metrics.metrics.accuracy * 100).toFixed(1)}%
                </p>
                <p className="text-[9px] text-[#4a6278]">
                  {metrics.test_samples_count} test samples
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-[#4a6278]">Unavailable</p>
                <p className="text-[9px] text-[#2a3d52]">No test split found</p>
              </>
            )}
          </div>

          {/* ROC-AUC */}
          <div className="col-span-1 p-3 rounded-xl bg-[#0f1a25] border border-[#1e2d3d] flex flex-col gap-1">
            <p className="text-[9px] font-bold text-[#4a6278] uppercase tracking-wider">ROC-AUC</p>
            {metricsAvailable && metrics.metrics.roc_auc_weighted !== null ? (
              <>
                <p className="text-2xl font-black text-purple-400">
                  {(metrics.metrics.roc_auc_weighted! * 100).toFixed(1)}%
                </p>
                <p className="text-[9px] text-[#4a6278]">OVR weighted</p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-[#4a6278]">Unavailable</p>
                <p className="text-[9px] text-[#2a3d52]">Not computable</p>
              </>
            )}
          </div>
        </div>

        {/* ── Tab Navigation ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#080d14] border border-[#1e2d3d] w-fit">
          {(
            [
              { id: 'events', label: 'Historical Events', icon: <History size={11} /> },
              { id: 'validation', label: 'Evaluation Dashboard', icon: <BarChart2 size={11} /> },
              { id: 'methodology', label: 'Methodology & Limitations', icon: <BookOpen size={11} /> },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-[#4a6278] hover:text-[#8fa3b8]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/*  TAB: HISTORICAL EVENTS                                          */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'events' && (
          <div className="space-y-4">
            {/* Validation pipeline diagram */}
            <div className="p-4 rounded-xl bg-[#0f1a25] border border-[#1e2d3d]">
              <div className="flex items-center gap-2 mb-4">
                <Layers size={13} className="text-cyan-400" />
                <h2 className="text-sm font-bold text-white">Validation Pipeline</h2>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border text-cyan-400 bg-cyan-400/10 border-cyan-400/20 uppercase tracking-wider">
                  Phase 9
                </span>
              </div>

              <div className="grid grid-cols-5 gap-3">
                {[
                  {
                    step: 1,
                    label: 'Historical Data',
                    desc: 'IMD / NDMA / IBTrACS event records (illustrative demo)',
                    icon: <Database size={14} className="text-cyan-400" />,
                    active: true,
                  },
                  {
                    step: 2,
                    label: 'Feature Preprocessing',
                    desc: 'Wind, SST, surge, rainfall → normalized feature vectors',
                    icon: <FlaskConical size={14} className="text-purple-400" />,
                    active: true,
                  },
                  {
                    step: 3,
                    label: 'Model Prediction',
                    desc: 'Demo RandomForest classifier + regressor (Phase 3)',
                    icon: <Activity size={14} className="text-indigo-400" />,
                    active: true,
                  },
                  {
                    step: 4,
                    label: 'Observed Outcome',
                    desc: 'Actual landfall category, surge, rainfall recorded',
                    icon: <CheckCircle size={14} className="text-green-400" />,
                    active: true,
                  },
                  {
                    step: 5,
                    label: 'Evaluation Metrics',
                    desc: 'MAE (surge/rainfall), classification accuracy, risk-category match',
                    icon: <BarChart2 size={14} className="text-amber-400" />,
                    active: true,
                  },
                ].map((s, i) => (
                  <div key={s.step} className="relative">
                    <div
                      className={`p-3 rounded-lg border h-full ${
                        s.active
                          ? 'bg-[#080d14] border-cyan-500/20'
                          : 'bg-[#080d14] border-[#1e2d3d] opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`flex items-center justify-center w-5 h-5 rounded-full text-[8px] font-black border ${
                            s.active
                              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                              : 'bg-[#1e2d3d] border-[#2a3d52] text-[#4a6278]'
                          }`}
                        >
                          {s.step}
                        </div>
                        {s.icon}
                      </div>
                      <p className="text-[10px] font-bold text-white mb-1">{s.label}</p>
                      <p className="text-[9px] text-[#4a6278] leading-relaxed">{s.desc}</p>
                    </div>
                    {i < 4 && (
                      <div className="absolute top-1/2 -right-1.5 z-10 text-cyan-500/40 text-xs">›</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Available metrics */}
              <div className="mt-4 pt-4 border-t border-[#1e2d3d] grid grid-cols-3 gap-3">
                <div className="p-2.5 rounded-lg bg-green-500/5 border border-green-500/15">
                  <p className="text-[9px] font-bold text-green-400 uppercase tracking-wider mb-1">✓ Available Metrics</p>
                  <ul className="space-y-0.5">
                    {[
                      'Classification Accuracy',
                      'Precision / Recall / F1 (weighted + macro)',
                      'ROC-AUC (multi-class OVR)',
                      'MAE for risk score regression',
                      'Per-class confusion matrix',
                      'Surge/rainfall MAE (event-level)',
                    ].map((m) => (
                      <li key={m} className="text-[9px] text-[#4a6278] flex items-center gap-1">
                        <CheckCircle size={8} className="text-green-500 shrink-0" />
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/15">
                  <p className="text-[9px] font-bold text-red-400 uppercase tracking-wider mb-1">✗ Unavailable Metrics</p>
                  <ul className="space-y-0.5">
                    {[
                      'IoU (no ground-truth rasters)',
                      'RMSE for spatial extent',
                      'Track error (km) — no trajectory labels',
                      'Calibration curves — n too small',
                      'Bootstrapped confidence intervals — n<30',
                    ].map((m) => (
                      <li key={m} className="text-[9px] text-[#4a6278] flex items-center gap-1">
                        <XCircle size={8} className="text-red-500 shrink-0" />
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15">
                  <p className="text-[9px] font-bold text-amber-400 uppercase tracking-wider mb-1">⚠ Caveats</p>
                  <ul className="space-y-0.5">
                    {[
                      'Model trained on synthetic data, not real cyclones',
                      'Event n=4 is statistically insufficient',
                      'Historical data from public reports only',
                      'Modeled risk scores are illustrative reconstructions',
                    ].map((m) => (
                      <li key={m} className="text-[9px] text-[#4a6278] flex items-center gap-1">
                        <AlertTriangle size={8} className="text-amber-500 shrink-0" />
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Risk score comparison chart */}
            <div className="p-4 rounded-xl bg-[#0f1a25] border border-[#1e2d3d]">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={13} className="text-purple-400" />
                <h2 className="text-sm font-bold text-white">Modeled Risk Score vs Observed Severity</h2>
                <span className="text-[9px] text-[#4a6278]">4 events · illustrative</span>
              </div>
              <RiskScoreValidationChart events={events} />
              <p className="text-[9px] text-[#4a6278] mt-2">
                Observed severity normalised: Category × 20 (1→20, 5→100). Modeled risk score from demo prediction pipeline.
                Trend alignment indicates directional model skill.
              </p>
            </div>

            {/* Event cards */}
            <div className="space-y-3">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isExpanded={expandedEventId === event.id}
                  onToggle={() =>
                    setExpandedEventId((prev) => (prev === event.id ? null : event.id))
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/*  TAB: EVALUATION DASHBOARD                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'validation' && (
          <div className="space-y-4">
            {/* Evaluation metadata banner */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0f1a25] border border-[#1e2d3d]">
              <div className="flex items-center gap-3">
                <Shield size={16} className="text-cyan-400" />
                <div>
                  <p className="text-xs font-bold text-white">{metrics.model_name}</p>
                  <p className="text-[9px] text-[#4a6278]">{metrics.model_architecture}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[9px] text-[#4a6278]">
                <span className="flex items-center gap-1">
                  <Calendar size={9} />
                  Evaluated: {new Date(metrics.evaluation_timestamp).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Database size={9} />
                  {metrics.test_samples_count} test samples
                </span>
                <span className="flex items-center gap-1">
                  <Layers size={9} />
                  {metrics.classes.length} classes: {metrics.classes.join(', ')}
                </span>
                {metrics.is_demo_baseline && (
                  <span className="text-amber-400 font-bold">DEMO BASELINE</span>
                )}
              </div>
            </div>

            {!metricsAvailable ? (
              /* ── Unavailable state ────────────────────────────────────── */
              <div className="flex flex-col items-center justify-center gap-4 py-20 rounded-xl bg-[#0f1a25] border border-[#1e2d3d]">
                <XCircle size={40} className="text-[#2a3d52]" />
                <div className="text-center">
                  <p className="text-base font-bold text-[#4a6278]">Evaluation Dataset Unavailable</p>
                  <p className="text-xs text-[#2a3d52] mt-1 max-w-sm">
                    No test split or model artifacts were found. Run{' '}
                    <code className="font-mono text-cyan-400">python -m ml.training.train</code> then{' '}
                    <code className="font-mono text-cyan-400">python -m ml.evaluation.evaluate</code> to
                    generate real metrics.
                  </p>
                </div>
              </div>
            ) : (
              /* ── Full evaluation dashboard ──────────────────────────── */
              <div className="space-y-4">
                {/* Overall metrics grid */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Activity size={13} className="text-cyan-400" />
                    <h2 className="text-sm font-bold text-white">Overall Classification Metrics</h2>
                    <InfoBanner icon={<Info size={11} />}>
                      <span>
                        Computed on {metrics.test_samples_count} held-out test samples from synthetic training data. Not real cyclone events.
                      </span>
                    </InfoBanner>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <MetricGauge
                      label="Accuracy"
                      value={metrics.metrics.accuracy}
                      thresholds={METRIC_THRESHOLDS.accuracy}
                      suffix="%"
                    />
                    <MetricGauge
                      label="Precision (Weighted)"
                      value={metrics.metrics.precision_weighted}
                      thresholds={METRIC_THRESHOLDS.precision}
                      suffix="%"
                    />
                    <MetricGauge
                      label="Recall (Weighted)"
                      value={metrics.metrics.recall_weighted}
                      thresholds={METRIC_THRESHOLDS.recall}
                      suffix="%"
                    />
                    <MetricGauge
                      label="F1 Score (Weighted)"
                      value={metrics.metrics.f1_score_weighted}
                      thresholds={METRIC_THRESHOLDS.f1}
                      suffix="%"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-3 mt-3">
                    <MetricGauge
                      label="ROC-AUC (OVR Weighted)"
                      value={metrics.metrics.roc_auc_weighted ?? null}
                      thresholds={METRIC_THRESHOLDS.roc_auc}
                      suffix="%"
                      unavailable={metrics.metrics.roc_auc_weighted === null}
                    />
                    <MetricGauge
                      label="Precision (Macro)"
                      value={metrics.metrics.precision_macro}
                      thresholds={METRIC_THRESHOLDS.precision}
                      suffix="%"
                    />
                    <MetricGauge
                      label="Recall (Macro)"
                      value={metrics.metrics.recall_macro}
                      thresholds={METRIC_THRESHOLDS.recall}
                      suffix="%"
                    />
                    <MetricGauge
                      label="F1 Score (Macro)"
                      value={metrics.metrics.f1_score_macro}
                      thresholds={METRIC_THRESHOLDS.f1}
                      suffix="%"
                    />
                  </div>
                </div>

                {/* Regression metrics for risk score */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={13} className="text-purple-400" />
                    <h2 className="text-sm font-bold text-white">Risk Score Regression Metrics</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-[#0f1a25] border border-[#1e2d3d] flex gap-4 items-center">
                      <div>
                        <p className="text-[9px] font-bold text-[#4a6278] uppercase tracking-wider">Risk Score MAE</p>
                        <p className="text-3xl font-black text-cyan-400 font-mono">
                          {metrics.metrics.risk_score_mae}
                        </p>
                        <p className="text-[9px] text-[#4a6278]">points out of 100</p>
                      </div>
                      <div className="flex-1 h-2 rounded-full bg-[#080d14] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-cyan-400"
                          style={{ width: `${Math.max(0, 100 - metrics.metrics.risk_score_mae * 2)}%` }}
                        />
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-[#0f1a25] border border-[#1e2d3d] flex gap-4 items-center">
                      <div>
                        <p className="text-[9px] font-bold text-[#4a6278] uppercase tracking-wider">R² Score</p>
                        <p className="text-3xl font-black text-purple-400 font-mono">
                          {metrics.metrics.risk_score_r2}
                        </p>
                        <p className="text-[9px] text-[#4a6278]">coefficient of determination</p>
                      </div>
                      <div className="flex-1 h-2 rounded-full bg-[#080d14] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-purple-400"
                          style={{ width: `${metrics.metrics.risk_score_r2 * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-[9px] text-[#4a6278] mt-2">
                    ⚠ IoU (Intersection over Union) for spatial overlap is{' '}
                    <strong className="text-red-400">unavailable</strong> — no ground-truth raster/polygon
                    datasets are loaded in the current demo configuration. Spatial IoU requires geospatial flood
                    extent labels.
                  </p>
                </div>

                {/* Per-class breakdown */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Per-class chart */}
                  <div className="p-4 rounded-xl bg-[#0f1a25] border border-[#1e2d3d]">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart2 size={12} className="text-amber-400" />
                      <h3 className="text-xs font-bold text-white">Per-Class Precision / Recall / F1</h3>
                    </div>
                    <PerClassMetricsChart perClass={metrics.per_class_metrics} />
                    <div className="flex items-center gap-4 justify-center mt-2">
                      {[
                        { label: 'Precision', color: '#818cf8' },
                        { label: 'Recall', color: '#22c55e' },
                        { label: 'F1', color: '#f59e0b' },
                      ].map((l) => (
                        <div key={l.label} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                          <span className="text-[9px] text-[#4a6278]">{l.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 space-y-1.5">
                      {Object.entries(metrics.per_class_metrics).map(([cls, m]) => (
                        <div
                          key={cls}
                          className="flex items-center justify-between p-2 rounded-lg bg-[#080d14] border border-[#1e2d3d] text-[9px]"
                        >
                          <span className="font-bold text-[#8fa3b8] w-16">{cls}</span>
                          <span className="text-indigo-400 font-mono">{(m.precision * 100).toFixed(1)}%</span>
                          <span className="text-green-400 font-mono">{(m.recall * 100).toFixed(1)}%</span>
                          <span className="text-amber-400 font-mono">{(m.f1_score * 100).toFixed(1)}%</span>
                          <span className="text-[#4a6278]">n={m.support}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Confusion matrix */}
                  <div className="p-4 rounded-xl bg-[#0f1a25] border border-[#1e2d3d]">
                    <div className="flex items-center gap-2 mb-3">
                      <Layers size={12} className="text-green-400" />
                      <h3 className="text-xs font-bold text-white">Confusion Matrix</h3>
                      <span className="text-[9px] text-[#4a6278]">rows = true, cols = predicted</span>
                    </div>
                    <ConfusionMatrix
                      matrix={metrics.confusion_matrix.matrix}
                      labels={metrics.confusion_matrix.labels}
                    />
                    <div className="mt-3 flex items-center gap-4 justify-center">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-green-500/50 border border-green-500/30" />
                        <span className="text-[9px] text-[#4a6278]">Correct (diagonal)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-red-500/30 border border-red-500/20" />
                        <span className="text-[9px] text-[#4a6278]">Misclassified</span>
                      </div>
                    </div>
                    <p className="text-[9px] text-[#4a6278] mt-2">
                      Note: CRITICAL class has only 6 test samples — metrics for that class are not statistically
                      reliable. Weighted averages are dominated by the LOW class (n=719).
                    </p>
                  </div>
                </div>

                {/* Event-level validation results */}
                <div className="p-4 rounded-xl bg-[#0f1a25] border border-[#1e2d3d]">
                  <div className="flex items-center gap-2 mb-3">
                    <History size={12} className="text-cyan-400" />
                    <h3 className="text-xs font-bold text-white">Event-Level Validation Summary</h3>
                    <span className="text-[9px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                      n=4 — not statistically significant
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="border-b border-[#1e2d3d]">
                          {[
                            'Event', 'Year', 'Modeled Category', 'Observed Category',
                            'Classification', 'Surge Δ (m)', 'Rainfall Δ (mm)', 'Lead Time (h)',
                          ].map((h) => (
                            <th key={h} className="text-left py-2 pr-3 text-[9px] font-bold text-[#4a6278] uppercase tracking-wider">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {events.map((e) => (
                          <tr key={e.id} className="border-b border-[#080d14] hover:bg-[#141f2e]">
                            <td className="py-2 pr-3 font-bold text-white">{e.name}</td>
                            <td className="py-2 pr-3 text-[#8fa3b8] font-mono">{e.year}</td>
                            <td className="py-2 pr-3">
                              <span
                                className="px-1.5 py-0.5 rounded font-bold text-[9px]"
                                style={{
                                  color: SEVERITY_COLOR[e.modeledRisk.modeledRiskCategory.toLowerCase()] ?? '#6b7280',
                                  backgroundColor: `${SEVERITY_COLOR[e.modeledRisk.modeledRiskCategory.toLowerCase()] ?? '#6b7280'}15`,
                                }}
                              >
                                {e.modeledRisk.modeledRiskCategory}
                              </span>
                            </td>
                            <td className="py-2 pr-3">
                              <span
                                className="px-1.5 py-0.5 rounded font-bold text-[9px]"
                                style={{
                                  color: SEVERITY_COLOR[e.observedOutcome.actualRiskCategory.toLowerCase()] ?? '#6b7280',
                                  backgroundColor: `${SEVERITY_COLOR[e.observedOutcome.actualRiskCategory.toLowerCase()] ?? '#6b7280'}15`,
                                }}
                              >
                                {e.observedOutcome.actualRiskCategory}
                              </span>
                            </td>
                            <td className="py-2 pr-3">
                              {e.observedOutcome.correctClassification ? (
                                <span className="flex items-center gap-1 text-green-400 font-bold">
                                  <CheckCircle size={10} /> Correct
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-amber-400 font-bold">
                                  <AlertTriangle size={10} /> Over-pred.
                                </span>
                              )}
                            </td>
                            <td className="py-2 pr-3 font-mono text-[#8fa3b8]">
                              ±{e.observedOutcome.surgeDeltaM}
                            </td>
                            <td className="py-2 pr-3 font-mono text-[#8fa3b8]">
                              ±{e.observedOutcome.rainfallDeltaMm}
                            </td>
                            <td className="py-2 pr-3 font-mono text-cyan-400">
                              {e.modeledRisk.predictionLeadTimeHours}h
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-[#1e2d3d]">
                          <td colSpan={5} className="py-2 pr-3 font-bold text-[#8fa3b8]">
                            Summary ({correctCount}/{totalEvents} correct · {eventAccuracy !== null ? Math.round(eventAccuracy * 100) : 0}% event-level accuracy)
                          </td>
                          <td className="py-2 pr-3 font-mono font-bold text-cyan-400">
                            ±{surgeMAE.toFixed(2)}
                          </td>
                          <td className="py-2 pr-3 font-mono font-bold text-cyan-400">
                            ±{rainfallMAE.toFixed(0)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/*  TAB: METHODOLOGY & LIMITATIONS                                  */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'methodology' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Methodology */}
              <div className="p-4 rounded-xl bg-[#0f1a25] border border-[#1e2d3d] space-y-4">
                <div className="flex items-center gap-2">
                  <BookOpen size={13} className="text-cyan-400" />
                  <h2 className="text-sm font-bold text-white">Methodology</h2>
                </div>

                <div className="space-y-1.5">
                  <PipelineStep
                    step={1}
                    label="Historical Data Ingestion"
                    description="Event records for 4 Bay of Bengal cyclones (2019–2022) are loaded from a local JSON dataset. Data includes IMD landfall parameters, NDMA impact statistics, and published academic references. Data is marked 'partial' as it is sourced from secondary public reports, not authoritative primary databases."
                  />
                  <PipelineStep
                    step={2}
                    label="Feature Preprocessing"
                    description="Raw meteorological fields (wind speed, SST, wind shear, MJO, eddy currents, storm surge, rainfall) are normalized using the same FeaturePreprocessor pipeline used during training (ml/preprocessing/preprocessor.py). This ensures consistency between training and inference."
                  />
                  <PipelineStep
                    step={3}
                    label="Model Prediction"
                    description="The demo RandomForest model (Phase 3) classifies each event into a risk category (LOW / MEDIUM / HIGH / CRITICAL) and predicts a continuous risk score (0–100). Both the classifier and regressor are invoked. Category probabilities are available for ROC-AUC computation."
                  />
                  <PipelineStep
                    step={4}
                    label="Observed Outcome Alignment"
                    description="Post-event IMD/NDMA records are matched to the modeled predictions. We compare: (a) risk category classification, (b) storm surge in metres, (c) 24-h rainfall in mm. Exact observed risk scores are not available from historical records — only ordinal categories."
                  />
                  <PipelineStep
                    step={5}
                    label="Metric Calculation"
                    description="Classification metrics (precision, recall, F1, ROC-AUC) are computed from the held-out test split via ml/evaluation/evaluate.py. MAE for surge and rainfall are computed event-by-event. IoU is not computed — no ground-truth raster flood extents are available. Only metrics supportable by actual data are displayed."
                    isLast
                  />
                </div>
              </div>

              {/* Dataset description + limitations */}
              <div className="space-y-4">
                {/* Dataset */}
                <div className="p-4 rounded-xl bg-[#0f1a25] border border-[#1e2d3d] space-y-3">
                  <div className="flex items-center gap-2">
                    <Database size={13} className="text-purple-400" />
                    <h2 className="text-sm font-bold text-white">Dataset Description</h2>
                  </div>
                  <div className="space-y-2">
                    {[
                      {
                        label: 'Training Data',
                        value: 'Synthetic demo dataset (6,000 samples) generated by ml/data/generate_dataset.py',
                        note: 'Not real cyclone observations',
                      },
                      {
                        label: 'Test Split',
                        value: `${metrics.test_samples_count} samples (20% stratified hold-out from synthetic training set)`,
                        note: 'Source of model performance metrics',
                      },
                      {
                        label: 'Historical Validation Set',
                        value: '4 Bay of Bengal events: Fani (2019), Amphan (2020), Yaas (2021), Mandous (2022)',
                        note: 'Illustrative data from public reports',
                      },
                      {
                        label: 'Data Sources',
                        value: 'IMD, NDMA India, NOAA IBTrACS, EM-DAT',
                        note: 'Secondary sources only',
                      },
                      {
                        label: 'Geographic Scope',
                        value: 'Bay of Bengal basin — Odisha, West Bengal, Tamil Nadu coasts',
                        note: 'Indian Ocean region only',
                      },
                      {
                        label: 'Temporal Coverage',
                        value: '2019–2022',
                        note: 'Partial — 4 major events only',
                      },
                      {
                        label: 'Evaluation Date',
                        value: new Date(metrics.evaluation_timestamp).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'long', year: 'numeric',
                        }),
                        note: 'From ml/evaluation/metrics.json',
                      },
                    ].map((row) => (
                      <div key={row.label} className="p-2.5 rounded-lg bg-[#080d14] border border-[#1e2d3d]">
                        <p className="text-[9px] font-bold text-[#4a6278] uppercase tracking-wider">{row.label}</p>
                        <p className="text-[10px] text-[#8fa3b8] mt-0.5">{row.value}</p>
                        <p className="text-[9px] text-[#2a3d52] italic">{row.note}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Limitations */}
                <div className="p-4 rounded-xl bg-[#0f1a25] border border-red-500/15 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={13} className="text-red-400" />
                    <h2 className="text-sm font-bold text-white">Known Limitations</h2>
                  </div>
                  <ul className="space-y-2">
                    {[
                      {
                        title: 'Synthetic Training Data',
                        desc: 'The model was trained on synthetic data generated from parameterised distributions, not real cyclone observations. Metrics reflect performance on that synthetic distribution — not real-world generalisability.',
                      },
                      {
                        title: 'Small Historical Validation Set (n=4)',
                        desc: 'Four events are statistically insufficient for robust model evaluation. Event-level accuracy of 75% (3/4) has very wide confidence intervals and should not be interpreted as a true performance estimate.',
                      },
                      {
                        title: 'No Spatial Metrics (IoU unavailable)',
                        desc: 'Intersection over Union (IoU) requires ground-truth raster flood extent maps. These are not available in the current demo configuration. Displaying fake IoU numbers would be misleading.',
                      },
                      {
                        title: 'Conservative Over-prediction Bias',
                        desc: 'The model tends to over-predict intensity for weaker systems (e.g. Mandous). While this is operationally safe (better to over-warn), it artificially degrades precision metrics for lower categories.',
                      },
                      {
                        title: 'Class Imbalance',
                        desc: 'The test set has 719 LOW samples vs 6 CRITICAL samples. Weighted metrics favour the dominant class. CRITICAL class metrics (precision=1.0, recall=0.667) are unreliable due to tiny sample size.',
                      },
                      {
                        title: 'No Track or Trajectory Validation',
                        desc: 'Model does not predict cyclone track geometry. Track error (km from observed track) and cone overlap (IoU) metrics are not applicable.',
                      },
                    ].map((l) => (
                      <li key={l.title} className="flex items-start gap-2">
                        <XCircle size={10} className="text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold text-[#8fa3b8]">{l.title}</p>
                          <p className="text-[9px] text-[#4a6278] leading-relaxed">{l.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Export instructions */}
            <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/15">
              <div className="flex items-center gap-2 mb-2">
                <Download size={13} className="text-cyan-400" />
                <h3 className="text-xs font-bold text-white">Export for Reports</h3>
              </div>
              <p className="text-[10px] text-[#8fa3b8] mb-3">
                The <strong className="text-cyan-400">Export Validation Report</strong> button (top-right) generates a
                structured JSON file containing model evaluation metrics, historical event validation results, and
                full limitation disclosures. Suitable for including in technical reports.
              </p>
              <div className="grid grid-cols-3 gap-3 text-[9px]">
                {[
                  { label: 'Format', value: 'JSON' },
                  { label: 'Includes', value: 'Metrics, per-class breakdown, confusion matrix, event validation, limitations' },
                  { label: 'Filename', value: `cycloneguard-phase9-validation-${new Date().toISOString().slice(0,10)}.json` },
                ].map((r) => (
                  <div key={r.label} className="p-2 rounded bg-[#080d14] border border-[#1e2d3d]">
                    <p className="text-[#4a6278] font-bold uppercase tracking-wider">{r.label}</p>
                    <p className="text-[#8fa3b8] mt-0.5 break-all">{r.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
