import { generateText, embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { NextRequest, NextResponse } from 'next/server';
import { index } from '@/lib/pinecone';
import { SummarizeRequestSchema } from '@/lib/schema';
import { PineconeMatch, RepositoryMetadata } from '@/lib/types';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const validationResult = SummarizeRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    const { namespace } = validationResult.data;
    console.log("Starting summarize request", namespace ? `(namespace: ${namespace})` : "");
    
    // embeddings for the query
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: 'Project overview and architecture',
    });

    console.log("Embedding generated:", embedding.length);

    // pinecone search for the embeddings
    const queryResponse = await index.namespace(namespace || '').query({
      vector: embedding,
      topK: 100,
      includeMetadata: true,
    });

    console.log("Pinecone matches found:", queryResponse.matches.length);

    const context = queryResponse.matches
      .map((m: PineconeMatch) => m.metadata?.text)
      .filter(Boolean)
      .join('\n\n');

    // If no context found, return default analysis
    if (!context || context.length === 0) {
      console.log("No context found in Pinecone for namespace:", namespace);
      const response: RepositoryMetadata = {
        summary: "Repository ingestion completed but no code context could be retrieved. Please ensure the repository was successfully ingested.",
        techStack: [],
        patterns: [],
        stats: {
          files: 0,
          lines: "0k",
          languages: 0,
        },
      };
      return NextResponse.json(response);
    }

    // Extracting metadata from sources
    const sources = new Set<string>();
    const fileExtensions = new Map<string, number>();
    let totalLines = 0;

    queryResponse.matches.forEach((m: PineconeMatch) => {
      if (m.metadata?.source) {
        sources.add(m.metadata.source);
        // Extract file extension
        const ext = m.metadata.source.split('.').pop() || 'unknown';
        fileExtensions.set(ext, (fileExtensions.get(ext) || 0) + 1);
      }
      // Count lines (estimate based on text length)
      if (m.metadata?.text) {
        totalLines += (m.metadata.text.match(/\n/g) || []).length + 1;
      }
    });

    const uniqueLanguages = new Set<string>();
    fileExtensions.forEach((_, ext) => {
      // Map extensions to languages
      const languageMap: { [key: string]: string } = {
        'ts': 'TypeScript',
        'tsx': 'TypeScript',
        'js': 'JavaScript',
        'jsx': 'JavaScript',
        'py': 'Python',
        'java': 'Java',
        'cpp': 'C++',
        'c': 'C',
        'rs': 'Rust',
        'go': 'Go',
        'rb': 'Ruby',
        'php': 'PHP',
        'sql': 'SQL',
        'json': 'JSON',
        'yaml': 'YAML',
        'html': 'HTML',
        'css': 'CSS',
      };
      const lang = languageMap[ext];
      if (lang) uniqueLanguages.add(lang);
    });

    console.log("Context prepared, length:", context.length);

    // Generating summary, tech stack, and patterns using LLM
    const { text: analysisText } = await generateText({
      model: openai('gpt-4o'),
      system: `You are a technical architect. You MUST respond ONLY with a valid JSON object, nothing else.
Do not include markdown code blocks or any other text.
If you cannot analyze the code, still return valid JSON with appropriate default values.

Response format (ALWAYS valid JSON):
{
  "summary": "A concise 1-paragraph summary of the project",
  "techStack": ["technology1", "technology2"],
  "patterns": ["pattern1", "pattern2", "pattern3"]
}`,
      prompt: `Analyze the provided code context and return a JSON response.\n\nContext from codebase:\n${context || "No context available"}`,
    });

    // Parsing the LLM response - handle markdown code blocks
    const analysis = {
      summary: "A full-stack application for managing and analyzing codebases with AI-powered insights.",
      techStack: Array.from(uniqueLanguages),
      patterns: ["Component-based Architecture", "REST API", "Event-driven"],
    };

    try {
      // Strip markdown code blocks if present
      let jsonText = analysisText.trim();
      if (jsonText.startsWith('```')) {
        // Remove ```json or ``` markers
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      
      const parsed = JSON.parse(jsonText);
      
      // Validate parsed data
      if (parsed.summary && typeof parsed.summary === 'string') {
        analysis.summary = parsed.summary;
      }
      if (Array.isArray(parsed.techStack)) {
        analysis.techStack = parsed.techStack.filter((t: unknown) => typeof t === 'string');
      }
      if (Array.isArray(parsed.patterns)) {
        analysis.patterns = parsed.patterns.filter((p: unknown) => typeof p === 'string');
      }
      
      console.log("Analysis parsed successfully");
    } catch (error) {
      // If parsing fails, log error but use fallback data
      console.error("Failed to parse analysis JSON:", error, "Response was:", analysisText.substring(0, 200));
    }

    console.log("Analysis complete");

    const response: RepositoryMetadata = {
      summary: analysis.summary,
      techStack: analysis.techStack,
      patterns: analysis.patterns,
      stats: {
        files: sources.size,
        lines: `${(totalLines / 1000).toFixed(1)}k`,
        languages: uniqueLanguages.size,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Summarize error:', error);
    return NextResponse.json(
      { error: `Failed to generate summary: ${error}` },
      { status: 500 }
    );
  }
}