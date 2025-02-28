
import { Chunk } from "@/components/ChunkList";

// This is a mock implementation
// In a real app, this would likely be an API call to a backend service
export const splitPdfIntoChunks = async (file: File): Promise<Chunk[]> => {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // For demo purposes, we'll create some mock chunks based on the file size
  const numChunks = Math.max(1, Math.floor(file.size / 100000));
  const chunks: Chunk[] = [];
  
  for (let i = 1; i <= numChunks; i++) {
    chunks.push({
      id: i,
      filename: `${file.name.replace('.pdf', '')}_chunk_${i}.txt`,
      tokens: Math.floor(50000 + Math.random() * 40000), // Random token count between 50k-90k
      content: `This is the content of chunk ${i} from ${file.name}. In a real implementation, this would contain the actual text extracted from the PDF.`
    });
  }
  
  console.log(`Created ${chunks.length} chunks from ${file.name}`);
  return chunks;
};
