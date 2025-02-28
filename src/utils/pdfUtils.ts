
import { Chunk } from "@/components/ChunkList";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Process a PDF file by uploading it to Supabase for processing
 */
export const splitPdfIntoChunks = async (file: File): Promise<Chunk[]> => {
  try {
    toast.info(`Processing ${file.name}...`, {
      description: "This may take a minute for large documents."
    });

    // Create form data for the file
    const formData = new FormData();
    formData.append('file', file);

    // Call Supabase Edge Function to process the PDF
    const { data, error } = await supabase.functions.invoke('process-pdf', {
      body: formData,
    });

    if (error) {
      console.error('Error processing PDF:', error);
      toast.error('Failed to process PDF', {
        description: error.message
      });
      throw new Error(`Failed to process PDF: ${error.message}`);
    }

    // Parse response from the Edge Function
    if (!data || !data.success) {
      const errorMessage = data?.error || 'Unknown error';
      console.error('Error in PDF processing response:', errorMessage);
      toast.error('PDF processing failed', {
        description: errorMessage
      });
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
    toast.success(`PDF processing complete`, {
      description: `Created ${chunks.length} chunks`
    });
    
    return chunks;
  } catch (error) {
    console.error('Error in PDF processing:', error);
    toast.error('PDF processing failed', {
      description: error instanceof Error ? error.message : 'Unknown error occurred'
    });
    throw error;
  }
};

/**
 * Fetch the content of a specific chunk from the database
 */
const fetchChunkContent = async (chunkId: string): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from('pdf_chunks')
      .select('content')
      .eq('id', chunkId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching chunk content:', error);
      return 'Error fetching chunk content';
    }

    if (!data || !data.content) {
      return 'No content available for this chunk';
    }

    // Check if the content is readable or if it's likely garbled text
    if (containsHighPercentageOfUnreadableChars(data.content)) {
      return `[Note: This chunk may contain encoding issues or non-textual content. The PDF might be scanned or contain images rather than searchable text.]

${data.content}`;
    }

    return data.content;
  } catch (error) {
    console.error('Error processing chunk content:', error);
    return 'Error processing chunk content';
  }
};

/**
 * Check if a string contains a high percentage of potentially unreadable characters
 */
const containsHighPercentageOfUnreadableChars = (text: string): boolean => {
  if (!text || text.length === 0) return false;
  
  // Count characters that are likely to be encoding issues
  const problematicCharsCount = (text.match(/[\uFFFD\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g) || []).length;
  
  // Count unicode characters that might indicate encoding problems
  const unicodeCharsCount = (text.match(/[\u0100-\uFFFF]/g) || []).length;

  // If more than 15% of characters are problematic or high unicode, it's likely unreadable
  const problematicRatio = problematicCharsCount / text.length;
  const unicodeRatio = unicodeCharsCount / text.length;
  
  return problematicRatio > 0.15 || unicodeRatio > 0.5;
};
