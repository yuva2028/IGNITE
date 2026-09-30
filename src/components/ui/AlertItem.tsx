import type { Alert } from '../../types';
import { formatRelativeTime, getSeverityColor, getSeverityBgColor } from '../../utils/formatters';
import { AlertTriangle, CloudLightning, Building2, Navigation2, Info } from 'lucide-react';

interface AlertItemProps {
  alert: Alert;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  weather: <CloudLightning size={12} />,
  infrastructure: <Building2 size={12} />,
  evacuation: <Navigation2 size={12} />,
  system: <Info size={12} />,
};

const SEVERITY_LABELS: Record<string, string> = {
  low: 'LOW',
  medium: 'MED',
  high: 'HIGH',
  critical: 'CRIT',
};

export default function AlertItem({ alert }: AlertItemProps) {
  const colorClass = getSeverityColor(alert.severity);
  const bgClass = getSeverityBgColor(alert.severity);

  return (
    <div
      id={`alert-${alert.id}`}
      className={`flex gap-3 p-3 rounded-lg border ${bgClass} fade-in`}
    >
      {/* Severity Badge */}
      <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
        <span className={`text-[8px] font-bold tracking-widest uppercase ${colorClass} font-mono`}>
          {SEVERITY_LABELS[alert.severity]}
        </span>
        {alert.severity === 'critical' && (
          <span className="flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-red-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
          </span>
        )}
      </div>

      {/* Divider */}
      <div className={`w-px self-stretch ${alert.severity === 'critical' ? 'bg-red-400/30' : alert.severity === 'high' ? 'bg-orange-400/30' : 'bg-amber-400/20'}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className={colorClass}>
              <AlertTriangle size={11} />
            </span>
            <p className="text-xs font-semibold text-white truncate">{alert.title}</p>
          </div>
          <span className="text-[9px] text-[#4a6278] shrink-0 font-mono">{formatRelativeTime(alert.timestamp)}</span>
        </div>
        <p className="text-[10px] text-[#8fa3b8] mt-1 leading-relaxed line-clamp-2">{alert.description}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <div className="flex items-center gap-1 text-[#4a6278]">
            {CATEGORY_ICONS[alert.category]}
            <span className="text-[9px] capitalize">{alert.source}</span>
          </div>
          {alert.status === 'acknowledged' && (
            <span className="text-[9px] font-semibold text-cyan-400/70 bg-cyan-400/5 px-1.5 py-0.5 rounded border border-cyan-400/10">
              ACK
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
