
// This is a simulated PDF processing function for the frontend
// In a real application, this would call a backend API to process the PDF

import { Chunk } from '@/components/ChunkList';

// Simulates splitting a PDF file into chunks based on token count
export const splitPdfIntoChunks = async (file: File): Promise<Chunk[]> => {
  // This is a mock function that simulates processing time
  // and returns fake chunk data
  
  return new Promise((resolve) => {
    // Simulate processing time
    setTimeout(() => {
      // Generate random number of chunks between 3 and 8
      const numChunks = Math.floor(Math.random() * 6) + 3;
      
      const chunks: Chunk[] = Array.from({ length: numChunks }).map((_, index) => {
        // Generate random token count between 70k and 98k
        const tokens = Math.floor(Math.random() * 28000) + 70000;
        
        return {
          id: index + 1,
          filename: `chunk_${index + 1}_${file.name}`,
          tokens,
          content: `This is simulated content for chunk ${index + 1} from ${file.name}. In a real application, this would contain actual text extracted from the PDF.`,
        };
      });
      
      resolve(chunks);
    }, 2000); // Simulate 2 second processing time
  });
};

// In a real app, you would use a PDF.js library to extract text
// and implement a proper chunking algorithm based on token count
