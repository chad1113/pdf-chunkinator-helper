
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { simulateChunksFromPdf } from "./chunking.ts";
import { uploadChunkFile } from "./storage.ts";
import { createChunkRecord } from "./database.ts";

/**
 * Interface for processed chunk data
 */
export interface ProcessedChunk {
  id: string;
  chunk_number: number;
  tokens: number;
}

/**
 * Processes a PDF file and creates chunks
 * @param supabase Supabase client
 * @param file PDF file
 * @param pdfRecord Database record for the PDF
 * @returns Array of processed chunks
 */
export async function processPdfIntoChunks(
  supabase: SupabaseClient,
  file: File,
  pdfRecord: any
): Promise<ProcessedChunk[]> {
  // Simulate PDF text extraction and chunking
  const { chunks, tokenCounts } = simulateChunksFromPdf(file.name, file.size);
  const processedChunks: ProcessedChunk[] = [];
  
  // Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    try {
      const chunkNumber = i + 1;
      const chunkFileName = `${pdfRecord.id}_chunk_${chunkNumber}.txt`;
      
      // Upload chunk file to storage
      await uploadChunkFile(supabase, chunks[i], chunkFileName);
      
      // Create chunk record in database
      const chunkRecord = await createChunkRecord(
        supabase,
        pdfRecord.id,
        chunkNumber,
        chunkFileName,
        tokenCounts[i],
        chunks[i]
      );
      
      // Add to processed chunks list
      processedChunks.push({
        id: chunkRecord.id,
        chunk_number: chunkNumber,
        tokens: tokenCounts[i]
      });
    } catch (error) {
      console.error(`Error processing chunk ${i + 1}:`, error);
      // Continue with other chunks even if one fails
    }
  }
  
  return processedChunks;
}
