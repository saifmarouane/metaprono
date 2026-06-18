import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { queryRelevantDocuments } from "@/lib/pinecone";
import { getMongoContext } from "@/lib/mongodb-context";
import { getCurrentChatAccess } from "@/lib/chat-users";

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

export async function POST(req: NextRequest) {
  const access = await getCurrentChatAccess();
  if (!access.allowed) {
    return new Response(
      JSON.stringify({
        error:
          access.reason === "pending"
            ? "Compte en attente de validation admin"
            : access.reason === "blocked"
              ? "Compte bloque"
              : "Authentification requise",
      }),
      {
        status: access.status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (!GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY is not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { message, namespace = "uploads", conversationHistory = [] } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let mongoContext = "";
    try {
      mongoContext = await getMongoContext(message);
      if (mongoContext) {
        console.log(
          `[Chat API] MongoDB context loaded: ${mongoContext.length} characters`
        );
      }
    } catch (mongoError) {
      console.error("[Chat API] MongoDB context error:", mongoError);
      mongoContext = "";
    }

    // Query Pinecone for relevant documents
    // Since we're using a placeholder embedding (hash-based, not semantic),
    // we need to increase topK significantly and try multiple query variations
    let relevantDocs: Awaited<ReturnType<typeof queryRelevantDocuments>> = [];
    try {
      console.log(`[Chat API] Querying Pinecone with message: "${message.substring(0, 100)}..."`);
      console.log(`[Chat API] Using namespace: "${namespace}"`);
      
      // Try the original message first
      relevantDocs = await queryRelevantDocuments(
        message,
        async (text: string) => placeholderEmbed(text),
        {
          topK: 20, // Increased from 5 to 20 to catch more potential matches
          namespace,
          includeMetadata: true,
        }
      );
      
      // If no results, try a simplified version of the query
      if (relevantDocs.length === 0) {
        console.log(`[Chat API] No results with original query, trying simplified version...`);
        const simplifiedQuery = message.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
        if (simplifiedQuery !== message.toLowerCase()) {
          relevantDocs = await queryRelevantDocuments(
            simplifiedQuery,
            async (text: string) => placeholderEmbed(text),
            {
              topK: 20,
              namespace,
              includeMetadata: true,
            }
          );
        }
      }
      
      // Remove duplicates by ID and sort by score (highest first)
      const uniqueDocs = new Map<string, Awaited<ReturnType<typeof queryRelevantDocuments>>[0]>();
      for (const doc of relevantDocs) {
        if (!uniqueDocs.has(doc.id) || (uniqueDocs.get(doc.id)?.score || 0) < (doc.score || 0)) {
          uniqueDocs.set(doc.id, doc);
        }
      }
      relevantDocs = Array.from(uniqueDocs.values())
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 10); // Take top 10 after deduplication
      
      console.log(`[Chat API] Found ${relevantDocs.length} relevant documents from Pinecone`);
      if (relevantDocs.length > 0) {
        console.log(`[Chat API] Document scores:`, relevantDocs.map(d => ({ 
          id: d.id,
          score: d.score, 
          source: (d.metadata as { source?: string })?.source,
          textLength: ((d.metadata as { text?: string })?.text || "").length
        })));
        // Log a sample of the retrieved text
        const sampleDoc = relevantDocs[0];
        const sampleText = (sampleDoc.metadata as { text?: string })?.text || "";
        if (sampleText) {
          console.log(`[Chat API] Sample retrieved text: "${sampleText.substring(0, 200)}..."`);
        }
      } else {
        console.warn(`[Chat API] No documents found! This could mean:
          1. No data exists in Pinecone namespace "${namespace}"
          2. The placeholder embedding function isn't finding similar documents
          3. The query vector doesn't match any stored vectors
          
          Try visiting /api/test-pinecone?namespace=${namespace} to verify data exists.`);
      }
    } catch (pineconeError) {
      console.error("[Chat API] Pinecone query error:", pineconeError);
      console.error("[Chat API] Error details:", pineconeError instanceof Error ? pineconeError.stack : String(pineconeError));
      // Continue without context if Pinecone fails
      relevantDocs = [];
    }

    // Build context from relevant documents
    const context = relevantDocs
      .map((doc, idx) => {
        const metadata = doc.metadata as { text?: string; source?: string; chunkIndex?: number };
        const text = metadata.text || "";
        // Log if we're getting empty text
        if (!text) {
          console.warn(`[Chat API] Document ${doc.id} (index ${idx}) has no text in metadata`);
          console.warn(`[Chat API] Metadata keys:`, Object.keys(metadata));
        } else {
          console.log(`[Chat API] Document ${idx + 1}: ${text.substring(0, 100)}... (${text.length} chars)`);
        }
        return text;
      })
      .filter(Boolean)
      .join("\n\n");
    
    console.log(`[Chat API] Final context length: ${context.length} characters from ${relevantDocs.length} documents`);
    if (context.length === 0) {
      console.warn(`[Chat API] WARNING: No context available! The AI will give generic responses.`);
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    // Try different model names - the actual available models depend on your API key and region
    // Common model names (try in order):
    const modelNamesToTry = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-flash-latest",
      "gemini-2.5-pro",
      "gemini-pro-latest",
    ];
    
    let model;
    let lastError: Error | null = null;
    let successfulModelName = "";
    
    // We can't test models without actually calling them, so we'll try during streaming
    // For now, just use the first one and let the streaming catch handle errors
    model = genAI.getGenerativeModel({ model: modelNamesToTry[0] });
    successfulModelName = modelNamesToTry[0];
    console.log(`Using Gemini model: ${successfulModelName}`);

    // Build conversation history for context
    const conversationContext = conversationHistory.length > 0
      ? conversationHistory
          .slice(-6) // Last 6 messages for context
          .map((msg: { role: string; content: string }) => 
            `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
          )
          .join("\n")
      : "";

    // Build the prompt with context
    const hasContext = context && context.length > 0;
    const hasMongoContext = mongoContext && mongoContext.length > 0;
    const hasConversation = conversationContext.length > 0;
    
    const systemPrompt = `You are MetaPronostic, a concise football prediction and data assistant. The MongoDB database contains football data modeled from API-FOOTBALL v3 collections such as countries, leagues, seasons, venues, teams, fixtures, fixture events, fixture statistics, fixture lineups, players, player statistics, standings, injuries, and odds. Answer questions directly and briefly.

${hasConversation ? `Previous conversation:
${conversationContext}

` : ""}${hasMongoContext
  ? `MongoDB data context:
${mongoContext}

` : ""}${hasContext 
  ? `Document context:
${context}

` : ""}Current question: ${message}

Instructions:
- Remember names and information from the conversation above
- For questions about football teams, leagues, fixtures, scores, events, standings, players, injuries, lineups, statistics, or odds: use MongoDB data context first when available
- Explain when the MongoDB collection is empty or when the requested data is not present in the provided context
- For greetings/introductions: Respond naturally and briefly (1-2 sentences)
- For document questions: Use ONLY the document context if available
- Be concise - maximum 3-4 sentences unless listing specific data
- If asking about documents but not found, say "Not found in documents"
- For conversational questions (names, greetings), respond naturally

Answer:`;

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Try models in order until one works
        let streamingError: Error | null = null;
        
        for (const modelName of modelNamesToTry) {
          try {
            const testModel = genAI.getGenerativeModel({ model: modelName });
            console.log(`Trying model: ${modelName}`);
            
            // Build conversation history for Gemini API
            const geminiHistory = conversationHistory
              .slice(-10) // Last 10 messages
              .map((msg: { role: string; content: string }) => ({
                role: msg.role === "user" ? "user" : "model",
                parts: [{ text: msg.content }],
              }));

            // Stream the response - use the correct API format
            const result = await testModel.generateContentStream({
              contents: [
                ...geminiHistory,
                { role: "user", parts: [{ text: systemPrompt }] },
              ],
            });

            // If we get here, the model works!
            console.log(`Successfully using model: ${modelName}`);
            
            for await (const chunk of result.stream) {
              const chunkText = chunk.text();
              if (chunkText) {
                controller.enqueue(encoder.encode(chunkText));
              }
            }
            controller.close();
            return; // Success, exit the function
          } catch (error) {
            streamingError = error instanceof Error ? error : new Error(String(error));
            const errorMsg = streamingError.message;
            console.warn(`Model ${modelName} failed:`, errorMsg);
            
            // If it's not a 404, it might be a different error - try next model
            if (!errorMsg.includes("404") && !errorMsg.includes("not found")) {
              continue;
            }
            // If it's 404, try next model
            continue;
          }
        }
        
        // If we get here, all models failed
        console.error("All models failed. Last error:", streamingError);
        const errorMessage = streamingError?.message || "All Gemini models failed";
        
        const helpMessage = 
          `\n\n❌ No Gemini models are available with your API key.\n\n` +
          `Please check:\n` +
          `1. Your GEMINI_API_KEY is correct and active\n` +
          `2. Your API key has access to Gemini models\n` +
          `3. Check available models at: https://ai.google.dev/models\n` +
          `4. Try generating a new API key at: https://makersuite.google.com/app/apikey\n\n` +
          `Tried models: ${modelNamesToTry.join(", ")}\n` +
          `Last error: ${errorMessage}`;
        
        controller.enqueue(encoder.encode(helpMessage));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("API route error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : String(error);
    console.error("Error stack:", errorStack);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? errorStack : undefined
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

