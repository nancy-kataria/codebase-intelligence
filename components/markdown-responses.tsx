import type { ReactNode } from "react";

interface ComponentProps {
  children?: ReactNode;
}

export const markdownComponents = {
  p: ({ children }: ComponentProps) => <p className="mb-2">{children}</p>,
  ul: ({ children }: ComponentProps) => (
    <ul className="list-disc pl-6 mb-3 ml-2">{children}</ul>
  ),
  ol: ({ children }: ComponentProps) => (
    <ol className="list-decimal pl-6 mb-3 ml-2">{children}</ol>
  ),
  li: ({ children }: ComponentProps) => (
    <li className="mb-2 leading-relaxed">{children}</li>
  ),
  strong: ({ children }: ComponentProps) => (
    <strong className="font-bold text-foreground">{children}</strong>
  ),
  em: ({ children }: ComponentProps) => <em className="italic">{children}</em>,
  code: ({ children }: ComponentProps) => (
    <code className="bg-secondary/50 px-1.5 py-0.5 rounded text-xs font-mono">
      {children}
    </code>
  ),
  pre: ({ children }: ComponentProps) => (
    <pre className="bg-secondary p-2 rounded my-2 overflow-x-auto text-xs">
      {children}
    </pre>
  ),
  h1: ({ children }: ComponentProps) => (
    <h1 className="text-lg font-bold mb-2">{children}</h1>
  ),
  h2: ({ children }: ComponentProps) => (
    <h2 className="text-base font-bold mb-2">{children}</h2>
  ),
  h3: ({ children }: ComponentProps) => (
    <h3 className="text-sm font-bold mb-1">{children}</h3>
  ),
};
