
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Storage bucket for PDF chunks
const CHUNKS_BUCKET = 'pdf_chunks';

/**
 * Ensures the storage bucket exists
 * @param supabase Supabase client
 * @returns Promise resolving when bucket exists
 */
async function ensureBucketExists(supabase: SupabaseClient) {
  // Check if bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(bucket => bucket.name === CHUNKS_BUCKET);
  
  // Create bucket if it doesn't exist
  if (!bucketExists) {
    const { error } = await supabase.storage.createBucket(CHUNKS_BUCKET, {
      public: false
    });
    
    if (error) {
      throw error;
    }
    
    console.log(`Created ${CHUNKS_BUCKET} bucket`);
  }
}

/**
 * Uploads a PDF chunk to storage
 * @param supabase Supabase client
 * @param content Chunk content
 * @param fileName Storage filename
 * @returns Upload result
 */
export async function uploadChunkFile(
  supabase: SupabaseClient,
  content: string,
  fileName: string
) {
  try {
    // Ensure bucket exists
    await ensureBucketExists(supabase);
    
    // Create file with content
    const file = new Blob([content], { type: 'text/plain' });
    
    // Upload to storage
    const { error } = await supabase.storage
      .from(CHUNKS_BUCKET)
      .upload(fileName, file, {
        contentType: 'text/plain',
        upsert: true
      });
    
    if (error) {
      throw error;
    }
    
    return fileName;
  } catch (error) {
    console.error(`Error uploading chunk file ${fileName}:`, error);
    throw error;
  }
}
