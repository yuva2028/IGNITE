import type { LucideIcon } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description: string;
  phase: number;
  icon: LucideIcon;
  features?: string[];
  techStack?: string[];
}

export default function PlaceholderPage({
  title,
  description,
  phase,
  icon: Icon,
  features = [],
  techStack = [],
}: PlaceholderPageProps) {
  return (
    <div className="h-full overflow-y-auto">
    <div className="flex flex-col items-center justify-center min-h-full p-12 fade-in">
      <div className="max-w-lg w-full text-center space-y-6">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#0f1a25] border border-[#1e2d3d] mx-auto">
          <Icon size={36} className="text-cyan-400/60" strokeWidth={1.5} />
        </div>

        {/* Phase Badge */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-[10px] font-bold px-3 py-1 rounded-full border text-cyan-400 bg-cyan-400/10 border-cyan-400/20 tracking-widest uppercase">
            Phase {phase} Module
          </span>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
          <p className="text-sm text-[#8fa3b8] mt-2 leading-relaxed">{description}</p>
        </div>

        {/* Status */}
        <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0f1a25] border border-[#1e2d3d]">
          <span className="flex h-2 w-2 rounded-full bg-[#2a3d52]" />
          <span className="text-xs text-[#8fa3b8] font-medium">
            Module will be implemented in a later phase.
          </span>
        </div>

        {/* Features */}
        {features.length > 0 && (
          <div className="text-left p-4 rounded-xl bg-[#0f1a25] border border-[#1e2d3d] space-y-2">
            <p className="text-[10px] font-semibold text-[#4a6278] uppercase tracking-widest mb-3">
              Planned Features
            </p>
            {features.map((feat) => (
              <div key={feat} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-cyan-400/40 shrink-0" />
                <span className="text-xs text-[#8fa3b8]">{feat}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tech Stack */}
        {techStack.length > 0 && (
          <div className="text-left p-4 rounded-xl bg-[#0f1a25] border border-[#1e2d3d]">
            <p className="text-[10px] font-semibold text-[#4a6278] uppercase tracking-widest mb-3">
              Technology Stack (Planned)
            </p>
            <div className="flex flex-wrap gap-2">
              {techStack.map((tech) => (
                <span
                  key={tech}
                  className="text-[10px] px-2 py-0.5 rounded border border-[#2a3d52] bg-[#141f2e] text-[#8fa3b8]"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
