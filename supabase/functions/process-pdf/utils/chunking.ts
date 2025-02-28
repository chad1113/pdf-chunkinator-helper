
/**
 * Simulates text chunking for a PDF file
 * @param pdfName Original PDF filename
 * @param fileSize Size of the PDF in bytes
 * @returns Generated chunks and their token counts
 */
export function simulateChunksFromPdf(pdfName: string, fileSize: number): { chunks: string[], tokenCounts: number[] } {
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
