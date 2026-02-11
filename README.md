# Codebase Intelligence

An AI-powered codebase analysis and intelligence platform. Upload any GitHub repository and get instant insights, summaries, and an intelligent chat interface to understand your codebase.

## Features

- 🔍 **Repository Analysis**: Automatically analyze GitHub repositories and extract meaningful insights
- 📊 **Project Summarization**: Generate AI-powered summaries including tech stack, architecture patterns, and code statistics
- 💬 **Intelligent Chat**: Ask questions about your codebase and get context-aware answers powered by RAG
- 🚀 **Vector Embeddings**: Uses Pinecone for semantic search and retrieval-augmented generation
- 🔐 **Privacy First**: Code is processed in-memory and never permanently stored
- ⚡ **Real-time Processing**: Stream-based UI updates for smooth user experience

## Tech Stack

### Frontend & Backend
- **Next.js 14** - React framework with App Router and API routes
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zod** - Runtime type validation

### AI & Vector Database
- **LangChain** - LLM orchestration
- **Pinecone** - Vector database
- **OpenAI** - LLM & embeddings

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

API endpoints:
- `/api/ingest` - POST: Ingest a GitHub repository
- `/api/chat` - POST: Chat about the ingested codebase
- `/api/summarize` - POST: Generate summaries of the codebase

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

