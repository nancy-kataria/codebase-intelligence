import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { NextRequest, NextResponse } from "next/server";
import { IngestRequestSchema } from "@/lib/schema";
import { IngestResponse } from "@/lib/types";

/**
 * Extracts the repository name from a GitHub repository URL
 * 
 * @param repoUrl - The GitHub repository URL
 * @returns The repository name string 
 */
function extractRepoName(repoUrl: string): string {
  const match = repoUrl.match(/\/([^/]+?)(\.git)?$/);
  return match ? match[1] : "default";
}

/**
 * Ingests a GitHub repository into a vector database for RAG-based codebase querying
 * 
 * 1. Validates inputs and checks for existing data to avoid duplicates
 * 2. Loads source code files from the GitHub repository
 * 3. Splits documents into smaller chunks
 * 4. Generates embeddings
 * 5. Stores vectors in Pinecone
 * 
 * @param repoUrl - The GitHub repository URL to ingest (must be a valid github.com URL)
 * @param token - GitHub personal access token with repository read permissions
 * @returns Promise<void> - Resolves when ingestion completes, throws error on failure
 * 
 * @throws {Error} repository URL contains non-ASCII characters
 * @throws {Error} GitHub token contains non-ASCII characters  
 * @throws {Error} repository URL is not a valid GitHub URL
 * @throws {Error} GitHub authentication fails or repository is inaccessible
 * @throws {Error} vector database operations fail
 */
async function ingestRepo(repoUrl: string, token: string): Promise<void> {
  const repoName = extractRepoName(repoUrl);

  // Validate inputs are ASCII
  if (!/^[\x00-\x7F]*$/.test(repoUrl)) {
    throw new Error("Repository URL contains non-ASCII characters");
  }
  if (!/^[\x00-\x7F]*$/.test(token)) {
    throw new Error("GitHub token contains non-ASCII characters");
  }

  if (!repoUrl.includes("github.com")) {
    throw new Error("Invalid GitHub repository URL");
  }

  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
  const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

  const stats = await index.describeIndexStats();
  if (stats.namespaces && stats.namespaces[repoName]) {
    const vectorCount = stats.namespaces[repoName].recordCount;
    console.log(`Namespace "${repoName}" already exists with ${vectorCount} records.`);
    
    return; 
  }

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

  const docs = await loader.load();
  console.log(`Loaded ${docs.length} documents`);

  const spliter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const chunks = await spliter.splitDocuments(docs);
  console.log(`Split into ${chunks.length} chunks`);

  const embeddings = new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY,
    modelName: "text-embedding-3-small",
  });

  await PineconeStore.fromDocuments(chunks, embeddings, {
    pineconeIndex: index,
    namespace: repoName,
  });

  console.log("Ingestion complete!");
}

/**
 * POST API endpoint for ingesting GitHub repositories into the vector database
 * 
 * @param req - Next.js request object containing the ingestion request payload
 * @returns Promise<NextResponse> - JSON response with success status and message or error
 */
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

    try {
      await ingestRepo(repoUrl, token);
      return NextResponse.json(
        {
          success: true,
          message: "Ingestion completed successfully.",
        } as IngestResponse
      );
    } catch (ingestionError) {
      console.error("Ingestion failed:", ingestionError);
      return NextResponse.json(
        {
          success: false,
          message: "Ingestion failed",
          error: ingestionError instanceof Error ? ingestionError.message : "Unknown error",
        } as IngestResponse,
        { status: 500 }
      );
    }
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
