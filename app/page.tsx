"use client";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";
import ConfigurationDashboard from "@/components/ConfigurationDashboard";
import ProcessingState from "@/components/ProcessingState";
import IntelligenceHub from "@/components/IntelligenceHub";
import type { RepositoryMetadata } from "@/lib/types";

type AppState = "config" | "processing" | "ready";

export default function Home() {
  const [state, setState] = useState<AppState>("config");
  const [repoUrl, setRepoUrl] = useState("");
  const [token, setToken] = useState("");

  const handleConfigSubmit = (url: string, accessToken: string) => {
    setRepoUrl(url);
    setToken(accessToken);
    setState("processing");
  };

  const [metadata, setMetadata] = useState<RepositoryMetadata | null>(null);

  const handleProcessingComplete = (repoMetadata: RepositoryMetadata) => {
    setMetadata(repoMetadata);
    setState("ready");
  };

  const handleReset = () => {
    setRepoUrl("");
    setToken("");
    setState("config");
  };

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <div className="min-h-screen bg-background">
        {state === "config" && (
          <ConfigurationDashboard onSubmit={handleConfigSubmit} />
        )}
        {state === "processing" && (
          <ProcessingState
            repoUrl={repoUrl}
            token={token}
            onComplete={handleProcessingComplete}
          />
        )}
        {state === "ready" && metadata && (
          <IntelligenceHub
            repoUrl={repoUrl}
            metadata={metadata}
            onReset={handleReset}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
