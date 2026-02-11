# Codebase Intelligence

A Retrieval-Augmented Generation (RAG) application for intelligent codebase analysis. Upload any GitHub repository and get instant AI-powered insights, summaries, and context-aware Q&A about your code through semantic search and vector embeddings.

## Features

- 🔍 **Repository Analysis**: Automatically analyze GitHub repositories and extract meaningful insights
- 📊 **Project Summarization**: Generate AI-powered summaries including tech stack, architecture patterns, and code statistics
- 💬 **RAG-Powered Chat**: Ask natural language questions and receive context-aware answers by retrieving relevant code snippets and augmenting LLM prompts
- 🚀 **Vector Embeddings**: Uses Pinecone vector database for semantic search and efficient code context retrieval
- 🔐 **Privacy First**: Code is processed in-memory and never permanently stored
- ⚡ **Real-time Processing**: Stream-based UI updates for smooth user experience

## Tech Stack

### Frontend & Backend
- **Next.js 14** - React framework with App Router and API routes
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zod** - Runtime type validation

### AI & Vector Database (RAG Stack)
- **LangChain** - Document loading, chunking, and LLM orchestration
- **Pinecone** - Vector database for semantic search and retrieval
- **OpenAI** - GPT-4o for generation, text-embedding-3-small for retrieval

## Getting Started

### Prerequisites

- Node.js 18+
- Git
- OpenAI API key
- Pinecone API key
- GitHub Personal Access Token

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd code-onboarder
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure `.env.local` using `.env.example`

### Development

Start the Next.js development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### RAG Pipeline

The application implements a three-stage RAG workflow:

1. **Ingestion** (`/api/ingest`): Loads GitHub repository files, chunks them into semantic segments, generates vector embeddings, and stores them in Pinecone with metadata
2. **Summarization** (`/api/summarize`): Retrieves code context vectors and augments GPT-4o prompts to generate architecture summaries and tech stack analysis
3. **Conversation** (`/api/chat`): For each user query, retrieves relevant code context from Pinecone and augments the LLM prompt to provide accurate, code-informed responses

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## Project Structure

```
app/
├── layout.tsx                # Root layout
├── page.tsx                  # Home page
├── globals.css               # Global styles
└── api/                      # Next.js API routes
    ├── ingest/
    │   └── route.ts          # Repository ingestion endpoint
    ├── chat/
    │   └── route.ts          # Chat endpoint
    └── summarize/
        └── route.ts          # Summary generation endpoint

lib/
├── pinecone.ts               # Pinecone client initialization
├── schema.ts                 # Zod validation schemas
└── types.ts                  # TypeScript type definitions

public/                        # Static assets
```


## Validation

- **Zod Schemas** for request validation across all endpoints
- Type-safe API responses with TypeScript inference
- Client-side validation before API calls

## Contributing

Contributions are welcome! Please ensure:
- TypeScript types are properly defined
- Zod schemas validate all API inputs
- Components use established patterns
- Code is well-documented

