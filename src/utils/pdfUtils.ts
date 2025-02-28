
import { Chunk } from "@/components/ChunkList";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Process a document file (PDF or DOCX) by uploading it to Supabase for processing
 */
export const splitPdfIntoChunks = async (file: File): Promise<Chunk[]> => {
  try {
    const fileType = file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOCX';
    
    toast.info(`Processing ${file.name}...`, {
      description: "This may take a minute for large documents."
    });

    // Create form data for the file
    const formData = new FormData();
    formData.append('file', file);

    // Call Supabase Edge Function to process the file
    const { data, error } = await supabase.functions.invoke('process-pdf', {
      body: formData,
    });

    if (error) {
      console.error(`Error processing ${fileType}:`, error);
      toast.error(`Failed to process ${fileType}`, {
        description: error.message
      });
      throw new Error(`Failed to process ${fileType}: ${error.message}`);
    }

    // Parse response from the Edge Function
    if (!data || !data.success) {
      const errorMessage = data?.error || 'Unknown error';
      console.error(`Error in ${fileType} processing response:`, errorMessage);
      toast.error(`${fileType} processing failed`, {
        description: errorMessage
      });
      throw new Error(`${fileType} processing failed: ${errorMessage}`);
    }

    // Convert the response to the expected Chunk format
    const chunksPromises = data.chunks.map(async (chunk: any) => {
      // Fetch the content for each chunk
      const content = await fetchChunkContent(chunk.id);
      return {
        id: chunk.id,
        filename: `${file.name.replace(/\.(pdf|docx)$/i, '')}_chunk_${chunk.chunk_number}.txt`,
        tokens: chunk.tokens,
        content: content
      };
    });

    // Wait for all chunks to be processed
    const chunks = await Promise.all(chunksPromises);

    console.log(`Created ${chunks.length} chunks from ${file.name}`);
    toast.success(`${fileType} processing complete`, {
      description: `Created ${chunks.length} chunks`
    });
    
    // Check if any chunks have text quality issues
    const chunksWithIssues = chunks.filter(chunk => 
      containsHighPercentageOfUnreadableChars(chunk.content)
    );
    
    if (chunksWithIssues.length > 0 && chunksWithIssues.length === chunks.length) {
      toast.warning(`Text extraction issues detected`, {
        description: `Your ${fileType} may contain mostly images or need optical character recognition.`
      });
    } else if (chunksWithIssues.length > 0) {
      toast.warning(`Some chunks have text extraction issues`, {
        description: `${chunksWithIssues.length} of ${chunks.length} chunks may have encoding problems.`
      });
    }
    
    return chunks;
  } catch (error) {
    console.error('Error in document processing:', error);
    toast.error('Document processing failed', {
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

    // First check - is this a "placeholder" chunk from our failover system?
    if (data.content.includes("This PDF appears to contain content that could not be properly extracted")) {
      return data.content;
    }
    
    // Second check - does this content have encoding issues?
    if (containsHighPercentageOfUnreadableChars(data.content)) {
      return `[Note: This chunk may contain encoding issues or non-textual content. The document might be scanned or contain images rather than searchable text.]

${cleanupGarbledText(data.content)}`;
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
  
  // Count normal text patterns (words, sentences)
  const wordCount = (text.match(/\b[a-zA-Z]{2,}\b/g) || []).length;
  const sentenceCount = (text.match(/[.!?]\s+[A-Z]/g) || []).length;
  
  // Various checks for readability
  const problematicRatio = problematicCharsCount / text.length;
  const unicodeRatio = unicodeCharsCount / text.length;
  const wordDensity = wordCount / (text.length / 100);
  
  // If high percentage of problematic chars or very low word density, it's likely unreadable
  return (
    problematicRatio > 0.1 || 
    (unicodeRatio > 0.4 && wordDensity < 1) ||
    (wordCount < 10 && text.length > 200)
  );
};

/**
 * Attempt to clean up garbled text for better readability
 */
const cleanupGarbledText = (text: string): string => {
  // First try - replace clear garbage characters
  let cleaned = text
    .replace(/[\uFFFD\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Second pass - if still bad, get more aggressive with filtering
  if (containsHighPercentageOfUnreadableChars(cleaned)) {
    cleaned = cleaned
      .replace(/[^\x20-\x7E\n\t]/g, ' ')  // Keep only basic ASCII
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  // Extract any readable segments
  const readableSegments = [];
  const sentences = cleaned.split(/[.!?]\s+/);
  
  for (const sentence of sentences) {
    // If the sentence has multiple English words, it's likely readable
    if (sentence.match(/\b[a-zA-Z]{3,}\b/g)?.length >= 3) {
      readableSegments.push(sentence);
    }
  }
  
  // If we found readable segments, use them
  if (readableSegments.length > 0) {
    return readableSegments.join('. ');
  }
  
  // Otherwise return our best-effort cleaned text
  return cleaned;
};
