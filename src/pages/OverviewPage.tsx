import { lazy, Suspense } from 'react';
import { Wind, Droplets, Waves, Users, Building2, MapPin, Gauge, Bot, Clock, ExternalLink } from 'lucide-react';
import MetricCard from '../components/ui/MetricCard';
import AlertItem from '../components/ui/AlertItem';
import SectionHeader from '../components/ui/SectionHeader';
import RiskDistributionChart from '../components/charts/RiskDistributionChart';
import InfrastructureChart from '../components/charts/InfrastructureChart';
import PopulationExposureChart from '../components/charts/PopulationExposureChart';
import {
  DEMO_CYCLONE_METRICS,
  DEMO_POPULATION,
  DEMO_ALERTS,
  DEMO_RISK_DISTRIBUTION,
  DEMO_INFRASTRUCTURE,
  DEMO_AI_SUMMARY,
} from '../data/mockData';
import { formatNumber, formatRelativeTime, formatCountdown } from '../utils/formatters';
import { getBaselineSummary } from '../services/populationService';

// Phase 6: computed population grid summary (SIMULATED DEMO DATA)
const POP_GRID = getBaselineSummary();

const CycloneMap = lazy(() => import('../components/map/CycloneMap'));

export default function OverviewPage() {
  const metrics = DEMO_CYCLONE_METRICS;
  const pop = DEMO_POPULATION;

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
    <div className="p-5 space-y-5 fade-in">
      {/* Demo Mode Banner */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-amber-400/5 border border-amber-400/20">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 demo-pulse" />
          <span className="text-xs font-bold text-amber-400 tracking-widest uppercase">
            Demo Mode — Simulated Data Only
          </span>
          <span className="text-[10px] text-[#4a6278]">
            No real cyclone data is displayed. All values are for demonstration.
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#4a6278]">
          <Clock size={10} />
          <span>Landfall in: <span className="font-mono text-red-400 font-bold">{formatCountdown(metrics.landfall)}</span></span>
        </div>
      </div>

      {/* ── Metric Cards Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-3">
        <MetricCard
          id="metric-intensity"
          label="Cyclone Intensity"
          value={`CAT ${metrics.intensityCategory}`}
          subValue={metrics.intensityLabel}
          severity="critical"
          icon={<Gauge size={14} />}
          pulse
        />
        <MetricCard
          id="metric-wind"
          label="Wind Speed"
          value={`${metrics.windSpeedKmh}`}
          unit="km/h"
          subValue={`${metrics.windSpeedKnots} knots`}
          severity="critical"
          trend="up"
          trendLabel="+10"
          icon={<Wind size={14} />}
        />
        <MetricCard
          id="metric-rainfall"
          label="Rainfall / 24h"
          value={`${metrics.rainfallMm24h}`}
          unit="mm"
          subValue="Modeled peak"
          severity="high"
          icon={<Droplets size={14} />}
        />
        <MetricCard
          id="metric-surge"
          label="Storm Surge"
          value={`${metrics.stormSurgeM}`}
          unit="m"
          subValue="Above MSL"
          severity="critical"
          trend="up"
          trendLabel="+0.3m"
          icon={<Waves size={14} />}
          pulse
        />
        <MetricCard
          id="metric-population"
          label="Population Exposed"
          value={formatNumber(POP_GRID.total)}
          subValue={`${formatNumber(POP_GRID.critical)} critical-risk`}
          severity="high"
          icon={<Users size={14} />}
        />
        <MetricCard
          id="metric-infrastructure"
          label="Critical Infra At Risk"
          value="31"
          unit="assets"
          subValue="5 bridges flagged"
          severity="high"
          trend="up"
          trendLabel="+4"
          icon={<Building2 size={14} />}
        />
        <MetricCard
          id="metric-highzones"
          label="High-Risk Zones"
          value="31"
          unit="zones"
          subValue="8 critical"
          severity="critical"
          icon={<MapPin size={14} />}
          pulse
        />
      </div>

      {/* ── Main Content Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-5">

        {/* ── Left Column: Map + AI Summary ─────────────────────────────── */}
        <div className="col-span-7 space-y-5">

          {/* Interactive Map */}
          <div className="rounded-xl bg-[#0f1a25] border border-[#1e2d3d] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2d3d]">
              <SectionHeader
                title="Impact Map"
                subtitle="Cyclone VAYU-B · Bay of Bengal · Odisha Coast"
                badge="LEAFLET"
                badgeColor="text-cyan-400 bg-cyan-400/10 border-cyan-400/20"
              />
              <div className="flex items-center gap-3">
                {[
                  { label: 'Track', active: true },
                  { label: 'Surge', active: false },
                  { label: 'Wind', active: false },
                  { label: 'Rain', active: false },
                ].map((tab) => (
                  <button
                    key={tab.label}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
                      tab.active
                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
                        : 'text-[#4a6278] hover:text-[#8fa3b8]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[340px] relative">
              <Suspense
                fallback={
                  <div className="w-full h-full flex items-center justify-center bg-[#080d14]">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-cyan-500/30 mb-3">
                        <MapPin size={18} className="text-cyan-400 animate-pulse" />
                      </div>
                      <p className="text-xs text-[#4a6278]">Loading map…</p>
                    </div>
                  </div>
                }
              >
                <CycloneMap />
              </Suspense>
            </div>

            {/* Cyclone Stats Bar */}
            <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-[#1e2d3d] bg-[#080d14]">
              {[
                { label: 'Pressure', value: `${metrics.centralPressureHpa} hPa` },
                { label: 'Eye Diameter', value: `${metrics.eyeDiameterKm} km` },
                { label: 'Track Speed', value: `${metrics.trackingSpeed} km/h` },
                { label: 'Direction', value: metrics.trackingDirection },
                { label: 'Affected Radius', value: '280 km' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-[9px] text-[#4a6278] uppercase tracking-wider">{stat.label}</p>
                  <p className="text-xs font-bold text-white font-mono mt-0.5">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Situation Summary */}
          <div className="rounded-xl bg-[#0f1a25] border border-purple-500/20 overflow-hidden relative">
            {/* Scan line effect */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent scan-line" />
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-b border-purple-500/15">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/25">
                  <Bot size={14} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">AI Situation Summary</h3>
                  <p className="text-[9px] text-[#4a6278]">Static analysis · Phase 8 deployment pending</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold px-2 py-1 rounded border text-purple-400 bg-purple-400/10 border-purple-400/20 tracking-widest uppercase">
                  AI MODULE — PHASE 8
                </span>
                <span className="text-[9px] text-[#4a6278] font-mono">
                  {DEMO_AI_SUMMARY.confidence}% confidence
                </span>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-sm font-semibold text-white leading-snug">
                {DEMO_AI_SUMMARY.headline}
              </p>
              <p className="text-xs text-[#8fa3b8] leading-relaxed whitespace-pre-line">
                {DEMO_AI_SUMMARY.body}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-[#1e2d3d]">
                <div className="flex items-center gap-4">
                  <div className="text-[9px] text-[#4a6278]">
                    Model: <span className="text-[#8fa3b8] font-mono">{DEMO_AI_SUMMARY.modelVersion}</span>
                  </div>
                  <div className="text-[9px] text-[#4a6278]">
                    Generated: <span className="text-[#8fa3b8]">{formatRelativeTime(DEMO_AI_SUMMARY.generatedAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1 rounded-full bg-[#080d14] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-purple-400"
                      style={{ width: `${DEMO_AI_SUMMARY.confidence}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-purple-400">{DEMO_AI_SUMMARY.confidence}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Charts + Alerts ─────────────────────────────── */}
        <div className="col-span-5 space-y-5">

          {/* Risk Overview */}
          <div className="p-4 rounded-xl bg-[#0f1a25] border border-[#1e2d3d]">
            <SectionHeader
              title="Risk Distribution"
              subtitle="Zone-level severity classification"
            />
            <RiskDistributionChart data={DEMO_RISK_DISTRIBUTION} />
          </div>

          {/* Infrastructure Exposure */}
          <div className="p-4 rounded-xl bg-[#0f1a25] border border-[#1e2d3d]">
            <SectionHeader
              title="Infrastructure Exposure"
              subtitle="Assets within projected impact zone"
            />
            <InfrastructureChart data={DEMO_INFRASTRUCTURE} />
          </div>

          {/* Population Stats — Phase 6 grid-computed */}
          <div className="p-4 rounded-xl bg-[#0f1a25] border border-[#1e2d3d]">
            <div className="flex items-center justify-between mb-3">
              <SectionHeader
                title="Population Exposure"
                subtitle={`Phase 6 · ${POP_GRID.cellCount} grid cells · Odisha Coast`}
              />
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">DEMO DATA</span>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1e2d3d]">
              <div>
                <span className="text-[10px] text-[#8fa3b8] font-semibold block">Total Exposed</span>
                <span className="text-[9px] text-[#4a6278]">Across all risk tiers</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-black font-mono text-white">{formatNumber(POP_GRID.total)}</span>
                <span className="text-[9px] text-[#4a6278] block">{POP_GRID.criticalCells + POP_GRID.highCells} high/critical cells</span>
              </div>
            </div>

            {/* Chart */}
            <PopulationExposureChart summary={POP_GRID} height={120} showLegend={false} />

            {/* Evacuated + Shelter */}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-[#1e2d3d]">
              <div className="p-2 rounded bg-[#080d14] border border-[#162030]">
                <p className="text-sm font-bold font-mono text-cyan-400">{formatNumber(pop.evacuated)}</p>
                <p className="text-[9px] text-[#4a6278]">Evacuated</p>
              </div>
              <div className="p-2 rounded bg-[#080d14] border border-[#162030]">
                <p className="text-sm font-bold font-mono text-green-400">{formatNumber(pop.shelterCapacity)}</p>
                <p className="text-[9px] text-[#4a6278]">Shelter Cap.</p>
              </div>
            </div>

            {/* Link to full page */}
            <a
              href="/population"
              className="mt-2 flex items-center justify-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <ExternalLink size={10} /> View Full Population Exposure Dashboard
            </a>
          </div>

          {/* Active Alerts */}
          <div className="p-4 rounded-xl bg-[#0f1a25] border border-[#1e2d3d]">
            <SectionHeader
              title="Active Alerts"
              subtitle={`${DEMO_ALERTS.filter(a => a.status === 'active').length} active · ${DEMO_ALERTS.filter(a => a.severity === 'critical').length} critical`}
              badge="LIVE"
              badgeColor="text-red-400 bg-red-400/10 border-red-400/20"
            />
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {DEMO_ALERTS.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
