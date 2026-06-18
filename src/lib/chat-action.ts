"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { queryRelevantDocuments } from "@/lib/pinecone";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const VECTOR_DIMENSION = 1024;

if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set. Chat functionality will not work.");
}

/** Placeholder embed function - returns a deterministic vector from text */
function placeholderEmbed(text: string): number[] {
  const hash = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i) | 0;
    return Math.abs(h);
  };
  const out: number[] = [];
  for (let i = 0; i < VECTOR_DIMENSION; i++) {
    out.push((hash(text + i) % 1000) / 1000 - 0.5);
  }
  return out;
}

/**
 * Stream a chat response using Gemini with RAG from Pinecone.
 */
export async function* streamChatResponse(
  message: string,
  namespace: string = "uploads"
): AsyncGenerator<string, void, unknown> {
  if (!GEMINI_API_KEY) {
    yield "Error: GEMINI_API_KEY is not configured. Please set it in your environment variables.";
    return;
  }

  try {
    // Query Pinecone for relevant documents
    const relevantDocs = await queryRelevantDocuments(
      message,
      async (text: string) => placeholderEmbed(text),
      {
        topK: 5,
        namespace,
        includeMetadata: true,
      }
    );

    // Build context from relevant documents
    const context = relevantDocs
      .map((doc) => {
        const metadata = doc.metadata as { text?: string; source?: string };
        return metadata.text || "";
      })
      .filter(Boolean)
      .join("\n\n");

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash" 
    });

    // Build the prompt with context
    const systemPrompt = `You are MetaPronostic, a football prediction and match intelligence assistant.

Use the following context from uploaded football reports, odds files, model notes, or scouting documents to provide accurate answers. If the context does not contain relevant information, say that the uploaded documents do not contain the requested detail.

Context from documents:
${context || "No relevant documents found."}

User question: ${message}

Provide a helpful, accurate response based on the context above. Be concise and focus on match analysis, probabilities, data signals, and football context.`;

    // Stream the response
    const result = await model.generateContentStream(systemPrompt);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        yield chunkText;
      }
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    yield `Error: ${errorMessage}`;
  }
}

