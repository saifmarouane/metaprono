# Aura-Sadaqa

Aura-Sadaqa is a Ramadan charity assistant for associations coordinating Sadaqa, Zakat, Quffat Ramadan, Iftar logistics, family lists, volunteer work, and donation inventories around Casablanca.

The app combines a Next.js dashboard, document ingestion, Pinecone vector search, and Gemini streaming responses so volunteers can upload PDF/Excel knowledge files and ask grounded questions through an AI chat interface.

## Features

- Landing page for the Aura-Sadaqa concept and entry point to the dashboard.
- Dashboard built with Next.js App Router parallel route slots:
  - `@chat` for the AI assistant.
  - `@explorer` for the document knowledge base.
- Streaming chat responses from `/api/chat`.
- RAG-style retrieval from Pinecone before sending context to Gemini.
- Upload and vectorization flow for PDF, `.xlsx`, and `.xls` files.
- File validation with React Hook Form, Zod, and local Shadcn-style form components.
- Shared dashboard state through `SadaqaProvider`.
- Tailwind CSS v4 theme variables for the Ramadan visual identity.
- Diagnostic API routes for Pinecone and Gemini model checks.

## Tech Stack

- Next.js 16 with App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Framer Motion
- Lucide React
- React Hook Form
- Zod
- Google Gemini via `@google/generative-ai`
- Pinecone via `@pinecone-database/pinecone`
- `pdf-parse` for PDFs
- `xlsx` for spreadsheet parsing

## Project Structure

```txt
src/
  app/
    page.tsx                    # Landing page route
    upload/page.tsx             # Standalone upload route
    Dashboard/
      layout.tsx                # Parallel-route dashboard shell
      page.tsx                  # Empty root page for parallel slots
      @chat/page.tsx            # Streaming chat UI
      @explorer/page.tsx        # Upload and knowledge-base UI
    api/
      chat/route.ts             # Streaming Gemini + Pinecone route
      test-pinecone/route.ts    # Pinecone diagnostics
      test-models/route.ts      # Gemini model diagnostics
  components/
    landing/LandingPage.tsx
    ui/
  contexts/
    sadaqa-context.tsx
  lib/
    chat-action.ts
    pinecone.ts
    vector-action.ts
```

## Requirements

- Node.js 20 or newer recommended
- npm
- A Google Gemini API key
- A Pinecone API key
- A Pinecone index with dimension `1024`

The current embedding implementation is a deterministic placeholder vector function with dimension `1024`. For production-quality semantic retrieval, replace it with a real embedding model and make sure the Pinecone index dimension matches that model.

## Environment Variables

Create `.env.local` in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=casa-ramadan-2026
```

The app stores uploaded document vectors in the `uploads` namespace.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

Useful routes:

- `/` - landing page
- `/Dashboard` - split dashboard with chat and knowledge base
- `/upload` - standalone upload page
- `/api/test-pinecone?namespace=uploads` - verify Pinecone access and stored records
- `/api/test-models` - test Gemini model availability

## How The RAG Flow Works

```txt
User uploads PDF/Excel
  -> vector-action parses text
  -> text is split into chunks
  -> chunks are embedded with the placeholder embedder
  -> vectors and metadata are stored in Pinecone

User asks a question
  -> /api/chat embeds the question
  -> Pinecone returns matching chunks from the uploads namespace
  -> retrieved text is inserted into the Gemini prompt
  -> Gemini streams the answer back to the chat UI
```

Stored Pinecone metadata includes:

- `source` - original file name
- `chunkIndex` - chunk position in the parsed document
- `text` - chunk text used as retrieved context

## Dashboard Architecture

`src/app/Dashboard/layout.tsx` defines two independent parallel slots:

- `chat`
- `explorer`

Both slots are rendered side by side inside `SadaqaProvider`. This lets the explorer process uploads while the chat remains available. The context currently tracks:

- `activeDocument`
- `isThinking`

The chat slot toggles `isThinking` while a streamed response is active, and the explorer can display that state.

## Upload Rules

Supported files:

- PDF
- `.xlsx`
- `.xls`

Limits:

- Maximum file size: `10 MB`
- Empty files or files with no extractable text are rejected
- Unsupported MIME types are rejected before vectorization

## Styling

Tailwind v4 is configured in `src/app/globals.css` using `@theme`.

Current theme variables include:

```css
--color-primary: #050505;
--color-card: #0a0a0a;
--color-accent: #f59e0b;
--color-ramadan-gold: #f59e0b;
--color-night-blue: #050505;
--color-dashboard-bg: #1f1f2e;
--color-dashboard-card: #2a2a3d;
```

Fonts are loaded through `next/font/google`:

- Playfair Display for serif display text
- Inter for sans-serif UI text

## Scripts

```bash
npm run dev      # Start Next.js in development mode
npm run build    # Build for production
npm run start    # Start the production server
npm run lint     # Run ESLint
```

## Implementation Notes

- `src/lib/chat-action.ts` and `/api/chat` both contain streaming chat logic, but the UI currently calls `/api/chat`.
- Gemini model names are tried in sequence inside `/api/chat`, starting with `gemini-1.5-flash`.
- Retrieval quality is limited by the placeholder embedder. Use a real embedding provider before relying on similarity search in production.
- The folder name `Dashboard` is capitalized, while the project brief asks for kebab/lowercase conventions. Rename route folders carefully if strict convention compliance is required.
