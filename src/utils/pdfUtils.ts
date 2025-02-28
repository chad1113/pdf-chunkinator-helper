
import { Chunk } from "@/components/ChunkList";
import { supabase } from "@/integrations/supabase/client";

/**
 * Process a PDF file by uploading it to Supabase for processing
 */
export const splitPdfIntoChunks = async (file: File): Promise<Chunk[]> => {
  try {
    // Create form data for the file
    const formData = new FormData();
    formData.append('file', file);

    // Call Supabase Edge Function to process the PDF
    const { data, error } = await supabase.functions.invoke('process-pdf', {
      body: formData,
    });

    if (error) {
      console.error('Error processing PDF:', error);
      throw new Error(`Failed to process PDF: ${error.message}`);
    }

    // Parse response from the Edge Function
    if (!data || !data.success) {
      const errorMessage = data?.error || 'Unknown error';
      console.error('Error in PDF processing response:', errorMessage);
      throw new Error(`PDF processing failed: ${errorMessage}`);
    }

    // Convert the response to the expected Chunk format
    const chunksPromises = data.chunks.map(async (chunk: any) => {
      // Fetch the content for each chunk
      const content = await fetchChunkContent(chunk.id);
      return {
        id: chunk.id,
        filename: `${file.name.replace('.pdf', '')}_chunk_${chunk.chunk_number}.txt`,
        tokens: chunk.tokens,
        content: content
      };
    });

    // Wait for all chunks to be processed
    const chunks = await Promise.all(chunksPromises);

    console.log(`Created ${chunks.length} chunks from ${file.name}`);
    return chunks;
  } catch (error) {
    console.error('Error in PDF processing:', error);
    throw error;
  }
};

/**
 * Fetch the content of a specific chunk from the database
 */
const fetchChunkContent = async (chunkId: string): Promise<string> => {
  const { data, error } = await supabase
    .from('pdf_chunks')
    .select('content')
    .eq('id', chunkId)
    .single();

  if (error) {
    console.error('Error fetching chunk content:', error);
    return 'Error fetching chunk content';
  }

  return data.content;
};
