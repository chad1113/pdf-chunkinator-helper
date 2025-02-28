
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Ensures that required storage buckets exist
 * @param supabase Supabase client
 */
export async function ensureStorageBuckets(supabase: SupabaseClient) {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    
    if (!buckets?.find(b => b.name === 'pdfs')) {
      await supabase.storage.createBucket('pdfs', { public: false });
      console.log('Created pdfs bucket');
    }
    
    if (!buckets?.find(b => b.name === 'pdf_chunks')) {
      await supabase.storage.createBucket('pdf_chunks', { public: false });
      console.log('Created pdf_chunks bucket');
    }
  } catch (err) {
    console.error('Error creating buckets:', err);
    throw err;
  }
}

/**
 * Uploads a PDF file to storage
 * @param supabase Supabase client
 * @param file File to upload
 * @param fileName Destination filename
 * @returns Upload result
 */
export async function uploadPdfFile(supabase: SupabaseClient, file: File, fileName: string) {
  const { data, error } = await supabase.storage
    .from('pdfs')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false
    });
    
  if (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
  
  return data;
}

/**
 * Uploads a text chunk to storage
 * @param supabase Supabase client
 * @param chunkContent Text content
 * @param chunkFileName Destination filename
 * @returns Upload result
 */
export async function uploadChunkFile(supabase: SupabaseClient, chunkContent: string, chunkFileName: string) {
  const { data, error } = await supabase.storage
    .from('pdf_chunks')
    .upload(chunkFileName, chunkContent, {
      contentType: 'text/plain',
      upsert: false
    });
    
  if (error) {
    console.error(`Error uploading chunk:`, error);
    throw error;
  }
  
  return data;
}
