import { useState, useEffect, useCallback, useId, useMemo } from 'react';
import {
  Wind,
  Droplets,
  Waves,
  Navigation,
  Play,
  RotateCcw,
  History,
  AlertTriangle,
  Building2,
  Users,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Sliders,
  Server,
  Zap,
} from 'lucide-react';
import SectionHeader from '../components/ui/SectionHeader';
import ScenarioMap from '../components/map/ScenarioMap';
import {
  runImpactSimulation,
  fetchBaselineMetrics,
  type SimulationScenarioInput,
  type ScenarioSimulationResponse,
  type SimulationHistoryItem,
} from '../services/simulationApi';
import {
  applyScenario,
  computeSummary,
  getBaselineSummary,
} from '../services/populationService';
import type { PopulationGridSummary } from '../types';

interface ComparisonCardProps {
  id: string;
  title: string;
  baseline: number;
  scenario: number;
  delta: number;
  percentChange: number;
  unit?: string;
  icon: React.ReactNode;
  severityColor?: string;
}

function ComparisonCard({
  id,
  title,
  baseline,
  scenario,
  delta,
  percentChange,
  unit = '',
  icon,
  severityColor = 'text-rose-400',
}: ComparisonCardProps) {
  const isIncreased = delta > 0;
  const isDecreased = delta < 0;
  const isUnchanged = delta === 0;

  // Max for ratio bar
  const maxVal = Math.max(1, baseline, scenario);
  const baselinePct = Math.round((baseline / maxVal) * 100);
  const scenarioPct = Math.round((scenario / maxVal) * 100);

  return (
    <div
      id={id}
      className="p-3.5 rounded-xl bg-[#0b131e] border border-[#1e2d3d] hover:border-[#2a3f55] transition-all flex flex-col justify-between"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#142132] text-slate-300 border border-[#1e2d3d]">
            {icon}
          </div>
          <span className="text-xs font-semibold text-slate-200">{title}</span>
        </div>
        {/* Delta Badge */}
        {!isUnchanged ? (
          <span
            className={`flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
              isIncreased
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isIncreased ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {isIncreased ? '+' : ''}
            {delta.toLocaleString()} ({isIncreased ? '+' : ''}
            {percentChange}%)
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-800 text-slate-400 border border-slate-700">
            No change (0%)
          </span>
        )}
      </div>

      {/* Before / After Columns */}
      <div className="grid grid-cols-2 gap-2 my-2 py-2 px-2.5 rounded-lg bg-[#080d14]/70 border border-[#172435]">
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
            Baseline
          </span>
          <span className="text-sm font-bold font-mono text-slate-300">
            {baseline.toLocaleString()} {unit}
          </span>
        </div>
        <div className="border-l border-[#1e2d3d] pl-2.5">
          <span className="text-[10px] text-amber-400 uppercase tracking-wider block font-medium">
            Scenario
          </span>
          <span className={`text-sm font-bold font-mono ${isIncreased ? severityColor : isDecreased ? 'text-emerald-400' : 'text-slate-200'}`}>
            {scenario.toLocaleString()} {unit}
          </span>
        </div>
      </div>

      {/* Comparison Progress Bar */}
      <div className="space-y-1 mt-1">
        <div className="flex items-center justify-between text-[9px] text-slate-400">
          <span>Baseline</span>
          <span className="font-mono text-slate-300">{baselinePct}%</span>
        </div>
        <div className="h-1.5 w-full bg-[#152334] rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-500 rounded-full transition-all duration-300"
            style={{ width: `${baselinePct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
          <span>Scenario</span>
          <span className={`font-mono ${isIncreased ? 'text-rose-400' : 'text-emerald-400'}`}>
            {scenarioPct}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-[#152334] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isIncreased ? 'bg-rose-500' : isDecreased ? 'bg-emerald-500' : 'bg-cyan-500'
            }`}
            style={{ width: `${scenarioPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

const PRESET_SCENARIOS: Array<{
  name: string;
  description: string;
  badge: string;
  values: SimulationScenarioInput;
}> = [
  {
    name: 'Cat 5 Intensification',
    description: 'Catastrophic sustained winds + extreme 4.9m surge with slight westward drift',
    badge: 'Worst Case',
    values: {
      wind_speed: 255,
      rainfall: 450,
      storm_surge: 4.9,
      track_offset_km: -15,
      scenario_name: 'Cat 5 Intensification',
    },
  },
  {
    name: 'Inland Track Shift (West)',
    description: 'Track steers 35km inland toward Bhubaneswar/Cuttack urban corridor',
    badge: 'Urban Threat',
    values: {
      wind_speed: 220,
      rainfall: 360,
      storm_surge: 3.8,
      track_offset_km: -35,
      scenario_name: 'Inland Track Shift (West)',
    },
  },
  {
    name: 'Offshore Track Shift (East)',
    description: 'Cyclone shifts 40km offshore into Bay of Bengal, reducing direct inland surge',
    badge: 'Reduced Landfall',
    values: {
      wind_speed: 210,
      rainfall: 220,
      storm_surge: 2.8,
      track_offset_km: 40,
      scenario_name: 'Offshore Track Shift (East)',
    },
  },
  {
    name: 'Extreme Surge Event',
    description: 'Peak astronomical high tide synchronization driving 5.0m coastal wave runup',
    badge: 'Surge Max',
    values: {
      wind_speed: 230,
      rainfall: 320,
      storm_surge: 5.0,
      track_offset_km: 0,
      scenario_name: 'Extreme Surge Event',
    },
  },
  {
    name: 'Rapid Weakening (Cat 2)',
    description: 'Cold sea-surface temperature upwelling and wind shear down to 120 km/h',
    badge: 'Weakened',
    values: {
      wind_speed: 120,
      rainfall: 160,
      storm_surge: 1.8,
      track_offset_km: 0,
      scenario_name: 'Rapid Weakening (Cat 2)',
    },
  },
];

export default function ScenarioSimulatorPage() {
  const windInputId = useId();
  const rainInputId = useId();
  const surgeInputId = useId();
  const offsetInputId = useId();

  // Control parameters state with safe defaults (Baseline)
  const [windSpeed, setWindSpeed] = useState<number>(220);
  const [rainfall, setRainfall] = useState<number>(284);
  const [stormSurge, setStormSurge] = useState<number>(4.2);
  const [trackOffsetKm, setTrackOffsetKm] = useState<number>(0);

  // Simulation execution & response state
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<ScenarioSimulationResponse | null>(null);
  const [backendActive, setBackendActive] = useState<boolean>(true);

  // Phase 6: population grid state
  const baselinePop6 = useMemo(() => getBaselineSummary(), []);
  const [scenarioPop6, setScenarioPop6] = useState<PopulationGridSummary>(baselinePop6);

  // Simulation History state
  const [history, setHistory] = useState<SimulationHistoryItem[]>([
    {
      id: 'sim-hist-1',
      name: 'Scenario 1: Baseline Official Forecast',
      timestamp: 'Initial Forecast',
      parameters: { wind_speed: 220, rainfall: 284, storm_surge: 4.2, track_offset_km: 0 },
      scenarioMetrics: {
        population_exposed: 685000,
        high_risk_population: 124000,
        high_risk_zones_count: 1,
        critical_infrastructure_at_risk: 8,
        roads_exposed: 2,
        bridges_exposed: 0,
        hospitals_exposed: 1,
        power_assets_exposed: 0,
        shelters_exposed: 1,
      },
      deltas: {
        population_exposed: { baseline: 685000, scenario: 685000, delta: 0, percent_change: 0 },
        high_risk_population: { baseline: 124000, scenario: 124000, delta: 0, percent_change: 0 },
        high_risk_zones_count: { baseline: 1, scenario: 1, delta: 0, percent_change: 0 },
        critical_infrastructure_at_risk: { baseline: 8, scenario: 8, delta: 0, percent_change: 0 },
        roads_exposed: { baseline: 2, scenario: 2, delta: 0, percent_change: 0 },
        bridges_exposed: { baseline: 0, scenario: 0, delta: 0, percent_change: 0 },
        hospitals_exposed: { baseline: 1, scenario: 1, delta: 0, percent_change: 0 },
        power_assets_exposed: { baseline: 0, scenario: 0, delta: 0, percent_change: 0 },
        shelters_exposed: { baseline: 1, scenario: 1, delta: 0, percent_change: 0 },
      },
    },
  ]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    fetchBaselineMetrics()
      .then((_baseline) => {
        if (!mounted) return;
        setBackendActive(true);
        // Execute initial baseline simulation to populate cards
        runImpactSimulation({
          wind_speed: 220,
          rainfall: 284,
          storm_surge: 4.2,
          track_offset_km: 0,
          scenario_name: 'Baseline Forecast',
        }).then((res) => {
          if (mounted) setSimulationResult(res);
        });
      })
      .catch(() => {
        if (mounted) setBackendActive(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Run Simulation Handler
  const handleRunSimulation = useCallback(
    async (overrideParams?: SimulationScenarioInput) => {
      setIsSimulating(true);

      const params: SimulationScenarioInput = overrideParams || {
        wind_speed: Number(windSpeed),
        rainfall: Number(rainfall),
        storm_surge: Number(stormSurge),
        track_offset_km: Number(trackOffsetKm),
        scenario_name: `Scenario ${history.length + 1} (${windSpeed} km/h, ${stormSurge}m, ${trackOffsetKm > 0 ? `+${trackOffsetKm}` : trackOffsetKm}km)`,
      };

      try {
        const res = await runImpactSimulation(params);
        setSimulationResult(res);

        // Phase 6: re-score population grid under this scenario
        const scenCells = applyScenario(
          params.wind_speed,
          params.rainfall,
          params.storm_surge,
          params.track_offset_km
        );
        setScenarioPop6(computeSummary(scenCells));

        // Append to history
        const newHistItem: SimulationHistoryItem = {
          id: res.scenario_id,
          name: res.scenario_name || `Scenario ${history.length + 1}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          parameters: params,
          scenarioMetrics: res.scenario_metrics,
          deltas: res.deltas,
        };

        setHistory((prev) => [newHistItem, ...prev.slice(0, 7)]); // Keep up to 8 historical runs
      } catch (err) {
        console.error('Error running simulation:', err);
      } finally {
        setIsSimulating(false);
      }
    },
    [windSpeed, rainfall, stormSurge, trackOffsetKm, history.length]
  );

  // Apply Preset
  const handleApplyPreset = (preset: typeof PRESET_SCENARIOS[0]) => {
    setWindSpeed(preset.values.wind_speed);
    setRainfall(preset.values.rainfall);
    setStormSurge(preset.values.storm_surge);
    setTrackOffsetKm(preset.values.track_offset_km);
    handleRunSimulation(preset.values);
  };

  // Reopen Historical Simulation
  const handleReopenSimulation = (item: SimulationHistoryItem) => {
    setWindSpeed(item.parameters.wind_speed);
    setRainfall(item.parameters.rainfall);
    setStormSurge(item.parameters.storm_surge);
    setTrackOffsetKm(item.parameters.track_offset_km);
    handleRunSimulation(item.parameters);
  };

  // Reset to Baseline
  const handleResetBaseline = () => {
    setWindSpeed(220);
    setRainfall(284);
    setStormSurge(4.2);
    setTrackOffsetKm(0);
    setScenarioPop6(baselinePop6);
    handleRunSimulation({
      wind_speed: 220,
      rainfall: 284,
      storm_surge: 4.2,
      track_offset_km: 0,
      scenario_name: 'Baseline Forecast',
    });
  };

  // Category label helper
  const getCategoryLabel = (w: number) => {
    if (w >= 250) return { cat: 'CAT 5', color: 'text-red-400 bg-red-500/10 border-red-500/30' };
    if (w >= 210) return { cat: 'CAT 4', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
    if (w >= 165) return { cat: 'CAT 3', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' };
    if (w >= 120) return { cat: 'CAT 2', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    return { cat: 'CAT 1', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
  };

  const currentCat = getCategoryLabel(windSpeed);

  // Active metrics
  const baseline = simulationResult?.baseline_metrics || {
    population_exposed: 685000,
    high_risk_population: 124000,
    high_risk_zones_count: 1,
    critical_infrastructure_at_risk: 8,
    roads_exposed: 2,
    bridges_exposed: 0,
    hospitals_exposed: 1,
    power_assets_exposed: 0,
    shelters_exposed: 1,
  };

  const scenario = simulationResult?.scenario_metrics || baseline;
  const deltas = simulationResult?.deltas;

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-[#050a10]">
      <div className="p-5 space-y-5 max-w-7xl mx-auto">
        {/* ── Official Disclaimer Banner (Prompt Requirement) ──────────────── */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-300 tracking-wider uppercase">
                  SIMULATED SCENARIO — NOT AN OFFICIAL FORECAST
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30 font-semibold">
                  DECISION-SUPPORT ONLY
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                This interactive tool simulates theoretical cyclone hazard variations for pre-landfall planning and asset staging. Do not present or treat simulated scenario outputs as real meteorological forecasts.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-[#0d1622] px-2.5 py-1 rounded-md border border-[#1e2d3d]">
              <Server size={10} className={backendActive ? 'text-emerald-400' : 'text-amber-400'} />
              <span>{backendActive ? 'FastAPI ML Engine Connected' : 'Local Calibrated Baseline'}</span>
            </span>
          </div>
        </div>

        {/* ── Main Layout: Controls & Presets ───────────────────────────────── */}
        <div className="grid grid-cols-12 gap-5">
          {/* Left Column: Sliders & Controls (5 cols) */}
          <div className="col-span-12 lg:col-span-5 space-y-4">
            <div className="p-4 rounded-xl bg-[#0b131e] border border-[#1e2d3d] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1e2d3d]">
                <div className="flex items-center gap-2">
                  <Sliders size={16} className="text-cyan-400" />
                  <h3 className="text-sm font-bold text-white tracking-tight">Scenario Controls</h3>
                </div>
                <button
                  onClick={handleResetBaseline}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  title="Reset to official forecast baseline"
                >
                  <RotateCcw size={11} /> Reset Baseline
                </button>
              </div>

              {/* Control 1: Wind Speed */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor={windInputId} className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <Wind size={13} className="text-cyan-400" /> Wind Speed
                  </label>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${currentCat.color}`}>
                      {currentCat.cat}
                    </span>
                    <div className="flex items-center bg-[#070d15] border border-[#1e2d3d] rounded px-1.5 py-0.5">
                      <input
                        id={windInputId}
                        type="number"
                        min={90}
                        max={260}
                        step={5}
                        value={windSpeed}
                        onChange={(e) => setWindSpeed(Number(e.target.value))}
                        className="w-12 bg-transparent text-right font-mono text-xs font-bold text-white focus:outline-hidden"
                      />
                      <span className="text-[10px] text-slate-400 ml-1">km/h</span>
                    </div>
                  </div>
                </div>
                <input
                  type="range"
                  min={90}
                  max={260}
                  step={5}
                  value={windSpeed}
                  onChange={(e) => setWindSpeed(Number(e.target.value))}
                  className="w-full accent-cyan-400 bg-[#162334] h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>90 km/h (Safe min)</span>
                  <span className="text-cyan-400 font-bold">220 km/h (Baseline)</span>
                  <span>260 km/h (Safe max)</span>
                </div>
              </div>

              {/* Control 2: Rainfall */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor={rainInputId} className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <Droplets size={13} className="text-blue-400" /> 24h Rainfall
                  </label>
                  <div className="flex items-center bg-[#070d15] border border-[#1e2d3d] rounded px-1.5 py-0.5">
                    <input
                      id={rainInputId}
                      type="number"
                      min={100}
                      max={500}
                      step={10}
                      value={rainfall}
                      onChange={(e) => setRainfall(Number(e.target.value))}
                      className="w-12 bg-transparent text-right font-mono text-xs font-bold text-white focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400 ml-1">mm</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={100}
                  max={500}
                  step={10}
                  value={rainfall}
                  onChange={(e) => setRainfall(Number(e.target.value))}
                  className="w-full accent-blue-400 bg-[#162334] h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>100 mm (Safe min)</span>
                  <span className="text-blue-400 font-bold">284 mm (Baseline)</span>
                  <span>500 mm (Safe max)</span>
                </div>
              </div>

              {/* Control 3: Storm Surge */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor={surgeInputId} className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <Waves size={13} className="text-rose-400" /> Storm Surge
                  </label>
                  <div className="flex items-center bg-[#070d15] border border-[#1e2d3d] rounded px-1.5 py-0.5">
                    <input
                      id={surgeInputId}
                      type="number"
                      min={0}
                      max={5}
                      step={0.1}
                      value={stormSurge}
                      onChange={(e) => setStormSurge(Number(e.target.value))}
                      className="w-12 bg-transparent text-right font-mono text-xs font-bold text-white focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400 ml-1">m</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.1}
                  value={stormSurge}
                  onChange={(e) => setStormSurge(Number(e.target.value))}
                  className="w-full accent-rose-400 bg-[#162334] h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>0.0 m (Safe min)</span>
                  <span className="text-rose-400 font-bold">4.2 m (Baseline)</span>
                  <span>5.0 m (Safe max)</span>
                </div>
              </div>

              {/* Control 4: Cyclone Track Offset */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor={offsetInputId} className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <Navigation size={13} className="text-amber-400" /> Track Offset
                  </label>
                  <div className="flex items-center bg-[#070d15] border border-[#1e2d3d] rounded px-1.5 py-0.5">
                    <input
                      id={offsetInputId}
                      type="number"
                      min={-50}
                      max={50}
                      step={5}
                      value={trackOffsetKm}
                      onChange={(e) => setTrackOffsetKm(Number(e.target.value))}
                      className="w-12 bg-transparent text-right font-mono text-xs font-bold text-white focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400 ml-1">km</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  step={5}
                  value={trackOffsetKm}
                  onChange={(e) => setTrackOffsetKm(Number(e.target.value))}
                  className="w-full accent-amber-400 bg-[#162334] h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span className="text-amber-400 font-medium">◀ -50km (West/Inland)</span>
                  <span className="text-slate-300 font-bold">0km (Baseline)</span>
                  <span className="text-cyan-400 font-medium">+50km (East/Offshore) ▶</span>
                </div>
              </div>

              {/* Primary Action Button: RUN IMPACT SIMULATION */}
              <button
                id="btn-run-simulation"
                onClick={() => handleRunSimulation()}
                disabled={isSimulating}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSimulating ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    <span>Recalculating Modeled Impact...</span>
                  </>
                ) : (
                  <>
                    <Play size={14} className="fill-current" />
                    <span>Run Impact Simulation</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Presets */}
            <div className="p-3.5 rounded-xl bg-[#0b131e] border border-[#1e2d3d] space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick Scenario Presets
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {PRESET_SCENARIOS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handleApplyPreset(preset)}
                    className="p-2 rounded-lg bg-[#080d14] hover:bg-[#101b29] border border-[#172435] hover:border-cyan-500/40 text-left transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300">
                          {preset.name}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                        {preset.description}
                      </p>
                    </div>
                    <ArrowRight size={13} className="text-slate-500 group-hover:text-cyan-400 transition-transform group-hover:translate-x-0.5 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Scenario Map Visualization (7 cols) */}
          <div className="col-span-12 lg:col-span-7 flex flex-col space-y-2">
            <SectionHeader
              title="Spatial Risk Area Visualization"
              subtitle="Map recalculates risk zone expansion and track offset trajectory based on modeled physics."
              badge="Interactive Map"
            />
            <div className="flex-1 min-h-[460px]">
              <ScenarioMap
                scenarioZones={simulationResult?.risk_zones}
                baselineTrack={simulationResult?.baseline_track}
                shiftedTrack={simulationResult?.shifted_track}
                trackOffsetKm={trackOffsetKm}
                simulatedWind={windSpeed}
                simulatedSurge={stormSurge}
                isSimulating={isSimulating}
              />
            </div>
          </div>
        </div>

        {/* ── BASELINE vs SCENARIO Comparison Section ──────────────────────── */}
        <div className="space-y-3">
          <SectionHeader
            title="Baseline vs Scenario Impact Comparison"
            subtitle="Side-by-side evaluation of critical indicators recalculated by the CycloneGuard Risk Engine."
            badge="Modeled Deltas"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Population Exposed */}
            <ComparisonCard
              id="compare-pop-exposed"
              title="Population Exposed"
              baseline={baseline.population_exposed}
              scenario={scenario.population_exposed}
              delta={deltas?.population_exposed.delta || 0}
              percentChange={deltas?.population_exposed.percent_change || 0}
              icon={<Users size={14} />}
              severityColor="text-rose-400"
            />

            {/* 2. High-Risk Zones */}
            <ComparisonCard
              id="compare-risk-zones"
              title="High-Risk Zones"
              baseline={baseline.high_risk_zones_count}
              scenario={scenario.high_risk_zones_count}
              delta={deltas?.high_risk_zones_count.delta || 0}
              percentChange={deltas?.high_risk_zones_count.percent_change || 0}
              unit="zones"
              icon={<ShieldAlert size={14} />}
              severityColor="text-rose-400"
            />

            {/* 3. Critical Infrastructure */}
            <ComparisonCard
              id="compare-critical-infra"
              title="Critical Infrastructure"
              baseline={baseline.critical_infrastructure_at_risk}
              scenario={scenario.critical_infrastructure_at_risk}
              delta={deltas?.critical_infrastructure_at_risk.delta || 0}
              percentChange={deltas?.critical_infrastructure_at_risk.percent_change || 0}
              unit="assets"
              icon={<Building2 size={14} />}
              severityColor="text-rose-400"
            />

            {/* 4. Roads Exposed */}
            <ComparisonCard
              id="compare-roads-exposed"
              title="Roads Exposed"
              baseline={baseline.roads_exposed}
              scenario={scenario.roads_exposed}
              delta={deltas?.roads_exposed.delta || 0}
              percentChange={deltas?.roads_exposed.percent_change || 0}
              unit="corridors"
              icon={<Navigation size={14} />}
              severityColor="text-amber-400"
            />

            {/* 5. Bridges Exposed */}
            <ComparisonCard
              id="compare-bridges-exposed"
              title="Bridges Exposed"
              baseline={baseline.bridges_exposed}
              scenario={scenario.bridges_exposed}
              delta={deltas?.bridges_exposed.delta || 0}
              percentChange={deltas?.bridges_exposed.percent_change || 0}
              unit="bridges"
              icon={<Building2 size={14} />}
              severityColor="text-amber-400"
            />

            {/* 6. Hospitals Exposed */}
            <ComparisonCard
              id="compare-hospitals-exposed"
              title="Hospitals Exposed"
              baseline={baseline.hospitals_exposed}
              scenario={scenario.hospitals_exposed}
              delta={deltas?.hospitals_exposed.delta || 0}
              percentChange={deltas?.hospitals_exposed.percent_change || 0}
              unit="hospitals"
              icon={<Building2 size={14} />}
              severityColor="text-rose-400"
            />

            {/* 7. Power Assets Exposed */}
            <ComparisonCard
              id="compare-power-exposed"
              title="Power Assets Exposed"
              baseline={baseline.power_assets_exposed}
              scenario={scenario.power_assets_exposed}
              delta={deltas?.power_assets_exposed.delta || 0}
              percentChange={deltas?.power_assets_exposed.percent_change || 0}
              unit="substations"
              icon={<Zap size={14} />}
              severityColor="text-amber-400"
            />

            {/* 8. Shelters Exposed */}
            <ComparisonCard
              id="compare-shelters-exposed"
              title="Shelters Exposed"
              baseline={baseline.shelters_exposed}
              scenario={scenario.shelters_exposed}
              delta={deltas?.shelters_exposed.delta || 0}
              percentChange={deltas?.shelters_exposed.percent_change || 0}
              unit="shelters"
              icon={<ShieldAlert size={14} />}
              severityColor="text-cyan-400"
            />
          </div>
        </div>

        {/* ── Phase 6: Population Exposure Grid Section ─────────────────────── */}
        <div className="p-4 rounded-xl bg-[#0b131e] border border-[#1e2d3d] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e2d3d]">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Population Exposure Grid</h3>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">PHASE 6 · 46 CELLS</span>
            </div>
            <span className="text-[9px] font-mono text-amber-400">SIMULATED DEMO DATA</span>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {/* Total */}
            <div className="col-span-1 flex flex-col gap-1 p-3 rounded-xl bg-[#080d14] border border-cyan-500/20">
              <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest">Total</span>
              <span className="text-xl font-black font-mono text-white">
                {scenarioPop6.total >= 1_000_000
                  ? `${(scenarioPop6.total / 1_000_000).toFixed(2)}M`
                  : `${(scenarioPop6.total / 1_000).toFixed(0)}K`}
              </span>
              {scenarioPop6.total !== baselinePop6.total && (
                <span className={`text-[10px] font-mono font-bold ${
                  scenarioPop6.total > baselinePop6.total ? 'text-rose-400' : 'text-green-400'
                }`}>
                  {scenarioPop6.total > baselinePop6.total ? '+' : ''}
                  {(((scenarioPop6.total - baselinePop6.total) / baselinePop6.total) * 100).toFixed(1)}%
                </span>
              )}
            </div>

            {/* Critical / High / Medium / Low */}
            {[
              { key: 'critical' as const, label: 'Critical', color: '#ef4444', textCls: 'text-red-400' },
              { key: 'high'     as const, label: 'High',     color: '#f97316', textCls: 'text-orange-400' },
              { key: 'medium'   as const, label: 'Medium',   color: '#f59e0b', textCls: 'text-amber-400' },
              { key: 'low'      as const, label: 'Low',      color: '#22c55e', textCls: 'text-green-400' },
            ].map(({ key, label, color, textCls }) => {
              const s = scenarioPop6[key];
              const b = baselinePop6[key];
              const delta = s - b;
              const pctKey = (key + 'Pct') as 'criticalPct' | 'highPct' | 'mediumPct' | 'lowPct';
              return (
                <div key={key} className="flex flex-col gap-1 p-3 rounded-xl bg-[#080d14] border" style={{ borderColor: `${color}25` }}>
                  <span className={`text-[9px] font-bold uppercase tracking-widest ${textCls}`}>{label}</span>
                  <span className={`text-lg font-black font-mono ${textCls}`}>
                    {s >= 1_000_000 ? `${(s / 1_000_000).toFixed(1)}M` : `${(s / 1_000).toFixed(1)}K`}
                  </span>
                  <div className="h-1 rounded-full bg-[#152030] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${scenarioPop6[pctKey]}%`, backgroundColor: color }} />
                  </div>
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-slate-500">{scenarioPop6[pctKey].toFixed(1)}%</span>
                    {delta !== 0 && (
                      <span className={delta > 0 ? 'text-rose-400 font-bold' : 'text-green-400 font-bold'}>
                        {delta > 0 ? '+' : ''}{(delta / 1000).toFixed(1)}K
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mini tier comparison bars */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 pt-1">
            {[
              { key: 'critical' as const, label: 'Critical', color: '#ef4444' },
              { key: 'high'     as const, label: 'High',     color: '#f97316' },
              { key: 'medium'   as const, label: 'Medium',   color: '#f59e0b' },
              { key: 'low'      as const, label: 'Low',      color: '#22c55e' },
            ].map(({ key, label, color }) => {
              const bVal = baselinePop6[key];
              const sVal = scenarioPop6[key];
              const maxV = Math.max(bVal, sVal, 1);
              return (
                <div key={key} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[9px] text-slate-500">
                    <span>{label} Baseline vs Scenario</span>
                    <span className="font-mono text-slate-400">
                      {(bVal/1000).toFixed(1)}K → {(sVal/1000).toFixed(1)}K
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <div className="h-1 rounded-full bg-[#152030] overflow-hidden">
                      <div className="h-full rounded-full bg-cyan-500/60" style={{ width: `${(bVal/maxV)*100}%` }} />
                    </div>
                    <div className="h-1 rounded-full bg-[#152030] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(sVal/maxV)*100}%`, backgroundColor: color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[9px] text-[#4a6278] font-mono text-center">
            Population figures are SIMULATED DEMO DATA · Phase 6 · 46 grid cells · CycloneGuard AI
          </p>
        </div>

        {/* ── Simulation History Section (Prompt Requirement) ──────────────── */}
        <div className="p-4 rounded-xl bg-[#0b131e] border border-[#1e2d3d] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e2d3d]">
            <div className="flex items-center gap-2">
              <History size={16} className="text-cyan-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">Simulation History</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {history.length} scenario{history.length === 1 ? '' : 's'} recorded
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {history.map((item, index) => (
              <div
                key={item.id}
                className="p-3 rounded-lg bg-[#080d14] border border-[#172435] hover:border-cyan-500/30 transition-all flex flex-col justify-between space-y-2"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">
                      Scenario {history.length - index}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">{item.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-cyan-400 font-medium mt-0.5">{item.name}</p>

                  <div className="grid grid-cols-2 gap-1.5 mt-2 text-[10px] text-slate-400 bg-[#0d1622] p-2 rounded border border-[#162334]">
                    <div>
                      <span>Wind:</span> <span className="font-mono text-white">{item.parameters.wind_speed} km/h</span>
                    </div>
                    <div>
                      <span>Surge:</span> <span className="font-mono text-white">{item.parameters.storm_surge} m</span>
                    </div>
                    <div>
                      <span>Rain:</span> <span className="font-mono text-white">{item.parameters.rainfall} mm</span>
                    </div>
                    <div>
                      <span>Offset:</span> <span className="font-mono text-white">{item.parameters.track_offset_km} km</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#172435]">
                  <span className="text-[10px] text-slate-400">
                    Infra at risk: <strong className="text-rose-400 font-mono">{item.scenarioMetrics.critical_infrastructure_at_risk}</strong>
                  </span>
                  <button
                    onClick={() => handleReopenSimulation(item)}
                    className="px-2.5 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold transition-all cursor-pointer"
                  >
                    Reopen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
