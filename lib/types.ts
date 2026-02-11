export interface PineconeMatch {
  metadata?: {
    text?: string;
    source?: string;
  };
}

export interface IngestResponse {
  success: boolean;
  message: string;
  error?: string;
}

export interface RepositoryMetadata {
  summary: string;
  techStack: string[];
  patterns: string[];
  stats: {
    files: number;
    lines: string;
    languages: number;
  };
}

/**
 * API Request/Response Types
 */
export interface IngestRequest {
  repoUrl: string;
  token: string;
}

export interface IngestResponse {
  success: boolean;
  message: string;
  error?: string;
}

export interface SummaryResponse {
  summary: string;
  techStack: string[];
  patterns: string[];
  stats: {
    files: number;
    lines: string;
    languages: number;
  };
  error?: string;
}

export interface ChatResponse {
  response: string;
  context?: string;
  error?: string;
}

/**
 * Domain Types
 */
export interface RepositoryMetadata {
  summary: string;
  techStack: string[];
  patterns: string[];
  stats: {
    files: number;
    lines: string;
    languages: number;
  };
}

export interface ProcessingLog {
  message: string;
  status: "pending" | "active" | "complete";
  type: "info" | "success" | "warning" | "error";
}

export interface Source {
  file: string;
  lines: string;
  url: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
}

/**
 * Component Props Types
 */
export interface ConfigurationDashboardProps {
  onSubmit: (repoUrl: string, token: string) => void;
}

export interface ProcessingStateProps {
  repoUrl: string;
  token: string;
  onComplete: (metadata: RepositoryMetadata) => void;
}

export interface ProjectSummaryCardProps {
  repoName: string;
  metadata: RepositoryMetadata;
}

export interface ChatInterfaceProps {
  repoUrl: string;
  namespace?: string;
}

export interface IntelligenceHubProps {
  repoUrl: string;
  metadata: RepositoryMetadata;
  onReset: () => void;
}

/**
 * Toast/Hook Types
 */
export interface ToasterToast {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
