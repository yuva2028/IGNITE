import { Bell, ChevronDown, Clock, User, RefreshCw } from 'lucide-react';
import { DEMO_DASHBOARD_STATE, DEMO_ALERTS } from '../../data/mockData';
import { formatRelativeTime, getDataStatusColor } from '../../utils/formatters';

export default function TopNavbar() {
  const { selectedRegion, dataStatus, lastRefresh, isDemoMode } = DEMO_DASHBOARD_STATE;
  const criticalCount = DEMO_ALERTS.filter(a => a.severity === 'critical' && a.status === 'active').length;
  const activeCount = DEMO_ALERTS.filter(a => a.status === 'active').length;

  return (
    <header className="flex items-center justify-between h-14 px-6 bg-[#080d14] border-b border-[#1e2d3d] shrink-0 z-10">
      {/* Left: Region Selector */}
      <div className="flex items-center gap-4">
        <button
          id="region-selector"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0f1a25] border border-[#1e2d3d] hover:border-[#2a3d52] transition-colors group"
        >
          <span className="text-[10px] font-semibold text-[#4a6278] uppercase tracking-wider">Region</span>
          <div className="w-px h-3 bg-[#1e2d3d]" />
          <span className="text-xs font-semibold text-white">{selectedRegion.name}</span>
          <span className="text-[10px] text-[#4a6278]">{selectedRegion.country}</span>
          <ChevronDown size={12} className="text-[#4a6278] group-hover:text-[#8fa3b8]" />
        </button>

        {/* Cyclone Name */}
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-60"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="text-xs font-bold text-red-400 tracking-wide">CYCLONE VAYU-B</span>
          <span className="text-[10px] text-[#4a6278]">CAT. 4 · Active Tracking</span>
        </div>
      </div>

      {/* Center: Demo Mode */}
      {isDemoMode && (
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/5 border border-amber-400/25">
          <span className="flex h-1.5 w-1.5 rounded-full bg-amber-400 demo-pulse" />
          <span className="text-[10px] font-bold text-amber-400 tracking-widest uppercase">
            Demo Mode — Simulated Data
          </span>
        </div>
      )}

      {/* Right: Status + Actions */}
      <div className="flex items-center gap-3">
        {/* Data Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0f1a25] border border-[#1e2d3d]">
          <Clock size={11} className="text-[#4a6278]" />
          <span className="text-[10px] text-[#8fa3b8] font-mono">
            Updated {formatRelativeTime(lastRefresh)}
          </span>
          <div className="w-px h-3 bg-[#1e2d3d]" />
          <span className={`text-[10px] font-bold tracking-widest uppercase ${getDataStatusColor(dataStatus)}`}>
            {dataStatus.toUpperCase()}
          </span>
        </div>

        {/* Refresh */}
        <button
          id="refresh-data-btn"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#0f1a25] border border-[#1e2d3d] hover:border-[#2a3d52] text-[#4a6278] hover:text-[#8fa3b8] transition-colors"
          title="Refresh data"
        >
          <RefreshCw size={13} />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            id="notifications-btn"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#0f1a25] border border-[#1e2d3d] hover:border-[#2a3d52] text-[#4a6278] hover:text-[#8fa3b8] transition-colors"
            title="Notifications"
          >
            <Bell size={13} />
          </button>
          {criticalCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-[#1e2d3d]" />

        {/* User */}
        <button
          id="user-menu-btn"
          className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[#0f1a25] transition-colors group"
        >
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-500/30">
            <User size={13} className="text-cyan-400" />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-[10px] font-semibold text-white">Analyst</p>
            <p className="text-[9px] text-[#4a6278]">NDMA Ops</p>
          </div>
          <ChevronDown size={11} className="text-[#4a6278] group-hover:text-[#8fa3b8]" />
        </button>
      </div>
    </header>
  );
}
