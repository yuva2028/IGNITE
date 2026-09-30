import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { RiskDistribution } from '../../types';
import { formatNumber } from '../../utils/formatters';

interface RiskChartProps {
  data: RiskDistribution[];
}

interface TooltipPayloadItem {
  payload: RiskDistribution;
  value: number;
  name: string;
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
      <p className="font-semibold text-white mb-1">{d.label} Risk</p>
      <p className="text-[#8fa3b8]">Zones: <span className="text-white font-mono">{d.count}</span></p>
      <p className="text-[#8fa3b8]">Population: <span className="text-white font-mono">{formatNumber(d.population)}</span></p>
      <p className="text-[#8fa3b8]">Share: <span className="text-white font-mono">{d.percentage}%</span></p>
    </div>
  );
}

export default function RiskDistributionChart({ data }: RiskChartProps) {
  const sorted = [...data].reverse();

  return (
    <div className="space-y-3">
      {/* Bar Chart */}
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} barSize={28} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="label"
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
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {sorted.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend / Stats */}
      <div className="grid grid-cols-2 gap-2">
        {data.map((d) => (
          <div
            key={d.severity}
            className="flex items-center justify-between p-2 rounded-lg bg-[#080d14] border border-[#162030]"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-[10px] text-[#8fa3b8]">{d.label}</span>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold font-mono" style={{ color: d.color }}>
                {d.percentage}%
              </p>
              <p className="text-[9px] text-[#4a6278] font-mono">{formatNumber(d.population)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
