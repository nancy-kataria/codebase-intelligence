import { NextRequest, NextResponse } from "next/server";
import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { index } from "@/lib/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { IngestRequestSchema } from "@/lib/schema";
import { IngestResponse } from "@/lib/types";

function extractRepoName(repoUrl: string): string {
  // Extract repo name from GitHub URL
  const match = repoUrl.match(/\/([^/]+?)(\.git)?$/);
  return match ? match[1] : "default";
}

async function ingestRepo(repoUrl: string, token: string): Promise<void> {
  const repoName = extractRepoName(repoUrl);

  const loader = new GithubRepoLoader(repoUrl, {
    branch: "main",
    accessToken: token,
    ignoreFiles: [
      "package-lock.json",
      ".env",
      "deno-lock.json",
      "yarn.lock",
      "composer.lock",
      "pnpm-lock.yaml",
      "Gemfile.lock",
      "poetry.lock",
      "uv.lock",
      "*.png",
      "*.jpg",
      "*.jpeg",
      "*.gif",
      "*.svg",
      "*.ico",
      "*.pdf",
      "*.docx",
      "*.woff",
      "*.woff2",
      "*.ttf",
      "*.eot",
      ".git/**",
      ".vscode/**",
      ".idea/**",
      "node_modules/**",
      "__pycache__/**",
      "*.pyc",
    ],
  });

  // Loading documents from the github loader
  const docs = await loader.load();
  console.log(`Loaded ${docs.length} documents`);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  // split the documents into chunks
  const chunks = await splitter.splitDocuments(docs);
  console.log(`Split into ${chunks.length} chunks`);

  const embeddings = new OpenAIEmbeddings({
    modelName: "text-embedding-3-small",
  });

  console.log("Generating embeddings for chunks...");

  await PineconeStore.fromDocuments(chunks, embeddings, {
    pineconeIndex: index,
    namespace: repoName,
  });

  console.log("Ingestion complete!");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const validationResult = IngestRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          error: validationResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(", "),
        } as IngestResponse,
        { status: 400 }
      );
    }

    const { repoUrl, token } = validationResult.data;

    // calling the ingestion script in the background
    ingestRepo(repoUrl, token)
      .then(() => {
        console.log("Ingestion completed successfully");
      })
      .catch((error) => {
        console.error("Ingestion failed:", error);
      });

    return NextResponse.json(
      {
        success: true,
        message: "Ingestion started. Processing repository in background.",
      } as IngestResponse
    );
  } catch (error) {
    console.error("Error starting ingestion:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to start ingestion",
        error: error instanceof Error ? error.message : "Unknown error",
      } as IngestResponse,
      { status: 500 }
    );
  }
}