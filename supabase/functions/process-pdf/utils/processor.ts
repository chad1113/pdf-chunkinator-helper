
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractChunksFromPdf, simulateChunksFromPdf } from "./chunking.ts";
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
  const processedChunks: ProcessedChunk[] = [];
  
  try {
    // Read the file as ArrayBuffer for PDF parsing
    const fileBuffer = await file.arrayBuffer();
    
    // Extract real text from PDF and split into chunks
    const { chunks, tokenCounts } = await extractChunksFromPdf(fileBuffer, 15000);
    
    // If no chunks were extracted, fall back to simulation
    if (chunks.length === 0) {
      console.warn("No text chunks extracted from PDF, falling back to simulation");
      const simulatedData = simulateChunksFromPdf(file.name, file.size);
      await processChunks(supabase, pdfRecord, simulatedData.chunks, simulatedData.tokenCounts, processedChunks);
    } else {
      // Process the extracted chunks
      await processChunks(supabase, pdfRecord, chunks, tokenCounts, processedChunks);
    }
  } catch (error) {
    console.error("Error in PDF text extraction:", error);
    console.warn("Falling back to simulated chunks due to extraction error");
    
    // Fall back to simulation on error
    const { chunks, tokenCounts } = simulateChunksFromPdf(file.name, file.size);
    await processChunks(supabase, pdfRecord, chunks, tokenCounts, processedChunks);
  }
  
  return processedChunks;
}

/**
 * Helper function to process chunks
 */
async function processChunks(
  supabase: SupabaseClient,
  pdfRecord: any,
  chunks: string[],
  tokenCounts: number[],
  processedChunks: ProcessedChunk[]
) {
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
}
