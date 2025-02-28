/**
 * PDF text extraction and chunking utility
 */

/**
 * Sanitizes text by removing problematic characters and escape sequences
 * @param text Text to sanitize
 * @returns Sanitized text
 */
function sanitizeText(text: string): string {
  if (!text) return '';
  
  // Replace problematic Unicode escape sequences
  let sanitized = text
    // Remove control characters except for newlines and tabs
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    // Replace null bytes
    .replace(/\u0000/g, '')
    // Replace non-printable characters
    .replace(/[^\x20-\x7E\n\t]/g, ' ');
  
  // Normalize whitespace but preserve paragraph structure
  sanitized = sanitized
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return sanitized;
}

/**
 * More aggressively cleans text that appears to be corrupted
 */
function deepCleanText(text: string): string {
  // Remove all non-ASCII characters if the text looks corrupted
  if (text.match(/[\uFFFD\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g)) {
    return text
      .replace(/[^\x20-\x7E\n\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return text;
}

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
    console.log("Extracting text from PDF buffer");
    
    // Extract text using multiple methods for better results
    let extractedText = '';
    
    // Method 1: Basic text extraction
    extractedText = await extractTextUsingBasicMethod(pdfBuffer);
    
    // Method 2: If basic extraction didn't yield good results, try pattern-based extraction
    if (!isReadableText(extractedText)) {
      console.log("Basic extraction yielded poor results, trying pattern-based extraction");
      extractedText = await extractTextUsingPatternMethod(pdfBuffer);
    }
    
    // Clean the extracted text
    const cleanedText = sanitizeText(extractedText);
    console.log(`Extracted approximately ${cleanedText.length} characters from PDF`);
    
    // If we couldn't extract meaningful text, return empty result
    if (!isReadableText(cleanedText)) {
      console.warn("Could not extract readable text from PDF, trying fallback method");
      return extractTextUsingFallbackMethod(pdfBuffer, maxChunkSize);
    }
    
    // For large documents, use smaller chunk size to ensure multiple chunks
    const adjustedMaxChunkSize = cleanedText.length > 100000 
      ? Math.min(maxChunkSize, Math.floor(cleanedText.length / 5)) 
      : maxChunkSize;
    
    console.log(`Using adjusted chunk size: ${adjustedMaxChunkSize} characters`);
    
    // Split text into paragraphs
    const paragraphs = cleanedText
      .split(/\n\s*\n/)
      .filter(p => p.trim().length > 0)
      .map(p => p.trim());
    
    console.log(`Split into ${paragraphs.length} paragraphs`);
    
    // Group paragraphs into chunks
    const chunks: string[] = [];
    let currentChunk = "";
    
    for (const paragraph of paragraphs) {
      // If adding this paragraph would exceed the chunk size, start a new chunk
      if (currentChunk && (currentChunk.length + paragraph.length > adjustedMaxChunkSize)) {
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
    
    // If we still only have one chunk for a large document, force split it
    if (chunks.length === 1 && cleanedText.length > 50000) {
      console.log("Document produced only one chunk but is large, forcing split");
      return forceSplitIntoChunks(chunks[0], adjustedMaxChunkSize);
    }
    
    // Calculate token counts (approximate)
    const tokenCounts = chunks.map(chunk => Math.ceil(chunk.length / 4));
    
    console.log(`Created ${chunks.length} chunks from PDF content`);
    
    return { chunks, tokenCounts };
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error(`PDF text extraction failed: ${error.message}`);
  }
}

/**
 * Extract text using basic buffer decoding
 */
async function extractTextUsingBasicMethod(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    const textDecoder = new TextDecoder('utf-8');
    const buffer = new Uint8Array(pdfBuffer);
    let text = textDecoder.decode(buffer);
    
    // Clean up the text
    return sanitizeText(text);
  } catch (error) {
    console.error("Error in basic text extraction:", error);
    return "";
  }
}

/**
 * Extract text using pattern matching
 */
async function extractTextUsingPatternMethod(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    const textDecoder = new TextDecoder('utf-8');
    const buffer = new Uint8Array(pdfBuffer);
    const rawText = textDecoder.decode(buffer);
    
    // Extract text objects from PDF content
    const textFragments: string[] = [];
    
    // Look for text between parentheses in PDF content (often contains actual text)
    const textPattern = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
    let match;
    
    while ((match = textPattern.exec(rawText)) !== null) {
      if (match[1] && match[1].length > 2) {
        // Clean up PDF encoding
        const cleaned = match[1]
          .replace(/\\(\d{3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)))
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\\\/g, '\\');
        
        if (cleaned.length > 2 && /[a-zA-Z]{2,}/.test(cleaned)) {
          textFragments.push(cleaned);
        }
      }
    }
    
    // Look for strings after /Tj or similar operators
    const tjPattern = /\/(Tj|TJ|Tx|T\*)\s*(\(([^)]+)\)|\[([^\]]+)\])/g;
    while ((match = tjPattern.exec(rawText)) !== null) {
      if (match[2]) {
        const content = match[2]
          .replace(/^\(|\)$/g, '')
          .replace(/^\[|\]$/g, '');
        
        if (content && content.length > 2 && /[a-zA-Z]{2,}/.test(content)) {
          textFragments.push(content);
        }
      }
    }
    
    // Join extracted fragments
    return textFragments.join(' ');
  } catch (error) {
    console.error("Error in pattern-based text extraction:", error);
    return "";
  }
}

/**
 * Fallback method for extracting text
 */
function extractTextUsingFallbackMethod(
  pdfBuffer: ArrayBuffer,
  maxChunkSize: number
): { chunks: string[], tokenCounts: number[] } {
  console.log("Using fallback method for text extraction");
  
  try {
    const textDecoder = new TextDecoder('utf-8');
    const buffer = new Uint8Array(pdfBuffer);
    
    // Instead of trying to parse the whole file, look at sections
    const chunks: string[] = [];
    const chunkCount = Math.max(3, Math.ceil(buffer.length / 500000));
    
    for (let i = 0; i < chunkCount; i++) {
      const start = Math.floor((i * buffer.length) / chunkCount);
      const end = Math.floor(((i + 1) * buffer.length) / chunkCount);
      
      const sectionBuffer = buffer.slice(start, end);
      let sectionText = textDecoder.decode(sectionBuffer);
      
      // Extract any text-like content from this section
      const textLikeContent = extractTextLikeContent(sectionText);
      
      if (textLikeContent && textLikeContent.length > 50) {
        chunks.push(sanitizeText(textLikeContent));
      }
    }
    
    // If we found reasonable text chunks, use them
    if (chunks.length > 0 && chunks.some(chunk => isReadableText(chunk))) {
      console.log(`Found ${chunks.length} text chunks using fallback method`);
      const tokenCounts = chunks.map(chunk => Math.ceil(chunk.length / 4));
      return { chunks, tokenCounts };
    }
    
    // If all else fails, generate placeholder chunks
    console.warn("Could not extract readable text, generating placeholder chunks");
    return generatePlaceholderChunks(buffer.length);
  } catch (error) {
    console.error("Error in fallback text extraction:", error);
    return generatePlaceholderChunks(pdfBuffer.byteLength);
  }
}

/**
 * Extract content that looks like text (sentences, words, etc.)
 */
function extractTextLikeContent(text: string): string {
  // Look for sequences that appear to be sentences or paragraphs
  const sentencePattern = /[A-Z][a-zA-Z\s,.;:'"\-\(\)]{10,}[.!?]/g;
  const matches = text.match(sentencePattern) || [];
  
  // Return joined sentences if found
  if (matches.length > 0) {
    return matches.join(' ');
  }
  
  // Otherwise look for any sequence with multiple words
  const wordPattern = /[a-zA-Z]{3,}(?:\s+[a-zA-Z]{2,}){2,}/g;
  const wordMatches = text.match(wordPattern) || [];
  
  return wordMatches.join(' ');
}

/**
 * Generate placeholder chunks when text extraction fails
 */
function generatePlaceholderChunks(fileSize: number): { chunks: string[], tokenCounts: number[] } {
  // Estimate the number of pages and chunks
  const estimatedPages = Math.max(1, Math.ceil(fileSize / 50000));
  const chunkCount = Math.max(3, Math.ceil(estimatedPages / 20));
  
  const chunks: string[] = [];
  const tokenCounts: number[] = [];
  
  for (let i = 0; i < chunkCount; i++) {
    const pageStart = Math.floor((i * estimatedPages) / chunkCount) + 1;
    const pageEnd = Math.floor(((i + 1) * estimatedPages) / chunkCount);
    
    const chunk = `PDF content chunk ${i + 1} (estimated pages ${pageStart}-${pageEnd})

This PDF appears to contain content that could not be properly extracted as text. This may be because:
- The PDF contains images or scanned text rather than digital text
- The text uses custom fonts or encoding
- The PDF has security settings that prevent text extraction
- The content is stored in a non-standard format

For best results, try using a searchable PDF format or convert your document to a text-based PDF.`;
    
    chunks.push(chunk);
    tokenCounts.push(Math.ceil(chunk.length / 4));
  }
  
  return { chunks, tokenCounts };
}

/**
 * Forcibly splits a single large chunk into multiple smaller chunks
 */
function forceSplitIntoChunks(text: string, maxChunkSize: number): { chunks: string[], tokenCounts: number[] } {
  console.log("Forcibly splitting large text into multiple chunks");
  
  // First try to split by paragraphs
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  
  // If we have enough paragraphs, use them for splitting
  if (paragraphs.length >= 3) {
    const chunks: string[] = [];
    let currentChunk = "";
    const targetChunkSize = maxChunkSize / 2; // Use smaller chunks when forcing split
    
    for (const paragraph of paragraphs) {
      if (currentChunk && (currentChunk.length + paragraph.length > targetChunkSize)) {
        chunks.push(currentChunk);
        currentChunk = paragraph;
      } else {
        currentChunk = currentChunk 
          ? `${currentChunk}\n\n${paragraph}`
          : paragraph;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    if (chunks.length >= 2) {
      const tokenCounts = chunks.map(chunk => Math.ceil(chunk.length / 4));
      return { chunks, tokenCounts };
    }
  }
  
  // If paragraphs didn't work, split by sentences
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  if (sentences.length >= 5) {
    const chunks: string[] = [];
    let currentChunk = "";
    const targetChunkSize = maxChunkSize / 3;
    
    for (const sentence of sentences) {
      if (currentChunk && (currentChunk.length + sentence.length > targetChunkSize)) {
        chunks.push(currentChunk);
        currentChunk = sentence;
      } else {
        currentChunk = currentChunk 
          ? `${currentChunk} ${sentence}`
          : sentence;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    if (chunks.length >= 2) {
      const tokenCounts = chunks.map(chunk => Math.ceil(chunk.length / 4));
      return { chunks, tokenCounts };
    }
  }
  
  // As a last resort, split by character count
  const chunks: string[] = [];
  const chunkCount = Math.max(3, Math.ceil(text.length / (maxChunkSize / 2)));
  const chunkSize = Math.ceil(text.length / chunkCount);
  
  for (let i = 0; i < text.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, text.length);
    // Try to break at a space if possible
    let breakPoint = end;
    if (end < text.length) {
      const nextSpace = text.indexOf(' ', end - 20);
      if (nextSpace > 0 && nextSpace < end + 20) {
        breakPoint = nextSpace;
      }
    }
    const chunk = text.substring(i, breakPoint);
    chunks.push(chunk);
  }
  
  const tokenCounts = chunks.map(chunk => Math.ceil(chunk.length / 4));
  return { chunks, tokenCounts };
}

/**
 * Check if text is reasonably readable
 * This helps identify if we've extracted actual text or just garbage
 */
function isReadableText(text: string): boolean {
  if (!text || text.length < 50) return false;
  
  // Check for a reasonable amount of alphabetic characters
  const alphaRatio = (text.match(/[a-zA-Z]/g) || []).length / text.length;
  if (alphaRatio < 0.3) return false;
  
  // Check for a reasonable number of spaces (words)
  const spaceRatio = (text.match(/\s/g) || []).length / text.length;
  if (spaceRatio < 0.05 || spaceRatio > 0.5) return false;
  
  // Check for presence of common words (linguistic validation)
  const commonWords = /\b(the|and|to|of|in|a|for|is|that|this|with|by|as|on|are|be|or|an|it|was|from)\b/i;
  if (!commonWords.test(text)) return false;
  
  return true;
}

/**
 * Fallback function when PDF parsing fails
 */
export function simulateChunksFromPdf(pdfName: string, fileSize: number): { chunks: string[], tokenCounts: number[] } {
  console.warn("Using simulated chunking as fallback");
  
  // Estimate page count and chunk count
  const estimatedPageCount = Math.ceil(fileSize / 50000);
  const chunksCount = Math.max(3, Math.ceil(estimatedPageCount / 30));
  
  return generatePlaceholderChunks(fileSize);
}
