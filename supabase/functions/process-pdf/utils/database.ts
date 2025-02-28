
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      filename: fileName,
      original_name: originalName,
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
  const { data, error } = await supabase
    .from('pdf_chunks')
    .insert({
      pdf_id: pdfId,
      chunk_number: chunkNumber,
      filename: chunkFileName,
      tokens: tokens,
      content: content
    })
    .select()
    .single();
    
  if (error) {
    console.error(`Error inserting chunk ${chunkNumber} record:`, error);
    throw error;
  }
  
  return data;
}
