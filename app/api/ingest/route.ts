import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import {
  RecursiveCharacterTextSplitter,
  SupportedTextSplitterLanguage,
} from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import type { Document } from "@langchain/core/documents";
import { NextRequest, NextResponse } from "next/server";
import { IngestRequestSchema } from "@/lib/schema";
import { IngestResponse, IngestTimings } from "@/lib/types";

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

/**
 * Maps file extensions to the language whose syntactic separators LangChain
 * should use when chunking. Extensions absent here fall back to the generic
 * character splitter (e.g. JSON, YAML, CSS, plain text).
 */
const EXTENSION_TO_LANGUAGE: Record<string, SupportedTextSplitterLanguage> = {
  ts: "js",
  tsx: "js",
  js: "js",
  jsx: "js",
  mjs: "js",
  cjs: "js",
  py: "python",
  java: "java",
  c: "cpp",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  h: "cpp",
  hpp: "cpp",
  go: "go",
  rs: "rust",
  rb: "ruby",
  php: "php",
  scala: "scala",
  swift: "swift",
  sol: "sol",
  proto: "proto",
  rst: "rst",
  md: "markdown",
  markdown: "markdown",
  html: "html",
  htm: "html",
  tex: "latex",
};

/**
 * to find the language for chunking from a source file from its extension.
 *
 * @param source - The file path stored on the document's metadata
 * @returns The matching LangChain language, or null when no language-aware
 *          splitter applies (the caller should use the generic splitter)
 */
function getLanguageForSource(
  source: string | undefined
): SupportedTextSplitterLanguage | null {
  const ext = source?.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  return EXTENSION_TO_LANGUAGE[ext] ?? null;
}

/**
 * Splits documents on syntactic boundaries (function/class..) instead of
 * arbitrary character windows, so each chunk is a coherent semantic unit.
 *
 * @param docs - Loaded repository documents (each carries a `source` in metadata)
 * @returns The combined, metadata-preserving chunks across all languages
 */
async function splitDocumentsByLanguage(
  docs: Document[]
): Promise<Document[]> {
  const groups = new Map<SupportedTextSplitterLanguage | "generic", Document[]>();
  for (const doc of docs) {
    const lang = getLanguageForSource(doc.metadata?.source) ?? "generic";
    const group = groups.get(lang);
    if (group) group.push(doc);
    else groups.set(lang, [doc]);
  }

  const allChunks: Document[] = [];
  for (const [lang, groupDocs] of groups) {
    const splitter =
      lang === "generic"
        ? new RecursiveCharacterTextSplitter({
            chunkSize: CHUNK_SIZE,
            chunkOverlap: CHUNK_OVERLAP,
          })
        : RecursiveCharacterTextSplitter.fromLanguage(lang, {
            chunkSize: CHUNK_SIZE,
            chunkOverlap: CHUNK_OVERLAP,
          });
    const chunks = await splitter.splitDocuments(groupDocs);
    console.log(`  ${lang}: ${groupDocs.length} files -> ${chunks.length} chunks`);
    allChunks.push(...chunks);
  }
  return allChunks;
}

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
 * @returns Promise<IngestTimings> - Per-phase timings once ingestion completes
 *
 * @throws {Error} repository URL contains non-ASCII characters
 * @throws {Error} GitHub token contains non-ASCII characters
 * @throws {Error} repository URL is not a valid GitHub URL
 * @throws {Error} GitHub authentication fails or repository is inaccessible
 * @throws {Error} vector database operations fail
 */
async function ingestRepo(repoUrl: string, token: string): Promise<IngestTimings> {
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

    return {
      loadMs: 0,
      chunkMs: 0,
      embedStoreMs: 0,
      totalMs: 0,
      documents: 0,
      chunks: vectorCount ?? 0,
      skipped: true,
    };
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

  const tStart = performance.now();

  const docs = await loader.load();
  const tLoaded = performance.now();
  console.log(`Loaded ${docs.length} documents`);

  // Chunk on language-aware syntactic boundaries so functions/classes stay
  // intact within a single embedding, instead of being cut mid-body.
  const chunks = await splitDocumentsByLanguage(docs);
  const tChunked = performance.now();
  console.log(`Split into ${chunks.length} chunks`);

  const embeddings = new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY,
    modelName: "text-embedding-3-small",
  });

  await PineconeStore.fromDocuments(chunks, embeddings, {
    pineconeIndex: index,
    namespace: repoName,
  });
  const tStored = performance.now();

  const timings: IngestTimings = {
    loadMs: Math.round(tLoaded - tStart),
    chunkMs: Math.round(tChunked - tLoaded),
    embedStoreMs: Math.round(tStored - tChunked),
    totalMs: Math.round(tStored - tStart),
    documents: docs.length,
    chunks: chunks.length,
    skipped: false,
  };

  console.log(
    `Ingestion complete! load=${timings.loadMs}ms chunk=${timings.chunkMs}ms ` +
    `embed+store=${timings.embedStoreMs}ms total=${timings.totalMs}ms ` +
    `(${timings.documents} files -> ${timings.chunks} chunks)`
  );

  return timings;
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
      const timings = await ingestRepo(repoUrl, token);
      return NextResponse.json(
        {
          success: true,
          message: timings.skipped
            ? "Repository already ingested."
            : "Ingestion completed successfully.",
          timings,
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
