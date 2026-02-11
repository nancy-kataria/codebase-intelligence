import { Code2, Layers, GitBranch, Zap } from "lucide-react";
import type { ProjectSummaryCardProps } from "@/lib/types";

const ProjectSummaryCard = ({ repoName, metadata }: ProjectSummaryCardProps) => {

  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">{repoName}</h2>
            <p className="text-xs text-muted-foreground font-mono">Repository analyzed</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-terminal-green/10 border border-terminal-green/20 rounded-full">
          <Zap className="w-3.5 h-3.5 text-terminal-green" />
          <span className="text-xs font-medium text-terminal-green">Ready</span>
        </div>
      </div>

      {/* Purpose */}
      <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
        {metadata.summary}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-secondary/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-semibold text-foreground">{metadata.stats.files}</p>
          <p className="text-xs text-muted-foreground">Files</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-semibold text-foreground">{metadata.stats.lines}</p>
          <p className="text-xs text-muted-foreground">Lines of Code</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-semibold text-foreground">{metadata.stats.languages}</p>
          <p className="text-xs text-muted-foreground">Languages</p>
        </div>
      </div>

      {/* Tech Stack & Patterns */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Code2 className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tech Stack</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {metadata.techStack.map((tech) => (
              <span
                key={tech}
                className="px-2 py-1 text-xs font-mono bg-primary/10 text-primary border border-primary/20 rounded-md"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-accent" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Patterns</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {metadata.patterns.slice(0, 3).map((pattern) => (
              <span
                key={pattern}
                className="px-2 py-1 text-xs font-mono bg-accent/10 text-accent border border-accent/20 rounded-md"
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