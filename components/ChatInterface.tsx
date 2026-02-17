"use client";

import { useState, useRef, useEffect } from "react";
import { Send, FileCode, Sparkles, User, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import type { ChatInterfaceProps, Message, Source } from "@/lib/types";
import {markdownComponents} from "@/components/markdown-responses"

let messageCounter = 0;
const generateMessageId = () => `msg-${Date.now()}-${++messageCounter}`;

/**
 * Handles communication with the backend chat API, sending the user's message
 * along with conversation context to get an AI-generated response.
 * 
 * @param message - The user's chat message/question about the codebase
 * @param namespace - The repository namespace to query
 * @param conversationHistory - Array of previous messages to maintain conversation context
 * @returns Promise resolving to AI response and context information about sources used
 * 
 * @throws {Error} When the API request fails or returns an error response
 */
const sendChatMessage = async (
  message: string,
  namespace: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<{ response: string; context: string }> => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      namespace,
      conversationHistory,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to send message");
  }

  return await response.json();
};

const ChatInterface = ({ repoUrl, namespace }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "I've analyzed your codebase and I'm ready to help. Ask me anything about the architecture, specific functions, or how different parts connect.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamingRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const simulateStreaming = async (text: string, sources: Source[]) => {
    // Prevent double execution
    if (streamingRef.current) return;
    streamingRef.current = true;

    const messageId = generateMessageId();
    setMessages((prev) => [
      ...prev,
      { id: messageId, role: "assistant", content: "", isStreaming: true },
    ]);

    const words = text.split(" ");
    for (let i = 0; i < words.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 30 + Math.random() * 40));
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, content: words.slice(0, i + 1).join(" ") }
            : msg
        )
      );
    }

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, isStreaming: false, sources }
          : msg
      )
    );
    setIsLoading(false);
    streamingRef.current = false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateMessageId(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const repoName = namespace || repoUrl.split("/").pop()?.replace(".git", "") || "default";

      const conversationHistory = messages
        .filter(m => !m.id.startsWith("welcome"))
        .map(m => ({ role: m.role, content: m.content }));

      const result = await sendChatMessage(userMessage.content, repoName, conversationHistory);

      await simulateStreaming(result.response, []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send message";
      console.error("Chat error:", errorMessage);
      setMessages((prev) => [
        ...prev,
        {
          id: generateMessageId(),
          role: "assistant",
          content: `Error: ${errorMessage}`,
        },
      ]);
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const repoName = repoUrl.split("/").slice(-2).join("/").replace(".git", "");

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-title">
          <Sparkles />
          <span>Intelligence Hub</span>
        </div>
        <span className="chat-header-repo">{repoName}</span>
      </div>

      {/* Messages */}
      <div className="chat-messages scrollbar-thin">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-row animate-slide-up ${
              message.role === "user" ? "chat-row--user" : "chat-row--ai"
            }`}
          >
            {message.role === "assistant" && (
              <div className="chat-avatar chat-avatar--ai">
                <Sparkles />
              </div>
            )}
            <div
              className={`chat-bubble ${
                message.role === "user" ? "chat-bubble--user" : "chat-bubble--ai"
              }`}
            >
              {message.role === "assistant" ? (
                <div className="text-sm leading-relaxed prose prose-sm prose-invert max-w-none prose-p:mb-2 prose-ul:mb-2 prose-ol:mb-2 prose-li:mb-1">
                  <ReactMarkdown
                    components={markdownComponents}
                  >
                    {message.content}
                  </ReactMarkdown>
                  {message.isStreaming && (
                    <span className="chat-cursor" />
                  )}
                </div>
              ) : (
                <div className="text-sm leading-relaxed">
                  {message.content}
                </div>
              )}

              {/* Sources */}
              {message.sources && message.sources.length > 0 && (
                <div className="chat-sources">
                  <p className="chat-sources-label">
                    <FileCode />
                    Sources
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {message.sources.map((source, idx) => (
                      <a
                        key={idx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="source-badge"
                      >
                        <FileCode />
                        <span>{source.file}</span>
                        <span className="text-muted">:{source.lines}</span>
                        <ExternalLink className="external-icon" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {message.role === "user" && (
              <div className="chat-avatar chat-avatar--user">
                <User />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="chat-input-area">
        <div className="chat-input-row">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the codebase..."
            className="textarea flex-1"
            rows={1}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="btn btn-primary btn-icon"
          >
            <Send style={{ width: "1.25rem", height: "1.25rem" }} />
          </Button>
        </div>
        <p className="text-xs text-muted mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  );
};

export default ChatInterface;
