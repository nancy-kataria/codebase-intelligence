"use client";

import { useState } from "react";
import { GitBranch, Key, ArrowRight, Shield, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ConfigurationDashboardProps } from "@/lib/types";

const ConfigurationDashboard = ({ onSubmit }: ConfigurationDashboardProps) => {
  const [repoUrl, setRepoUrl] = useState("");
  const [token, setToken] = useState("");
  const [isHovering, setIsHovering] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (repoUrl && token) {
      onSubmit(repoUrl, token);
    }
  };

  const isValidUrl = repoUrl.includes("github.com");

  return (
    <div className="page-center">
      <div className="container-sm animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="icon-box glow-primary" style={{ marginBottom: "1.5rem" }}>
            <GitBranch className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">
            Codebase Intelligence
          </h1>
          <p className="text-muted">
            Connect your repository to unlock AI-powered insights
          </p>
        </div>

        {/* Configuration Card */}
        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Repository URL */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <Label
                htmlFor="repo-url"
                className="label"
              >
                <GitBranch />
                GitHub Repository URL
              </Label>
              <Input
                id="repo-url"
                type="url"
                placeholder="https://github.com/owner/repository"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="input"
              />
              {repoUrl && !isValidUrl && (
                <p className="text-xs text-error">
                  Please enter a valid GitHub URL
                </p>
              )}
            </div>

            {/* Personal Access Token */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <Label
                htmlFor="token"
                className="label"
              >
                <Key />
                Personal Access Token
                <span className="tooltip-trigger">
                  <Info style={{ width: "0.875rem", height: "0.875rem", color: "var(--muted-fg)" }} />
                  <span className="tooltip-content">
                    <span className="flex items-start gap-2">
                      <Shield style={{ width: "1rem", height: "1rem", color: "var(--terminal-green)", flexShrink: 0, marginTop: "0.125rem" }} />
                      <span>Your token is used only for this session to fetch your codebase. It&apos;s never stored permanently and is cleared when you close this tab.</span>
                    </span>
                  </span>
                </span>
              </Label>
              <Input
                id="token"
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="input"
              />
              <p className="text-xs text-muted">
                Need a token?{" "}
                <a
                  href="https://github.com/settings/tokens/new"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Create one here
                </a>
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!repoUrl || !token || !isValidUrl}
              variant="outline"
              size="default"
              className="btn btn-primary btn-lg btn-full"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              Initialize Intelligence
                <ArrowRight
                  style={{ transition: "transform 0.2s", transform: isHovering ? "translateX(4px)" : "none" }}
                />
            </Button>
          </form>

          {/* Security Note */}
          <div className="security-note">
            <Shield className="w-4 h-4 text-terminal-green flex-shrink-0" />
              <p>
                End-to-end encrypted. Your code is processed in-memory and never
                persisted.
              </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted mt-6">
          Supports public and private repositories
        </p>
      </div>
    </div>
  );
};

export default ConfigurationDashboard;
