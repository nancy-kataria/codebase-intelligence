# Codebase Intelligence

A Retrieval-Augmented Generation (RAG) application for intelligent codebase analysis. Upload any GitHub repository and get instant AI-powered insights, summaries, and context-aware Q&A about your code through semantic search and vector embeddings.

## Demo

Watch the demo on YouTube: https://youtu.be/eKBP3mmAprc

[![Watch the demo](https://img.youtube.com/vi/eKBP3mmAprc/maxresdefault.jpg)](https://youtu.be/eKBP3mmAprc)

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-green?logo=openai)](https://openai.com/)
[![Pinecone](https://img.shields.io/badge/Pinecone-Vector%20DB-orange?logo=pinecone)](https://www.pinecone.io/)
[![LangChain](https://img.shields.io/badge/LangChain-RAG-purple?logo=langchain)](https://langchain.com/)

### Problem Statement

Understanding large, complex codebases and navigating massive GitHub repositories is a major bottleneck for developers onboarding or trying to debug unfamiliar legacy code. I wanted to build a tool that allows engineers to interact with their code context-awarely and get instant, accurate architectural answers.

### Impact

The project bridges the gap between raw, multi-file code syntax and semantic vector search, letting developers ask natural-language architectural questions about an unfamiliar repository and get grounded, code-informed answers. The goal is to shorten the time spent reading through a large codebase before becoming productive in it — a common bottleneck during onboarding or when debugging unfamiliar legacy code.

## Features

- **Repository Analysis**: Automatically analyze GitHub repositories and extract meaningful insights
- **Project Summarization**: Generate AI-powered summaries including tech stack, architecture patterns, and code statistics
- **RAG-Powered Chat**: Ask natural language questions and receive context-aware answers by retrieving relevant code snippets and augmenting LLM prompts
- **Vector Embeddings**: Uses Pinecone vector database for semantic search and efficient code context retrieval

## Tech Stack

### Frontend & Backend
- **Next.js 16** - React framework with App Router and API routes
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
cd codebase-intelligence
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local
```

### Development

Start the Next.js development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### RAG Pipeline

The application implements a three-stage RAG workflow:

1. **Ingestion** (`/api/ingest`): Loads GitHub repository files, chunks them on **language-aware syntactic boundaries** (see below), generates vector embeddings, and stores them in Pinecone with metadata
2. **Summarization** (`/api/summarize`): Retrieves code context vectors and augments GPT-4o prompts to generate architecture summaries and tech stack analysis
3. **Conversation** (`/api/chat`): For each user query, retrieves relevant code context from Pinecone and augments the LLM prompt to provide accurate, code-informed responses

### Chunking Strategy

A RAG system is only as good as its chunks: each chunk becomes a single embedding, so a chunk that splits a function in half produces two vectors that each represent an incomplete idea, degrading retrieval quality.

Rather than splitting code into fixed-size character windows, the ingestion pipeline chunks on **syntactic boundaries** so each embedding is a coherent unit:

- Files are grouped by language (detected from their extension), and each group is split with language-specific separators via LangChain's `RecursiveCharacterTextSplitter.fromLanguage()` — preferring to break between functions, classes, and other top-level constructs rather than through them.
- Supported languages include TypeScript/JavaScript, Python, Go, Rust, Java, C/C++, Ruby, PHP, and more; non-code files (JSON, YAML, CSS, plain text) fall back to a generic recursive splitter so nothing is dropped.

This is heuristic, separator-based splitting (not a full tree-sitter AST parse) — a deliberate tradeoff that captures most of the benefit without per-language parser dependencies.

### Build

```bash
npm run build
```


## Validation

- **Zod Schemas** for request validation across all endpoints
- Type-safe API responses with TypeScript inference
- Client-side validation before API calls

## Contributing

This project is open source and contributions are welcome! Feel free to open issues, submit pull requests, or suggest improvements.

