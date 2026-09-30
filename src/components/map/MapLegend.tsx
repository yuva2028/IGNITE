import type { LayerConfig, LayerId } from '../../types';

interface MapLegendProps {
  layers: LayerConfig[];
  visibleLayers: Record<LayerId, boolean>;
  onToggleLayer: (id: LayerId) => void;
  onResetView: () => void;
  onFitZones: () => void;
}

const SEVERITY_ITEMS = [
  { color: '#ef4444', label: 'Critical Risk',  bg: 'rgba(239,68,68,0.12)' },
  { color: '#f97316', label: 'High Risk',      bg: 'rgba(249,115,22,0.10)' },
  { color: '#f59e0b', label: 'Medium Risk',    bg: 'rgba(245,158,11,0.10)' },
  { color: '#22c55e', label: 'Low Risk',       bg: 'rgba(34,197,94,0.08)'  },
];

export default function MapLegend({
  layers,
  visibleLayers,
  onToggleLayer,
  onResetView,
  onFitZones,
}: MapLegendProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Demo badge */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-400/8 border border-amber-400/20">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 demo-pulse shrink-0" />
        <span className="text-[8px] font-bold text-amber-400 tracking-widest uppercase">
          Demo / Simulated Data
        </span>
      </div>

      {/* Layer Toggles */}
      <div>
        <p className="text-[8px] font-bold text-[#4a6278] uppercase tracking-widest mb-2">
          Map Layers
        </p>
        <div className="space-y-1">
          {layers.map((layer) => {
            const isOn = visibleLayers[layer.id];
            return (
              <button
                key={layer.id}
                id={`layer-toggle-${layer.id}`}
                onClick={() => onToggleLayer(layer.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-all duration-150 ${
                  isOn
                    ? 'bg-[#141f2e] border border-[#1e2d3d]'
                    : 'bg-transparent border border-transparent opacity-40 hover:opacity-60'
                }`}
              >
                {/* Color swatch */}
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0 transition-opacity"
                  style={{
                    backgroundColor: isOn ? layer.color : '#2a3d52',
                    boxShadow: isOn ? `0 0 6px ${layer.color}60` : 'none',
                  }}
                />
                <span className={`text-[10px] font-medium flex-1 truncate ${isOn ? 'text-[#e2eaf4]' : 'text-[#4a6278]'}`}>
                  {layer.label}
                </span>
                {/* Toggle pill */}
                <span
                  className={`flex-shrink-0 w-7 h-3.5 rounded-full transition-colors relative ${
                    isOn ? 'bg-cyan-500/40' : 'bg-[#1e2d3d]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all ${
                      isOn ? 'left-3.5 bg-cyan-400' : 'left-0.5 bg-[#4a6278]'
                    }`}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Risk Zone Legend */}
      <div>
        <p className="text-[8px] font-bold text-[#4a6278] uppercase tracking-widest mb-2">
          Risk Legend
        </p>
        <div className="space-y-1">
          {SEVERITY_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-sm shrink-0 border"
                style={{
                  backgroundColor: item.bg,
                  borderColor: item.color,
                }}
              />
              <span className="text-[10px] text-[#8fa3b8]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Track Legend */}
      <div>
        <p className="text-[8px] font-bold text-[#4a6278] uppercase tracking-widest mb-2">
          Cyclone Track
        </p>
        <div className="space-y-1.5">
          {[
            { color: '#ef4444', dash: false,  label: 'Current Position' },
            { color: '#8fa3b8', dash: true,   label: 'Historic Track' },
            { color: '#00d4ff', dash: true,   label: 'Forecast Track' },
            { color: '#ef4444', dash: true,   label: 'Uncertainty Cone' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="w-5 h-0 border-t-2 shrink-0" style={{
                borderColor: item.color,
                borderStyle: item.dash ? 'dashed' : 'solid',
              }} />
              <span className="text-[10px] text-[#8fa3b8]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-1.5 pt-1 border-t border-[#1e2d3d]">
        <button
          id="map-reset-view-btn"
          onClick={onResetView}
          className="flex-1 text-[9px] font-semibold text-[#8fa3b8] hover:text-white py-1.5 px-2 rounded-md bg-[#141f2e] border border-[#1e2d3d] hover:border-[#2a3d52] transition-colors"
        >
          Reset View
        </button>
        <button
          id="map-fit-zones-btn"
          onClick={onFitZones}
          className="flex-1 text-[9px] font-semibold text-cyan-400 hover:text-cyan-300 py-1.5 px-2 rounded-md bg-cyan-400/8 border border-cyan-400/20 hover:border-cyan-400/40 transition-colors"
        >
          Fit Zones
        </button>
      </div>
    </div>
  );
}
