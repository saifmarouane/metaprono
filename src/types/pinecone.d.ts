declare module "@pinecone-database/pinecone" {
  export interface PineconeIndex {
    upsert(options: {
      vectors: Array<{
        id: string;
        values: number[];
        metadata?: Record<string, unknown>;
      }>;
      namespace?: string;
    }): Promise<unknown>;
    query(options: {
      vector: number[];
      topK?: number;
      namespace?: string;
      includeValues?: boolean;
      includeMetadata?: boolean;
      filter?: Record<string, unknown>;
    }): Promise<{
      matches?: Array<{
        id?: string;
        score?: number;
        values?: number[];
        metadata?: Record<string, unknown>;
      }>;
    }>;
  }

  export interface PineconeConfig {
    apiKey: string;
  }

  export class Pinecone {
    constructor(config?: PineconeConfig);
    index(name: string): PineconeIndex;
  }
}
