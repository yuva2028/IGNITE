import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { InfrastructureSummary } from '../../types';

interface InfraChartProps {
  data: InfrastructureSummary[];
}

interface TooltipPayloadItem {
  payload: InfrastructureSummary;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#141f2e] border border-[#1e2d3d] rounded-lg p-2.5 text-xs shadow-xl">
      <p className="font-semibold text-white mb-1">{d.label}</p>
      <p className="text-[#8fa3b8]">Total: <span className="text-white font-mono">{d.total}</span></p>
      <p className="text-[#8fa3b8]">At Risk: <span className="text-orange-400 font-mono">{d.atRisk}</span></p>
      {d.damaged > 0 && (
        <p className="text-[#8fa3b8]">Damaged: <span className="text-red-400 font-mono">{d.damaged}</span></p>
      )}
      <p className="text-[#8fa3b8]">Exposure: <span className="text-white font-mono">{d.percentage}%</span></p>
    </div>
  );
}

// Only show 5 main types in the bar chart
const CHART_TYPES = ['power', 'roads', 'bridges', 'hospitals', 'shelters'];

export default function InfrastructureChart({ data }: InfraChartProps) {
  const chartData = data
    .filter(d => CHART_TYPES.includes(d.type))
    .map(d => ({
      ...d,
      name: d.label.split(' ')[0],
      atRisk: d.atRisk,
      safe: d.total - d.atRisk - d.damaged,
    }));

  return (
    <div className="space-y-3">
      {/* Bar Chart */}
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barSize={14} barGap={2} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: '#4a6278', fontSize: 9, fontFamily: 'Inter' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#4a6278', fontSize: 9, fontFamily: 'Inter' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            <Bar dataKey="safe" name="Safe" fill="#22c55e" fillOpacity={0.5} radius={[2, 2, 0, 0]} />
            <Bar dataKey="atRisk" name="At Risk" fill="#f97316" fillOpacity={0.8} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="space-y-1">
        {data.slice(0, 5).map((d) => (
          <div key={d.type} className="flex items-center gap-2">
            <span className="text-[10px] text-[#4a6278] w-28 shrink-0 truncate">{d.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-[#080d14] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${d.percentage}%`,
                  backgroundColor: d.percentage > 50 ? '#ef4444' : d.percentage > 30 ? '#f97316' : '#f59e0b',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
            <span className="text-[10px] font-mono text-[#8fa3b8] w-8 text-right shrink-0">{d.percentage}%</span>
            <span className="text-[9px] font-mono text-orange-400 w-12 text-right shrink-0">{d.atRisk}/{d.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
