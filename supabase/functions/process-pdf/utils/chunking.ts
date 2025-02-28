/**
 * Real PDF text extraction and chunking utility
 */
import { pdf } from "https://cdn.skypack.dev/pdf-parse@1.1.1";

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
    // Convert ArrayBuffer to Uint8Array for pdf-parse
    const data = new Uint8Array(pdfBuffer);
    
    // Parse PDF document
    const pdfData = await pdf(data);
    const fullText = pdfData.text || "";
    
    console.log(`Extracted ${fullText.length} characters from PDF`);
    
    // If no text was extracted, return empty result
    if (!fullText || fullText.trim().length === 0) {
      console.warn("No text content found in PDF");
      return { chunks: [], tokenCounts: [] };
    }
    
    // Split text by paragraphs to maintain semantic meaning
    const paragraphs = fullText
      .split(/\r?\n\r?\n/)      // Split by double line breaks
      .filter(p => p.trim())    // Remove empty paragraphs
      .map(p => p.trim());      // Trim whitespace
    
    // Group paragraphs into chunks within maxChunkSize
    const chunks: string[] = [];
    let currentChunk = "";
    
    for (const paragraph of paragraphs) {
      // If adding this paragraph would exceed maxChunkSize, start a new chunk
      if (currentChunk && (currentChunk.length + paragraph.length > maxChunkSize)) {
        chunks.push(currentChunk);
        currentChunk = paragraph;
      } else {
        // Otherwise, add the paragraph to the current chunk
        currentChunk = currentChunk 
          ? `${currentChunk}\n\n${paragraph}`
          : paragraph;
      }
    }
    
    // Add the last chunk if it's not empty
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    // Calculate estimated token counts (approx 1 token per 4 chars)
    const tokenCounts = chunks.map(chunk => Math.ceil(chunk.length / 4));
    
    console.log(`Created ${chunks.length} chunks from PDF`);
    
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
  const baseText = `This is simulated content from the PDF file: ${pdfName}. `;
  
  // Create chunks with different content based on file size
  const chunksCount = Math.max(1, Math.min(5, Math.floor(fileSize / 50000)));
  const chunks: string[] = [];
  const tokenCounts: number[] = [];
  
  for (let i = 0; i < chunksCount; i++) {
    // Create varied content for each chunk
    let chunkContent = `${baseText} This is chunk number ${i + 1} of the document.\n\n`;
    
    // Add some "lorem ipsum" to pad the content
    chunkContent += "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ";
    chunkContent += "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. ";
    
    // Add some simulated section headers and content
    chunkContent += `\n\n## Section ${i + 1}.1: Introduction\n\n`;
    chunkContent += "This section provides an overview of the main concepts discussed in this document. ";
    chunkContent += "The following paragraphs elaborate on key points and methodologies.\n\n";
    
    chunkContent += `## Section ${i + 1}.2: Analysis\n\n`;
    chunkContent += "Data analysis reveals interesting patterns that support our hypothesis. ";
    chunkContent += "Further investigation is needed to confirm initial findings.\n\n";
    
    // Add some technical terminology based on chunk number
    if (i % 2 === 0) {
      chunkContent += "Technical specifications include implementation details and architecture considerations. ";
      chunkContent += "The system design follows modern practices for scalability and maintainability.\n\n";
    } else {
      chunkContent += "Research methodology follows standard practices in the field. ";
      chunkContent += "Statistical analysis was performed using established techniques.\n\n";
    }
    
    // Add a conclusion
    chunkContent += `## Section ${i + 1}.3: Conclusion\n\n`;
    chunkContent += "In conclusion, the evidence supports our initial hypothesis with some caveats. ";
    chunkContent += "Future work will focus on addressing limitations and expanding the scope of analysis.";
    
    // Add chunk to the array
    chunks.push(chunkContent);
    
    // Estimate tokens (roughly 1 token per 4 characters)
    const tokenCount = Math.ceil(chunkContent.length / 4);
    tokenCounts.push(tokenCount);
  }
  
  return { chunks, tokenCounts };
}
