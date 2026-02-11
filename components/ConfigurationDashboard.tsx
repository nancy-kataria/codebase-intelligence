"use client";

import { useState } from "react";
import { GitBranch, Key, ArrowRight, Shield, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ConfigurationDashboardProps } from "@/lib/types"

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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6 glow-primary">
            <GitBranch className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">
            Codebase Intelligence
          </h1>
          <p className="text-muted-foreground">
            Connect your repository to unlock AI-powered insights
          </p>
        </div>

        {/* Configuration Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Repository URL */}
            <div className="space-y-2">
              <Label htmlFor="repo-url" className="text-sm font-medium flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-primary" />
                GitHub Repository URL
              </Label>
              <Input
                id="repo-url"
                type="url"
                placeholder="https://github.com/owner/repository"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="bg-input border-border focus:border-primary focus:ring-primary/20 font-mono text-sm h-12"
              />
              {repoUrl && !isValidUrl && (
                <p className="text-xs text-terminal-red">Please enter a valid GitHub URL</p>
              )}
            </div>

            {/* Personal Access Token */}
            <div className="space-y-2">
              <Label htmlFor="token" className="text-sm font-medium flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                Personal Access Token
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="inline-flex">
                      <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs bg-popover border-border">
                    <div className="flex items-start gap-2">
                      <Shield className="w-4 h-4 text-terminal-green mt-0.5 flex-shrink-0" />
                      <p className="text-xs">
                        Your token is used only for this session to fetch your codebase.
                        It&apos;s never stored permanently and is cleared when you close this tab.
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="token"
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="bg-input border-border focus:border-primary focus:ring-primary/20 font-mono text-sm h-12"
              />
              <p className="text-xs text-muted-foreground">
                Need a token?{" "}
                <a
                  href="https://github.com/settings/tokens/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Create one here
                </a>
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!repoUrl || !token || !isValidUrl}
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              <span className="flex items-center gap-2">
                Initialize Intelligence
                <ArrowRight className={`w-4 h-4 transition-transform duration-200 ${isHovering ? 'translate-x-1' : ''}`} />
              </span>
            </Button>
          </form>

          {/* Security Note */}
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Shield className="w-4 h-4 text-terminal-green flex-shrink-0" />
              <p>
                End-to-end encrypted. Your code is processed in-memory and never persisted.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Supports public and private repositories
        </p>
      </div>
    </div>
  );
};

export default ConfigurationDashboard;
