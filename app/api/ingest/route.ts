import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { NextRequest, NextResponse } from "next/server";
import { IngestRequestSchema } from "@/lib/schema";
import { IngestResponse } from "@/lib/types";

function extractRepoName(repoUrl: string): string {
  // Extract repo name from GitHub URL
  const match = repoUrl.match(/\/([^/]+?)(\.git)?$/);
  return match ? match[1] : "default";
}

async function ingestRepo(repoUrl: string, token: string): Promise<void> {
  const repoName = extractRepoName(repoUrl);

  // Validate inputs are ASCII
  if (!/^[\x00-\x7F]*$/.test(repoUrl)) {
    throw new Error("Repository URL contains non-ASCII characters");
  }
  if (!/^[\x00-\x7F]*$/.test(token)) {
    throw new Error("GitHub token contains non-ASCII characters");
  }

  // Ensure repoUrl is a valid GitHub URL
  if (!repoUrl.includes("github.com")) {
    throw new Error("Invalid GitHub repository URL");
  }

  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
  const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

  //  Check if the namespace already exists
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

    // Execute ingestion and wait for completion
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
