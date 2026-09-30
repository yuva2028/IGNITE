import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  id: string;
  label: string;
  value: string;
  unit?: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'stable';
  trendLabel?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical' | 'neutral';
  icon?: React.ReactNode;
  pulse?: boolean;
}

const SEVERITY_STYLES: Record<string, { border: string; accent: string; glow: string }> = {
  low: { border: 'border-green-500/20', accent: 'text-green-400', glow: '' },
  medium: { border: 'border-amber-500/20', accent: 'text-amber-400', glow: '' },
  high: { border: 'border-orange-500/25', accent: 'text-orange-400', glow: 'glow-high' },
  critical: { border: 'border-red-500/30', accent: 'text-red-400', glow: 'glow-critical' },
  neutral: { border: 'border-[#1e2d3d]', accent: 'text-cyan-400', glow: '' },
};

export default function MetricCard({
  id,
  label,
  value,
  unit,
  subValue,
  trend,
  trendLabel,
  severity = 'neutral',
  icon,
  pulse = false,
}: MetricCardProps) {
  const styles = SEVERITY_STYLES[severity];

  return (
    <div
      id={id}
      className={`relative flex flex-col gap-2 p-4 rounded-xl bg-[#0f1a25] border ${styles.border} ${styles.glow} card-hover overflow-hidden`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {pulse && (
            <span className="flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-red-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
            </span>
          )}
          {icon && <span className={styles.accent}>{icon}</span>}
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${
            trend === 'up' ? 'text-red-400' : trend === 'down' ? 'text-green-400' : 'text-[#4a6278]'
          }`}>
            {trend === 'up' ? <TrendingUp size={10} /> : trend === 'down' ? <TrendingDown size={10} /> : <Minus size={10} />}
            {trendLabel}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold tracking-tight ${styles.accent}`}>{value}</span>
        {unit && <span className="text-xs text-[#4a6278] font-medium">{unit}</span>}
      </div>

      {/* Label */}
      <p className="text-[10px] font-semibold text-[#8fa3b8] uppercase tracking-wider leading-tight">{label}</p>

      {/* Sub value */}
      {subValue && (
        <p className="text-[10px] text-[#4a6278]">{subValue}</p>
      )}

      {/* Corner accent */}
      <div className={`absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-5 bg-current ${styles.accent}`} />
    </div>
  );
}
