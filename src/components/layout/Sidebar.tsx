import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Building2,
  Users,
  FlaskConical,
  Navigation,
  Bot,
  History,
  FileText,
  Settings,
  Shield,
  Zap,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  phase?: number;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', path: '/', icon: <LayoutDashboard size={16} /> },
  { label: 'Risk Map', path: '/risk-map', icon: <Map size={16} />, phase: 3 },
  { label: 'Infrastructure', path: '/infrastructure', icon: <Building2 size={16} />, phase: 4 },
  { label: 'Scenario Simulator', path: '/simulator', icon: <FlaskConical size={16} />, phase: 5 },
  { label: 'Population Exposure', path: '/population', icon: <Users size={16} />, phase: 6 },
  { label: 'Evacuation Planner', path: '/evacuation', icon: <Navigation size={16} /> },
  { label: 'AI Copilot', path: '/ai-copilot', icon: <Bot size={16} />, badge: 'BETA' },
  { label: 'Historical Analysis', path: '/historical', icon: <History size={16} />, phase: 9 },
  { label: 'Reports', path: '/reports', icon: <FileText size={16} /> },
  { label: 'Settings', path: '/settings', icon: <Settings size={16} /> },
];

export default function Sidebar() {
  return (
    <aside className="flex flex-col w-60 min-h-screen bg-[#080d14] border-r border-[#1e2d3d] shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#1e2d3d]">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/30">
          <Shield size={18} className="text-cyan-400" />
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-50"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-white tracking-tight">CycloneGuard</span>
            <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-1 py-0.5 rounded">AI</span>
          </div>
          <p className="text-[10px] text-[#4a6278] font-medium tracking-widest uppercase mt-0.5">Impact Platform</p>
        </div>
      </div>

      {/* Demo Mode Banner */}
      <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-amber-400/5 border border-amber-400/20">
        <div className="flex items-center gap-2">
          <Zap size={10} className="text-amber-400 demo-pulse" />
          <span className="text-[9px] font-bold text-amber-400 tracking-widest uppercase">Demo Mode Active</span>
        </div>
        <p className="text-[9px] text-[#4a6278] mt-0.5">Simulated data only</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-2 mb-2 text-[9px] font-semibold text-[#4a6278] tracking-widest uppercase">Navigation</p>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `group flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer select-none ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-[#8fa3b8] hover:text-white hover:bg-[#0f1a25] border border-transparent'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-cyan-400' : 'text-[#4a6278] group-hover:text-[#8fa3b8]'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  {item.badge && (
                    <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/20">
                      {item.badge}
                    </span>
                  )}
                  {item.phase && item.phase > 1 && (
                    <span className="text-[8px] text-[#2a3d52] group-hover:text-[#4a6278]">
                      P{item.phase}
                    </span>
                  )}
                </div>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[#1e2d3d]">
        <p className="text-[9px] text-[#2a3d52] font-mono">v1.0.0-alpha · Phase 1</p>
        <p className="text-[9px] text-[#2a3d52] mt-0.5">© 2024 CycloneGuard AI</p>
      </div>
    </aside>
  );
}
