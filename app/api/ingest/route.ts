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
  console.log(`🚀 Starting ingestion for repository: ${repoName}`);

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

  console.log(`📥 Initializing GitHub loader for: ${repoUrl}`);

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
  console.log(`📚 Loading documents from GitHub repository...`);
  let docs;
  try {
    docs = await loader.load();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to load repository:`, errorMsg);
    throw new Error(`Failed to load repository: ${errorMsg}`);
  }
  console.log(`✅ Loaded ${docs.length} documents from repository`);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  // split the documents into chunks
  console.log(`🔪 Splitting documents into chunks...`);
  const chunks = await splitter.splitDocuments(docs);
  console.log(`✅ Split into ${chunks.length} chunks`);

  // Clear docs from memory for large repos
  docs.length = 0;

  const embeddings = new OpenAIEmbeddings({
    modelName: "text-embedding-3-small",
    timeout: 120000, // 2 minute timeout
    maxRetries: 3,
  });

  console.log(`Generating embeddings for ${chunks.length} chunks...`);

  let embeddingsList;
  try {
    // Process embeddings in smaller batches to avoid timeouts
    const embeddingBatchSize = 50;
    embeddingsList = [];
    
    for (let i = 0; i < chunks.length; i += embeddingBatchSize) {
      const embeddingBatch = chunks.slice(i, i + embeddingBatchSize);
      const embeddingBatchNum = Math.floor(i / embeddingBatchSize) + 1;
      const totalEmbeddingBatches = Math.ceil(chunks.length / embeddingBatchSize);
      
      console.log(`Processing embedding batch ${embeddingBatchNum}/${totalEmbeddingBatches} (${embeddingBatch.length} chunks)`);
      
      const batchEmbeddings = await embeddings.embedDocuments(
        embeddingBatch.map((chunk) => chunk.pageContent)
      );
      
      embeddingsList.push(...batchEmbeddings);
      console.log(`✓ Embedding batch ${embeddingBatchNum}/${totalEmbeddingBatches} completed`);
      
      // Small delay between embedding batches
      if (embeddingBatchNum < totalEmbeddingBatches) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  } catch (embeddingError) {
    console.error("Failed to generate embeddings:", embeddingError);
    throw new Error(`Embedding generation failed: ${embeddingError instanceof Error ? embeddingError.message : String(embeddingError)}`);
  }

  console.log(`✅ Generated ${embeddingsList.length} embeddings successfully`);

  // vectors in the new Pinecone API format
  console.log(`🔄 Creating vector objects...`);
  const vectors = chunks.map((chunk, idx) => ({
    id: `chunk-${Date.now()}-${idx}`,
    values: embeddingsList[idx],
    metadata: {
      source: chunk.metadata.source || "unknown",
      text: chunk.pageContent,
    },
  }));
  console.log(`✅ Created ${vectors.length} vector objects`);

  // Clear chunks and embeddings from memory
  chunks.length = 0;
  embeddingsList.length = 0;

  console.log(`Upserting ${vectors.length} vectors to Pinecone (namespace: ${repoName})...`);

  // Upserting in batches using the new API format with better error handling
  const batchSize = 100;
  const totalBatches = Math.ceil(vectors.length / batchSize);
  let successfulBatches = 0;
  
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    
    console.log(
      `Upserting batch ${batchNum} of ${totalBatches}... (${batch.length} vectors)`,
    );
    
    try {
      await index.namespace(repoName).upsert({ records: batch });
      successfulBatches++;
      console.log(`✓ Batch ${batchNum}/${totalBatches} completed successfully`);
      
      // Add small delay between batches to avoid rate limiting
      if (batchNum < totalBatches) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (batchError) {
      console.error(`✗ Batch ${batchNum}/${totalBatches} failed:`, batchError);
      throw new Error(`Failed to upsert batch ${batchNum}/${totalBatches}: ${batchError instanceof Error ? batchError.message : String(batchError)}`);
    }
  }

  console.log(`🎉 Ingestion complete! Successfully processed ${successfulBatches}/${totalBatches} batches (${vectors.length} total vectors)`);
  
  // Final cleanup
  vectors.length = 0;
  console.log(`📊 Repository "${repoName}" fully ingested and indexed in Pinecone`);
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