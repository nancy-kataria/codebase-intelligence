"use client";

import { useEffect, useState, useRef } from "react";
import { Terminal, CheckCircle2, Loader2, Circle, AlertCircle } from "lucide-react";
import type { ProcessingStateProps, ProcessingLog, RepositoryMetadata } from "@/lib/types";

const processingSteps = [
  { message: "Authenticating with GitHub API...", delay: 800 },
  { message: "Cloning repository...", delay: 1500 },
  { message: "Analyzing project structure...", delay: 1200 },
  { message: "Detecting tech stack...", delay: 1000 },
  { message: "Splitting files into chunks...", delay: 1800 },
  { message: "Generating embeddings...", delay: 2000 },
  { message: "Vectorizing code patterns...", delay: 1500 },
  { message: "Building knowledge graph...", delay: 1200 },
  { message: "Indexing for retrieval...", delay: 800 },
  { message: "Intelligence ready!", delay: 500 },
];

// API call functions
const ingestRepository = async (repoUrl: string, token: string): Promise<void> => {
  const response = await fetch("/api/ingest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ repoUrl, token }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to start ingestion");
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || "Ingestion failed");
  }
};

const generateSummary = async (namespace: string): Promise<RepositoryMetadata> => {
  const response = await fetch("/api/summarize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ namespace }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate summary");
  }

  return await response.json();
};

const ProcessingState = ({ repoUrl, token, onComplete }: ProcessingStateProps) => {
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const ingestionTriggeredRef = useRef(false);

  // Trigger ingestion on mount
  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (ingestionTriggeredRef.current) return;
    ingestionTriggeredRef.current = true;

    const startIngestion = async () => {
      try {
        const repoName = repoUrl.split("/").pop()?.replace(".git", "") || "default";
        console.log("Starting ingestion for:", repoName);

        // Call the ingest API
        await ingestRepository(repoUrl, token);
        console.log("Ingestion API called successfully");

        // Add log for ingestion started
        setLogs((prev) => [
          ...prev,
          { message: "Repository ingestion started...", status: "active" as const, type: "info" as const },
        ]);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to start ingestion";
        console.error("Ingestion error:", errorMsg);
        setError(errorMsg);
        setLogs((prev) => [
          ...prev,
          { message: `Error: ${errorMsg}`, status: "complete" as const, type: "error" as const },
        ]);
      }
    };

    startIngestion();
  }, [repoUrl, token]);

  useEffect(() => {
    if (currentStep >= processingSteps.length) {
      // Generate summary after ingestion completes
      const generateAndComplete = async () => {
        try {
          // Extract repo name from URL
          const repoName = repoUrl.split("/").pop()?.replace(".git", "") || "default";
          
          console.log("Calling generateSummary API...", `namespace: ${repoName}`);
          const result = await generateSummary(repoName);
          console.log("Metadata received:", result);
          setTimeout(() => onComplete(result), 800);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Failed to generate summary";
          console.error("Summary generation error:", errorMsg);
          setError(errorMsg);
          // Still complete even on error with default metadata
          setTimeout(() => onComplete({
            summary: "Failed to generate summary. Please try again.",
            techStack: [],
            patterns: [],
            stats: { files: 0, lines: "0k", languages: 0 }
          }), 800);
        }
      };
      generateAndComplete();
      return;
    }

    // Add new log entry
    setTimeout(() => {
      setLogs((prev) => [
        ...prev.map((log) => ({ ...log, status: "complete" as const })),
        { message: processingSteps[currentStep].message, status: "active" as const, type: "info" as const },
      ]);
      setProgress(((currentStep + 1) / processingSteps.length) * 100);
    }, 0);

    // Move to next step
    const timer = setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
    }, processingSteps[currentStep].delay);

    return () => clearTimeout(timer);
  }, [currentStep, onComplete]);

  const repoName = repoUrl.split("/").slice(-2).join("/").replace(".git", "");

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-card border border-destructive/50 rounded-xl p-8 shadow-xl">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 text-destructive flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Ingestion Failed</h2>
                <p className="text-muted-foreground mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6 animate-pulse-glow">
            <Terminal className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">
            Processing Repository
          </h1>
          <p className="text-muted-foreground font-mono text-sm">
            {repoName}
          </p>
        </div>

        {/* Terminal Window */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl">
          {/* Terminal Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-secondary/50 border-b border-border">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-terminal-red/80" />
              <div className="w-3 h-3 rounded-full bg-terminal-yellow/80" />
              <div className="w-3 h-3 rounded-full bg-terminal-green/80" />
            </div>
            <span className="text-xs text-muted-foreground font-mono ml-2">
              codebase-intelligence — processing
            </span>
          </div>

          {/* Terminal Body */}
          <div className="p-4 h-80 overflow-y-auto scrollbar-thin font-mono text-sm">
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 terminal-log animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {log.type === "error" ? (
                    <AlertCircle className="w-4 h-4 text-terminal-red flex-shrink-0" />
                  ) : log.status === "complete" ? (
                    <CheckCircle2 className="w-4 h-4 text-terminal-green flex-shrink-0" />
                  ) : log.status === "active" ? (
                    <Loader2 className="w-4 h-4 text-primary flex-shrink-0 animate-spin" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span
                    className={
                      log.type === "error"
                        ? "text-terminal-red"
                        : log.status === "complete"
                        ? "terminal-log-success"
                        : log.status === "active"
                        ? "terminal-log-info"
                        : "text-muted-foreground"
                    }
                  >
                    {log.message}
                  </span>
                </div>
              ))}
              {currentStep < processingSteps.length && !error && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-primary animate-typing">▊</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-4 py-3 bg-secondary/30 border-t border-border">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tip */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          This typically takes 30-60 seconds depending on repository size
        </p>
      </div>
    </div>
  );
};

export default ProcessingState;
