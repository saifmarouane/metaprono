import { Pinecone } from "@pinecone-database/pinecone";

const apiKey = process.env.PINECONE_API_KEY;
const indexName = process.env.PINECONE_INDEX_NAME;

function getPineconeClient(): Pinecone {
  if (!apiKey) {
    throw new Error("PINECONE_API_KEY is not set");
  }
  return new Pinecone({ apiKey });
}

function getIndexName(): string {
  if (!indexName) {
    throw new Error("PINECONE_INDEX_NAME is not set");
  }
  return indexName;
}

/** Get the Pinecone index instance. Use only on the server. */
export function getPineconeIndex() {
  const client = getPineconeClient();
  return client.index(getIndexName());
}

export type EmbedFn = (text: string) => Promise<number[]>;

export type QueryRelevantDocumentsOptions = {
  /** Max number of matches to return (default: 10) */
  topK?: number;
  /** Namespace to search in */
  namespace?: string;
  /** Include vector values in results (default: false) */
  includeValues?: boolean;
  /** Include metadata in results (default: true) */
  includeMetadata?: boolean;
  /** Metadata filter expression */
  filter?: Record<string, unknown>;
};

export type ScoredPineconeRecord<T = Record<string, unknown>> = {
  id: string;
  score?: number;
  values?: number[];
  metadata?: T;
};

/**
 * Query the Pinecone index for documents relevant to the given text.
 * Converts text to a vector using the provided embed function, then runs a similarity search.
 * Use only on the server (e.g. in Server Components, Route Handlers, or Server Actions).
 *
 * @param text - The query text to find relevant documents for
 * @param embed - Function that converts text to an embedding vector (e.g. via OpenAI Embeddings)
 * @param options - Query options (topK, namespace, includeMetadata, filter, etc.)
 * @returns Array of matching records with id, score, and optional metadata/values
 */
export async function queryRelevantDocuments<T = Record<string, unknown>>(
  text: string,
  embed: EmbedFn,
  options: QueryRelevantDocumentsOptions = {}
): Promise<ScoredPineconeRecord<T>[]> {
  const {
    topK = 10,
    namespace,
    includeValues = false,
    includeMetadata = true,
    filter,
  } = options;

  const vector = await embed(text);
  const index = getPineconeIndex();

  // Pinecone v4: Use namespace method chain, not a query parameter
  const queryOptions = {
    vector,
    topK,
    includeValues,
    includeMetadata,
    ...(filter !== undefined && { filter }),
  };

  // Use namespace method if provided, otherwise query directly
  const indexWithNamespace = index as unknown as {
    namespace?: (name: string) => { query: typeof index.query };
    query: typeof index.query;
  };

  const response = namespace && indexWithNamespace.namespace
    ? await indexWithNamespace.namespace(namespace).query(queryOptions)
    : await index.query(queryOptions);

  const matches = response.matches ?? [];
  return matches.map((match) => ({
    id: match.id ?? "",
    score: match.score,
    ...(includeValues && match.values && { values: match.values }),
    ...(includeMetadata && match.metadata && { metadata: match.metadata as T }),
  }));
}
