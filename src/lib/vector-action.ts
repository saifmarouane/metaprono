"use server";

import { getPineconeIndex } from "@/lib/pinecone";

const ALLOWED_PDF = "application/pdf";
const ALLOWED_EXCEL = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const VECTOR_DIMENSION = 1024; // Match your Pinecone index dimension (1024)

export type UploadResult = {
  success: boolean;
  fileName: string;
  message: string;
  recordCount?: number;
};

/** Placeholder embed: returns a deterministic vector from text. Replace with OpenAI/Cohere in production. */
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

function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const chunks: string[] = [];
  for (let start = 0; start < text.length; start += chunkSize - overlap) {
    const chunk = text.slice(start, start + chunkSize).trim();
    if (chunk.length) chunks.push(chunk);
  }
  return chunks.length ? chunks : [text];
}

async function parsePdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });

  try {
    const data = await parser.getText();
    return data.text ?? "";
  } finally {
    await parser.destroy();
  }
}

async function parseExcel(buffer: Buffer): Promise<string> {
  const XLSX = await import("xlsx");
  const lines: string[] = [];
  
  try {
    // Try reading with different options to handle various Excel formats
    let workbook;
    let readError: Error | null = null;
    
    // Try multiple read strategies to work around xlsx library bugs
    const readStrategies = [
      // Strategy 1: Minimal options
      () => XLSX.read(buffer, { type: "buffer", cellDates: false }),
      // Strategy 2: With dense option
      () => XLSX.read(buffer, { type: "buffer", cellDates: false, dense: true }),
      // Strategy 3: With sheetStubs
      () => XLSX.read(buffer, { type: "buffer", cellDates: false, sheetStubs: true }),
      // Strategy 4: Default options
      () => XLSX.read(buffer, { type: "buffer" }),
    ];
    
    for (const readStrategy of readStrategies) {
      try {
        workbook = readStrategy();
        // If we got here, the read was successful
        readError = null;
        break;
      } catch (err) {
        readError = err instanceof Error ? err : new Error(String(err));
        // Check if it's the specific "forEach" error
        const errorMsg = readError.message.toLowerCase();
        if (errorMsg.includes("foreach") || errorMsg.includes("records")) {
          // This is the known bug, try next strategy
          continue;
        }
        // For other errors, also try next strategy
        continue;
      }
    }
    
    // If all strategies failed, throw a helpful error
    if (!workbook) {
      if (readError && (readError.message.includes("forEach") || readError.message.includes("records"))) {
        throw new Error(
          "Excel file parsing failed due to a library compatibility issue. " +
          "Please try saving the file in a different Excel format (e.g., .xlsx instead of .xls) or " +
          "ensure the file is not corrupted. Original error: " + readError.message
        );
      }
      throw readError || new Error("Failed to read Excel file with all available methods");
    }
    
    // Validate workbook structure
    if (!workbook) {
      throw new Error("Failed to read workbook");
    }
    
    // Safely get sheet names - handle case where SheetNames might not exist
    const sheetNames = workbook.SheetNames;
    if (!sheetNames || !Array.isArray(sheetNames) || sheetNames.length === 0) {
      throw new Error("Workbook contains no sheets");
    }
    
    for (const sheetName of sheetNames) {
      try {
    const sheet = workbook.Sheets[sheetName];
        if (!sheet) {
          continue;
        }
        
        // Method 1: Direct cell iteration (most reliable, avoids library bugs)
        if (sheet["!ref"]) {
          try {
            const range = XLSX.utils.decode_range(sheet["!ref"]);
            let hasData = false;
            for (let rowNum = range.s.r; rowNum <= range.e.r; rowNum++) {
              const rowCells: string[] = [];
              for (let colNum = range.s.c; colNum <= range.e.c; colNum++) {
                const cellAddress = XLSX.utils.encode_cell({ r: rowNum, c: colNum });
                const cell = sheet[cellAddress];
                if (cell && cell.v !== undefined && cell.v !== null && cell.v !== "") {
                  rowCells.push(String(cell.v).trim());
                }
              }
              if (rowCells.length > 0) {
                lines.push(rowCells.join(" "));
                hasData = true;
              }
            }
            if (hasData) {
              continue; // Success, move to next sheet
            }
          } catch (cellErr) {
            // Fall through to next method
          }
        }
        
        // Method 2: Try using sheet_to_csv (avoid sheet_to_json which has the forEach bug)
        try {
          const csv = XLSX.utils.sheet_to_csv(sheet, { 
            blankrows: false,
            FS: ","
          });
          if (csv && csv.trim()) {
            const csvLines = csv.split("\n")
              .map(line => line.trim())
              .filter(line => line.length > 0);
            if (csvLines.length > 0) {
              lines.push(...csvLines);
              continue; // Success, move to next sheet
            }
          }
        } catch (csvErr) {
          // Fall through to next method
        }
        
        // Method 3: Try sheet_to_json as last resort (but wrap it safely - this may have the bug)
        try {
          const jsonData = XLSX.utils.sheet_to_json(sheet, { 
            header: 1,
            defval: "",
            raw: false,
            blankrows: false
          });
          
          if (Array.isArray(jsonData)) {
            for (const row of jsonData) {
              if (Array.isArray(row)) {
                const cells = row
                  .map(c => String(c ?? "").trim())
                  .filter(c => c.length > 0);
                if (cells.length > 0) {
                  lines.push(cells.join(" "));
                }
              } else if (typeof row === "object" && row !== null) {
                // If it's an object (header row), convert to array
                const values = Object.values(row)
                  .map(v => String(v ?? "").trim())
                  .filter(v => v.length > 0);
                if (values.length > 0) {
                  lines.push(values.join(" "));
    }
  }
            }
          }
        } catch (jsonErr) {
          console.error(`All parsing methods failed for sheet "${sheetName}"`);
        }
      } catch (sheetErr) {
        console.error(`Error processing sheet "${sheetName}":`, sheetErr);
        // Continue with other sheets
      }
    }
  } catch (err) {
    throw new Error(`Failed to parse Excel file: ${err instanceof Error ? err.message : String(err)}`);
  }
  
  return lines.join("\n");
}

export async function uploadAndVectorize(
  formData: FormData
): Promise<UploadResult[]> {
  const files = formData.getAll("files") as File[];
  const results: UploadResult[] = [];

  for (const file of files) {
    const fileName = file.name;
    try {
      const type = file.type;
      const size = file.size;
      if (size > MAX_FILE_SIZE) {
        results.push({
          success: false,
          fileName,
          message: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024} MB)`,
        });
        continue;
      }
      const allowed =
        type === ALLOWED_PDF || ALLOWED_EXCEL.includes(type);
      if (!allowed) {
        results.push({
          success: false,
          fileName,
          message: "Invalid type. Use PDF or Excel (.xlsx, .xls).",
        });
        continue;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      let rawText: string;
      try {
        rawText =
        type === ALLOWED_PDF
          ? await parsePdf(buffer)
          : await parseExcel(buffer);
      } catch (parseErr) {
        // Provide more helpful error messages
        const errorMessage = parseErr instanceof Error ? parseErr.message : String(parseErr);
        if (errorMessage.includes("forEach") || errorMessage.includes("records")) {
          throw new Error(
            `Excel file parsing error. The file might be corrupted or in an unsupported format. ` +
            `Original error: ${errorMessage}`
          );
        }
        throw parseErr;
      }

      const text = rawText.trim();
      if (!text) {
        results.push({
          success: false,
          fileName,
          message: "No text content could be extracted.",
        });
        continue;
      }

      const chunks = chunkText(text);
      const namespace = "uploads";
      
      // Ensure chunks is an array
      if (!Array.isArray(chunks) || chunks.length === 0) {
        throw new Error("No text chunks were generated from the file");
      }
      
      const vectors = chunks.map((chunk, i) => {
        const values = placeholderEmbed(chunk);
        // Ensure values is an array with correct dimension
        if (!Array.isArray(values) || values.length !== VECTOR_DIMENSION) {
          throw new Error(`Invalid vector dimension: expected ${VECTOR_DIMENSION}, got ${values.length}`);
        }
        return {
        id: `${fileName}-${Date.now()}-${i}`,
          values: values,
        metadata: {
          source: fileName,
          chunkIndex: i,
          text: chunk, // Store the full chunk text, not just 200 characters
        },
        };
      });

      // Ensure vectors is a valid array
      if (!Array.isArray(vectors) || vectors.length === 0) {
        throw new Error("No vectors were generated from the file");
      }
      
      // Validate each vector has required fields
      for (const vector of vectors) {
        if (!vector.id || !Array.isArray(vector.values) || vector.values.length !== VECTOR_DIMENSION) {
          throw new Error(`Invalid vector structure: ${JSON.stringify(vector)}`);
        }
      }

      const index = getPineconeIndex();
      const indexWithNamespace = index as unknown as {
        namespace?: (name: string) => {
          upsert: (records: typeof vectors) => Promise<unknown>;
        };
        upsert: (...args: unknown[]) => Promise<unknown>;
      };
      
      // Pinecone v4 API: Try different formats to handle the upsert correctly
      try {
        // Format 1: Try with namespace as method chain (v4 style)
        if (namespace && indexWithNamespace.namespace) {
          await indexWithNamespace.namespace(namespace).upsert(vectors);
        } else {
          await indexWithNamespace.upsert(vectors);
        }
      } catch (upsertErr) {
        const errorMsg = upsertErr instanceof Error ? upsertErr.message : String(upsertErr);
        
        // If the error mentions forEach or records, try alternative formats
        if (errorMsg.includes("forEach") || errorMsg.includes("records") || errorMsg.includes("is not a function")) {
          try {
            // Format 2: Try with namespace as option
            await indexWithNamespace.upsert(vectors, { namespace });
          } catch (format2Err) {
            try {
              // Format 3: Try old v3 format
              await indexWithNamespace.upsert({ vectors, namespace });
            } catch (format3Err) {
              throw new Error(
                `Pinecone upsert failed with all formats. ` +
                `Please verify your Pinecone index configuration and API version. ` +
                `Error 1: ${errorMsg}. ` +
                `Error 2: ${format2Err instanceof Error ? format2Err.message : String(format2Err)}. ` +
                `Error 3: ${format3Err instanceof Error ? format3Err.message : String(format3Err)}`
              );
            }
          }
        } else {
          throw upsertErr;
        }
      }

      results.push({
        success: true,
        fileName,
        message: `Stored ${vectors.length} chunk(s) in Pinecone.`,
        recordCount: vectors.length,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error during upload.";
      results.push({ success: false, fileName, message });
    }
  }

  return results;
}

