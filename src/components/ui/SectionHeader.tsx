interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  action?: React.ReactNode;
}

export default function SectionHeader({
  title,
  subtitle,
  badge,
  badgeColor = 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  action,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-2">
        <div className="w-0.5 h-4 bg-gradient-to-b from-cyan-400 to-transparent rounded-full" />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white tracking-tight">{title}</h2>
            {badge && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-widest uppercase ${badgeColor}`}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-[10px] text-[#4a6278] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
