import { Code2, Layers, GitBranch, Zap } from "lucide-react";
import type { ProjectSummaryCardProps } from "@/lib/types";

const ProjectSummaryCard = ({ repoName, metadata }: ProjectSummaryCardProps) => {

  return (
    <div className="card animate-slide-up mb-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="icon-box--sm" style={{ background: "hsl(173 80% 50% / 0.1)", border: "1px solid hsl(173 80% 50% / 0.2)" }}>
            <GitBranch />
          </div>
          <div>
            <h2 className="font-semibold text-lg">{repoName}</h2>
            <p className="text-xs text-muted font-mono">Repository analyzed</p>
          </div>
        </div>
        <div className="status-badge">
          <Zap />
          <span>Ready</span>
        </div>
      </div>

      {/* Purpose */}
      <p className="text-muted text-sm mb-6 leading-relaxed">
        {metadata.summary}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-box">
          <p className="text-2xl font-semibold">{metadata.stats.files}</p>
          <p className="text-xs text-muted">Files</p>
        </div>
        <div className="stat-box">
          <p className="text-2xl font-semibold">{metadata.stats.lines}</p>
          <p className="text-xs text-muted">Lines of Code</p>
        </div>
        <div className="stat-box">
          <p className="text-2xl font-semibold">{metadata.stats.languages}</p>
          <p className="text-xs text-muted">Languages</p>
        </div>
      </div>

      {/* Tech Stack & Patterns */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Code2 style={{ width: "1rem", height: "1rem", color: "var(--primary)" }} />
            <span className="text-xs font-medium text-muted uppercase tracking-wide">Tech Stack</span>
          </div>
          <div className="flex flex-wrap gap-1-5">
            {metadata.techStack.map((tech) => (
              <span
                key={tech}
                className="tag tag--primary"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Layers style={{ width: "1rem", height: "1rem", color: "var(--accent)" }} />
            <span className="text-xs font-medium text-muted uppercase tracking-wide">Patterns</span>
          </div>
          <div className="flex flex-wrap gap-1-5">
            {metadata.patterns.slice(0, 3).map((pattern) => (
              <span
                key={pattern}
                className="tag tag--accent"
              >
                {pattern}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectSummaryCard;