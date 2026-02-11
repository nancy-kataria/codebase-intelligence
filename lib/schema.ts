import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const ChatRequestSchema = z.object({
  message: z.string().min(1, "Message is required"),
  namespace: z.string().optional(),
  conversationHistory: z.array(MessageSchema).optional(),
});

export const SummarizeRequestSchema = z.object({
  namespace: z.string().optional(),
});

export const IngestRequestSchema = z.object({
  repoUrl: z.string().url("Invalid URL format").includes("github.com", { message: "Must be a valid GitHub URL" }),
  token: z.string().min(1, "Token is required"),
});