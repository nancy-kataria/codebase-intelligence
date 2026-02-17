"use client";

import { useEffect, useState, useRef } from "react";
import {
  Terminal,
  CheckCircle2,
  Loader2,
  Circle,
  AlertCircle,
} from "lucide-react";
import type {
  ProcessingStateProps,
  ProcessingLog,
  RepositoryMetadata,
} from "@/lib/types";

const processingSteps = [
  { message: "Authenticating with GitHub API...", delay: 800 },
  { message: "Cloning repository...", delay: 1500 },
  { message: "Analyzing project structure...", delay: 1200 },
  { message: "Finishing repository ingestion...", delay: 1000 },
  { message: "Intelligence ready!", delay: 500 },
];

/**
 * Initiates repository ingestion by calling the backend ingestion API endpoint
 * 
 * @param repoUrl - The GitHub repository URL to ingest
 * @param token - GitHub personal access token with repository read permissions
 * 
 * @throws {Error} When the API request fails or returns an error response
 * @throws {Error} When the ingestion process fails to start successfully
 */
const ingestRepository = async (
  repoUrl: string,
  token: string,
): Promise<void> => {
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

/**
 * Generates a repository summary by calling the summarize API endpoint
 * 
 * @param namespace - The repository namespace to analyze
 * @returns Promise<RepositoryMetadata> - Structured repository analysis and statistics
 * 
 * @throws {Error} When the API request fails or returns an error response
 * @throws {Error} When the summary generation process fails
 */
const generateSummary = async (
  namespace: string,
): Promise<RepositoryMetadata> => {
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

const ProcessingState = ({
  repoUrl,
  token,
  onComplete,
}: ProcessingStateProps) => {
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ingestionComplete, setIngestionComplete] = useState(false);
  const ingestionTriggeredRef = useRef(false);

  // Trigger ingestion on mount
  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (ingestionTriggeredRef.current) return;
    ingestionTriggeredRef.current = true;

    const startIngestion = async () => {
      try {
        setLogs((prev) => [
          ...prev,
          {
            message: "Initializing repository processing...",
            status: "active" as const,
            type: "info" as const,
          },
        ]);

        await ingestRepository(repoUrl, token);

        setIngestionComplete(true);
        
        setLogs((prev) =>
          prev.map((log, index) =>
            index === 0
              ? { ...log, status: "complete" as const, message: "Repository processing initialized" }
              : log
          )
        );
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to start ingestion";
        console.error("Ingestion error:", errorMsg);
        setError(errorMsg);
        setLogs((prev) => [
          ...prev,
          {
            message: `Error: ${errorMsg}`,
            status: "complete" as const,
            type: "error" as const,
          },
        ]);
      }
    };

    startIngestion();
  }, [repoUrl, token]);

  // Animation effect - only start after ingestion completes
  useEffect(() => {
    if (!ingestionComplete) return;
    
    if (currentStep >= processingSteps.length) {
      const generateAndComplete = async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const repoName =
            repoUrl.split("/").pop()?.replace(".git", "") || "default";

          const result = await generateSummary(repoName);
          setTimeout(() => onComplete(result), 800);
        } catch (err) {
          const errorMsg =
            err instanceof Error ? err.message : "Failed to generate summary";
          console.error("Summary generation error:", errorMsg);
          setError(errorMsg);
          setTimeout(
            () =>
              onComplete({
                summary: "Failed to generate summary. Please try again.",
                techStack: [],
                patterns: [],
                stats: { files: 0, lines: "0k", languages: 0 },
              }),
            800,
          );
        }
      };
      generateAndComplete();
      return;
    }

    setTimeout(() => {
      setLogs((prev) => [
        ...prev.map((log) => ({ ...log, status: "complete" as const })),
        {
          message: processingSteps[currentStep].message,
          status: "active" as const,
          type: "info" as const,
        },
      ]);
      setProgress(((currentStep + 1) / processingSteps.length) * 100);
    }, 0);

    const timer = setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
    }, processingSteps[currentStep].delay);

    return () => clearTimeout(timer);
  }, [currentStep, ingestionComplete, onComplete]);

  const repoName = repoUrl.split("/").slice(-2).join("/").replace(".git", "");

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-card border border-destructive/50 rounded-xl p-8 shadow-xl">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 text-destructive flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Ingestion Failed
                </h2>
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
    <div className="page-center">
      <div className="container-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="icon-box animate-pulse-glow"
            style={{ marginBottom: "1.5rem" }}
          >
            <Terminal />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">
            Processing Repository
          </h1>
          <p className="text-muted font-mono text-sm">{repoName}</p>
        </div>

        {/* Terminal Window */}
        <div className="terminal-window">
          <div className="terminal-header">
            <div className="terminal-dots">
              <div className="terminal-dot terminal-dot--red" />
              <div className="terminal-dot terminal-dot--yellow" />
              <div className="terminal-dot terminal-dot--green" />
            </div>
            <span className="terminal-title">
              codebase-intelligence — processing
            </span>
          </div>

          {/* Terminal Body */}
          <div className="terminal-body scrollbar-thin">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
              }}
            >
              {logs.map((log, index) => (
                <div
                  key={index}
                  className="terminal-log animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {log.status === "complete" ? (
                    <CheckCircle2 style={{ color: "var(--terminal-green)" }} />
                  ) : log.status === "active" ? (
                    <Loader2
                      style={{ color: "var(--primary)" }}
                      className="animate-spin"
                    />
                  ) : (
                    <Circle style={{ color: "var(--muted-fg)" }} />
                  )}
                  <span
                    className={
                      log.status === "complete"
                        ? "terminal-log--success"
                        : log.status === "active"
                          ? "terminal-log--info"
                          : "terminal-log--muted"
                    }
                  >
                    {log.message}
                  </span>
                </div>
              ))}
              {currentStep < processingSteps.length && (
                <div className="terminal-log" style={{ marginTop: "0.5rem" }}>
                  <span
                    className="animate-typing"
                    style={{ color: "var(--primary)" }}
                  >
                    ▊
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="terminal-footer">
            <div className="flex items-center justify-between text-xs text-muted mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tip */}
        <p className="text-center text-xs text-muted mt-6">
          Takes a fair amount of time for larger repositories
        </p>
      </div>
    </div>
  );
};

export default ProcessingState;
