/**
 * CycloneGuard AI -- Population Exposure Chart Component (Phase 6)
 * DATA NOTICE: All population figures are SIMULATED DEMO DATA.
 */
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { PopulationGridSummary } from "../../types";

interface Props {
  summary: PopulationGridSummary;
  height?: number;
  showLegend?: boolean;
}

const TIER_CONFIG = [
  { key: "critical" as const, label: "Critical", color: "#ef4444" },
  { key: "high"     as const, label: "High",     color: "#f97316" },
  { key: "medium"   as const, label: "Medium",   color: "#f59e0b" },
  { key: "low"      as const, label: "Low",      color: "#22c55e" },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

export default function PopulationExposureChart({ summary, height = 160, showLegend = true }: Props) {
  const pieData = TIER_CONFIG.map(t => ({ name: t.label, value: summary[t.key], color: t.color }));

  return (
    <div className="space-y-3">
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius="52%"
              outerRadius="78%"
              paddingAngle={2}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.85} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => [fmt(v), "Population"]}
              contentStyle={{ background: "#0d1520", border: "1px solid #1e2d3d", borderRadius: 8, fontSize: 11, color: "#e2eaf4" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-1.5">
        {TIER_CONFIG.map(t => {
          const pctKey = (t.key + "Pct") as "criticalPct" | "highPct" | "mediumPct" | "lowPct";
          return (
            <div key={t.key}>
              <div className="flex items-center justify-between text-[10px] mb-0.5">
                <span className="font-semibold" style={{ color: t.color }}>{t.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-white">{fmt(summary[t.key])}</span>
                  <span className="font-mono text-[9px]" style={{ color: t.color }}>{summary[pctKey].toFixed(1)}%</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-[#0d1622] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${summary[pctKey]}%`, backgroundColor: t.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {showLegend && (
        <div className="grid grid-cols-2 gap-1 pt-1">
          {pieData.map(d => (
            <div key={d.name} className="flex items-center justify-between px-2 py-1 rounded bg-[#080d14] border border-[#1e2d3d]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-[10px] text-slate-300">{d.name}</span>
              </div>
              <span className="text-[10px] font-bold font-mono" style={{ color: d.color }}>{fmt(d.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
