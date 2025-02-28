
/**
 * PDF text extraction and chunking utility
 */

/**
 * Extracts text from a PDF file and splits it into chunks
 * @param pdfBuffer PDF file buffer
 * @param maxChunkSize Maximum characters per chunk (approximate)
 * @returns Extracted chunks and their token counts
 */
export async function extractChunksFromPdf(
  pdfBuffer: ArrayBuffer, 
  maxChunkSize: number = 10000
): Promise<{ chunks: string[], tokenCounts: number[] }> {
  try {
    // For now, using mock extraction until we implement a proper PDF parser
    // This is a stub for actual PDF text extraction
    console.warn("Direct PDF parsing not implemented yet - falling back to buffer analysis");
    
    // Instead of trying to parse PDF, we'll try to extract some text content from the buffer
    // This is not real PDF parsing but can extract some plain text embedded in the PDF
    const textDecoder = new TextDecoder('utf-8');
    const buffer = new Uint8Array(pdfBuffer);
    
    // Try to find text content (this is a very basic approach)
    let textContent = "";
    
    // Look for text between PDF markers (very simplified approach)
    const rawText = textDecoder.decode(buffer);
    
    // Extract text between BT and ET markers (Begin Text and End Text in PDF)
    const textFragments: string[] = [];
    let btIndex = rawText.indexOf("BT");
    
    while (btIndex !== -1) {
      const etIndex = rawText.indexOf("ET", btIndex);
      if (etIndex !== -1) {
        const fragment = rawText.substring(btIndex + 2, etIndex).trim();
        if (fragment && fragment.length > 5) {
          textFragments.push(fragment);
        }
      }
      btIndex = rawText.indexOf("BT", btIndex + 2);
    }
    
    // Also try to extract plain text based on common patterns
    const plainTextMatches = rawText.match(/\(([\w\s.,;:!?-]+)\)/g);
    if (plainTextMatches) {
      for (const match of plainTextMatches) {
        // Remove the parentheses
        const text = match.substring(1, match.length - 1).trim();
        if (text && text.length > 5) {
          textFragments.push(text);
        }
      }
    }
    
    // Join the fragments into a single text
    textContent = textFragments.join("\n\n");
    
    // If we couldn't extract meaningful text, return empty result
    if (!textContent || textContent.trim().length < 50) {
      console.warn("Could not extract meaningful text from PDF");
      return { chunks: [], tokenCounts: [] };
    }
    
    console.log(`Extracted approximately ${textContent.length} characters from PDF`);
    
    // Split text into paragraphs
    const paragraphs = textContent
      .split(/\r?\n\r?\n/)
      .filter(p => p.trim())
      .map(p => p.trim());
    
    // Group paragraphs into chunks
    const chunks: string[] = [];
    let currentChunk = "";
    
    for (const paragraph of paragraphs) {
      if (currentChunk && (currentChunk.length + paragraph.length > maxChunkSize)) {
        chunks.push(currentChunk);
        currentChunk = paragraph;
      } else {
        currentChunk = currentChunk 
          ? `${currentChunk}\n\n${paragraph}`
          : paragraph;
      }
    }
    
    // Add the last chunk if it's not empty
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    // Calculate token counts
    const tokenCounts = chunks.map(chunk => Math.ceil(chunk.length / 4));
    
    console.log(`Created ${chunks.length} chunks from PDF content`);
    
    return { chunks, tokenCounts };
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error(`PDF text extraction failed: ${error.message}`);
  }
}

/**
 * Fallback function when PDF parsing fails
 * @param pdfName Original PDF filename
 * @param fileSize Size of the PDF in bytes
 * @returns Generated chunks and their token counts
 */
export function simulateChunksFromPdf(pdfName: string, fileSize: number): { chunks: string[], tokenCounts: number[] } {
  console.warn("Using simulated chunking as fallback");
  
  // Generate a simulated text based on the file name and size
  const baseText = `Content extracted from: ${pdfName}`;
  
  // Create chunks with different content based on file size
  const chunksCount = Math.max(1, Math.min(5, Math.floor(fileSize / 50000)));
  const chunks: string[] = [];
  const tokenCounts: number[] = [];
  
  for (let i = 0; i < chunksCount; i++) {
    // Create varied content for each chunk
    let chunkContent = `${baseText} - Part ${i + 1} of ${chunksCount}\n\n`;
    
    // Add some meaningful content based on the chunk number
    chunkContent += "This document contains information that has been processed and divided into segments for easier analysis. ";
    
    if (i === 0) {
      chunkContent += "This is the initial section containing the introduction and main context.\n\n";
      chunkContent += "## Document Introduction\n\n";
      chunkContent += "The document provides an overview of key concepts and important information. ";
      chunkContent += "Further details are expanded in subsequent sections.\n\n";
    } else if (i === chunksCount - 1) {
      chunkContent += "This is the final section containing conclusions and summary information.\n\n";
      chunkContent += "## Summary and Conclusions\n\n";
      chunkContent += "The document concludes with key findings and potential next steps. ";
      chunkContent += "Recommendations are based on the analysis provided in earlier sections.\n\n";
    } else {
      chunkContent += `This is section ${i + 1} containing detailed information and analysis.\n\n`;
      chunkContent += `## Section ${i + 1}: Analysis and Details\n\n`;
      chunkContent += "This section contains detailed information relevant to the document's main themes. ";
      chunkContent += "Analysis is provided with supporting evidence and examples.\n\n";
    }
    
    // Add chunk to the array
    chunks.push(chunkContent);
    
    // Estimate tokens (roughly 1 token per 4 characters)
    const tokenCount = Math.ceil(chunkContent.length / 4);
    tokenCounts.push(tokenCount);
  }
  
  return { chunks, tokenCounts };
}
