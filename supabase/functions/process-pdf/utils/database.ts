
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Sanitizes text for database storage
 * @param text Text to sanitize 
 * @returns Sanitized text
 */
function sanitizeForDatabase(text: string): string {
  if (!text) return '';
  
  // Remove problematic characters that could cause database issues
  return text
    // Remove null bytes and control characters
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    // Remove Unicode escape sequences that cause database errors
    .replace(/\\u[0-9a-fA-F]{4}/g, '')
    // Replace backslashes that might create escape sequences
    .replace(/\\/g, '\\\\')
    // Replace single quotes to prevent SQL injection
    .replace(/'/g, "''")
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

/**
 * Creates a new PDF record in the database
 * @param supabase Supabase client
 * @param fileName Storage filename
 * @param originalName Original filename
 * @param fileSize File size in bytes
 * @returns Created PDF record
 */
export async function createPdfRecord(
  supabase: SupabaseClient, 
  fileName: string, 
  originalName: string, 
  fileSize: number
) {
  const { data, error } = await supabase
    .from('processed_pdfs')
    .insert({
      filename: sanitizeForDatabase(fileName),
      original_name: sanitizeForDatabase(originalName),
      size: fileSize
    })
    .select()
    .single();
    
  if (error) {
    console.error('Error inserting PDF record:', error);
    throw error;
  }
  
  return data;
}

/**
 * Creates a new chunk record in the database
 * @param supabase Supabase client
 * @param pdfId Parent PDF ID
 * @param chunkNumber Sequence number of the chunk
 * @param chunkFileName Storage filename
 * @param tokens Estimated token count
 * @param content Text content
 * @returns Created chunk record
 */
export async function createChunkRecord(
  supabase: SupabaseClient,
  pdfId: string,
  chunkNumber: number,
  chunkFileName: string,
  tokens: number,
  content: string
) {
  // Sanitize the content before storing
  const sanitizedContent = sanitizeForDatabase(content);
  
  const { data, error } = await supabase
    .from('pdf_chunks')
    .insert({
      pdf_id: pdfId,
      chunk_number: chunkNumber,
      filename: sanitizeForDatabase(chunkFileName),
      tokens: tokens,
      content: sanitizedContent
    })
    .select()
    .single();
    
  if (error) {
    console.error(`Error inserting chunk ${chunkNumber} record:`, error);
    throw error;
  }
  
  return data;
}
