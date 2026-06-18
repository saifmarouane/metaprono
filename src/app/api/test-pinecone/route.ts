import { NextRequest } from "next/server";
import { getPineconeIndex } from "@/lib/pinecone";
import { queryRelevantDocuments } from "@/lib/pinecone";

const VECTOR_DIMENSION = 1024;

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const namespace = searchParams.get("namespace") || "uploads";
    const testQuery = searchParams.get("query") || "family in need";

    const index = getPineconeIndex();
    
    // Try to query with a test vector
    console.log(`[Test Pinecone] Testing namespace: "${namespace}"`);
    console.log(`[Test Pinecone] Test query: "${testQuery}"`);

    const results = await queryRelevantDocuments(
      testQuery,
      async (text: string) => placeholderEmbed(text),
      {
        topK: 10,
        namespace,
        includeMetadata: true,
      }
    );

    // Also try to get stats about the index
    let stats: unknown;
    try {
      // Try to get index stats (this might not work with all Pinecone versions)
      const indexWithStats = index as unknown as {
        describeIndexStats?: () => Promise<unknown>;
      };
      stats = indexWithStats.describeIndexStats
        ? await indexWithStats.describeIndexStats()
        : undefined;
    } catch (statsError) {
      console.warn("[Test Pinecone] Could not get index stats:", statsError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        namespace,
        testQuery,
        resultsCount: results.length,
        results: results.map((r) => ({
          id: r.id,
          score: r.score,
          source: (r.metadata as { source?: string })?.source,
          chunkIndex: (r.metadata as { chunkIndex?: number })?.chunkIndex,
          textPreview: ((r.metadata as { text?: string })?.text || "").substring(0, 200),
          textLength: ((r.metadata as { text?: string })?.text || "").length,
        })),
        stats: stats || { message: "Stats not available" },
        message: results.length > 0 
          ? `Found ${results.length} documents in namespace "${namespace}"` 
          : `No documents found in namespace "${namespace}". Make sure you've uploaded files.`,
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : String(error);
    console.error("[Test Pinecone] Error:", errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? errorStack : undefined,
      }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
}

