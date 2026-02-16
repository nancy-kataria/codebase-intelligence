"use client";

import { ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProjectSummaryCard from "./ProjectSummaryCard";
import ChatInterface from "./ChatInterface";
import type { IntelligenceHubProps } from "@/lib/types";

const IntelligenceHub = ({ repoUrl, metadata, onReset }: IntelligenceHubProps) => {
  const repoName = repoUrl.split("/").slice(-2).join("/").replace(".git", "");

  return (
    <div className="page-padded">
      <div className="container-lg animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            onClick={onReset}
            className="btn btn-ghost"
          >
            <ArrowLeft />
            New Repository
          </Button>
          <Button
            className="btn btn-ghost btn-icon"
          >
            <Settings style={{ width: "1.25rem", height: "1.25rem" }} />
          </Button>
        </div>

        {/* Project Summary */}
        <ProjectSummaryCard repoName={repoName} metadata={metadata} />

        {/* Chat Interface */}
        <ChatInterface repoUrl={repoUrl} namespace={repoName.split('/').pop()} />

        {/* Footer */}
        <p className="text-center text-xs text-muted mt-6">
          Responses are generated based on your codebase. Always verify with source files.
        </p>
      </div>
    </div>
  );
};

export default IntelligenceHub;
