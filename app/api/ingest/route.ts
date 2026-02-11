import { NextRequest, NextResponse } from "next/server";
import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { index } from "@/lib/pinecone";
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
  let docs;
  try {
    docs = await loader.load();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load repository: ${errorMsg}`);
  }
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

  const embeddingsList = await embeddings.embedDocuments(
    chunks.map((chunk) => chunk.pageContent),
  );

  console.log(`Generated ${embeddingsList.length} embeddings`);

  // vectors in the new Pinecone API format
  const vectors = chunks.map((chunk, idx) => ({
    id: `chunk-${Date.now()}-${idx}`,
    values: embeddingsList[idx],
    metadata: {
      source: chunk.metadata.source || "unknown",
      text: chunk.pageContent,
    },
  }));

  console.log(`Upserting ${vectors.length} vectors to Pinecone (namespace: ${repoName})...`);

  // Upserting in batches using the new API format
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(vectors.length / batchSize);
    console.log(
      `Upserting batch ${batchNum} of ${totalBatches}... (${batch.length} vectors)`,
    );
    await index.namespace(repoName).upsert({ records: batch });
  }

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