
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
    // Log file info to help with debugging
    console.log(`Processing PDF: ${file.name}, size: ${file.size} bytes`);
    
    // Calculate estimated page count for logging
    const estimatedPageCount = Math.ceil(file.size / 50000); // ~50KB per page
    console.log(`Estimated page count: ~${estimatedPageCount} pages`);
    
    // Read the file as ArrayBuffer for PDF parsing
    const fileBuffer = await file.arrayBuffer();
    
    // Set chunk size based on file size to handle large PDFs
    // For larger documents, use smaller chunk size to ensure multiple chunks
    const chunkSize = file.size > 1000000 ? 8000 : 15000;
    console.log(`Using chunk size: ${chunkSize} characters`);
    
    // Try to extract real text from PDF and split into chunks
    const { chunks, tokenCounts } = await extractChunksFromPdf(fileBuffer, chunkSize);
    
    // If no chunks were extracted, fall back to simulation
    if (chunks.length === 0) {
      console.warn("No text chunks extracted from PDF, falling back to simulation");
      const simulatedData = simulateChunksFromPdf(file.name, file.size);
      await processChunks(supabase, pdfRecord, simulatedData.chunks, simulatedData.tokenCounts, processedChunks);
    } else {
      // Process the extracted chunks
      console.log(`Successfully extracted ${chunks.length} chunks from PDF`);
      await processChunks(supabase, pdfRecord, chunks, tokenCounts, processedChunks);
    }
  } catch (error) {
    console.error("Error in PDF text extraction:", error);
    console.warn("Falling back to simulated chunks due to extraction error");
    
    // Fall back to simulation on error
    const { chunks, tokenCounts } = simulateChunksFromPdf(file.name, file.size);
    await processChunks(supabase, pdfRecord, chunks, tokenCounts, processedChunks);
  }
  
  console.log(`Total processed chunks: ${processedChunks.length}`);
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
      
      console.log(`Processing chunk ${chunkNumber}/${chunks.length}, size: ${chunks[i].length} chars`);
      
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
      
      console.log(`Chunk ${chunkNumber} processed successfully`);
    } catch (error) {
      console.error(`Error processing chunk ${i + 1}:`, error);
      // Continue with other chunks even if one fails
    }
  }
}
