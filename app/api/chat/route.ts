import { generateText, embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { ChatRequestSchema } from "@/lib/schema";
import { index } from "@/lib/pinecone";
import { PineconeMatch } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const validationResult = ChatRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    const { message, namespace, conversationHistory } = validationResult.data;

    console.log(
      "Starting chat request:",
      message.substring(0, 50),
      `(namespace: ${namespace || "default"})`,
    );

    // 1. Generate embedding for the user message
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: message,
    });

    console.log("Embedding generated:", embedding.length);

    // 2. Query Pinecone for relevant context
    console.log("Querying Pinecone for context");
    const queryResponse = await index.namespace(namespace || '').query({
      vector: embedding,
      topK: 5, // Get top 5 most relevant chunks
      includeMetadata: true,
    });

    console.log(
      "Pinecone query complete, matches:",
      queryResponse.matches.length,
    );

    // 3. Extract context from matches
    const context = queryResponse.matches
      .map((m: PineconeMatch) => m.metadata?.text)
      .filter(Boolean)
      .join("\n\n");

    console.log("Context prepared, length:", context.length);

    // 4. Build conversation history for context
    const messages = conversationHistory || [];
    messages.push({
      role: "user",
      content: message,
    });

    // 5. Generate response with context
    const { text: response } = await generateText({
      model: openai("gpt-4o"),
      system: `You are a helpful technical assistant analyzing a codebase. 
You have access to relevant code snippets and documentation from the repository.
Answer questions about the codebase based on the provided context. If something is not in the context, say so.

Context from codebase:
${context}`,
      messages: messages.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
    });

    console.log("Chat response generated");

    return NextResponse.json({
      response,
      context:
        context.length > 0
          ? `Used ${queryResponse.matches.length} relevant code snippets`
          : "No relevant context found",
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: `Chat failed: ${error}` },
      { status: 500 }
    );
  }
}
