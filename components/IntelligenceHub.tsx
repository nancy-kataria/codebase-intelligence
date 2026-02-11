"use client";

import { ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProjectSummaryCard from "./ProjectSummaryCard";
import ChatInterface from "./ChatInterface";
import type { IntelligenceHubProps } from "@/lib/types";

const IntelligenceHub = ({ repoUrl, metadata, onReset }: IntelligenceHubProps) => {
  const repoName = repoUrl.split("/").slice(-2).join("/").replace(".git", "");

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={onReset}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            New Repository
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        {/* Project Summary */}
        <ProjectSummaryCard repoName={repoName} metadata={metadata} />

        {/* Chat Interface */}
        <ChatInterface repoUrl={repoUrl} namespace={repoName.split('/').pop()} />

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Responses are generated based on your codebase. Always verify with source files.
        </p>
      </div>
    </div>
  );
};

export default IntelligenceHub;
