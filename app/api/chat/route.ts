import { streamText, embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { ChatRequestSchema } from "@/lib/schema";
import { index } from "@/lib/pinecone";
import { PineconeMatch } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

/**
 * Chat API endpoint for querying the ingested codebase using RAG (streaming)
 * 
 * 1. Validates the incoming chat request
 * 2. Generates embeddings for the user's question
 * 3. Performs semantic search against the vector database to find relevant code snippets
 * 4. Streams an AI-generated response about the codebase back to the client
 * 
 * @param req - Next.js request object containing the chat message, namespace, and conversation history
 * @returns Text stream response with the AI-generated answer
 */
export async function POST(req: NextRequest) {
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

    
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: message,
    });

    console.log("Embedding generated:", embedding.length);

    
    const queryResponse = await index.namespace(namespace || '').query({
      vector: embedding,
      topK: 10, 
      includeMetadata: true,
    });

    
    const context = queryResponse.matches
      .map((m: PineconeMatch) => m.metadata?.text)
      .filter(Boolean)
      .join("\n\n")

    
    const messages = conversationHistory || [];
    messages.push({
      role: "user",
      content: message,
    });

    
    const result = streamText({
      model: openai("gpt-4o"),
      system: `You are a helpful technical assistant analyzing a codebase. Every
question is to be answered in context with computer science, coding, software technologies.
You have access to relevant code snippets and documentation from the repository.
Answer questions about the codebase based on the provided context. If something is not in the context, say so.
You should be able to answer questions related to the technology, requirements and architecture. 
A user can ask: "Where are the API endpoints defined?" or "What is the flow of data from the login 
page to the database?" The answers should be detailed and not exceeding 2 paragraphs at a time.

IMPORTANT: Format your responses using markdown for better readability:
- Use **bold** for important terms and concepts
- Use numbered lists (1. 2. 3.) for steps or multiple items
- Use bullet points for features or characteristics
- Use code formatting with backticks for file names, function names, or code snippets
- Use headings (##) to organize complex responses
- Use separate paragraphs for different topics

Context from codebase:
${context}`,
      messages: messages.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: `Chat failed: ${error}` },
      { status: 500 }
    );
  }
}
