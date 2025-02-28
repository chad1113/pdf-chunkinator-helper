
import React, { useState } from 'react';
import { Download, File, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface Chunk {
  id: number;
  filename: string;
  tokens: number;
  content: string;
}

interface ChunkListProps {
  chunks: Chunk[];
  isVisible: boolean;
}

const ChunkList: React.FC<ChunkListProps> = ({ chunks, isVisible }) => {
  const [expandedChunk, setExpandedChunk] = useState<number | null>(null);

  if (!isVisible || chunks.length === 0) return null;

  const handleDownload = (chunk: Chunk) => {
    try {
      const blob = new Blob([chunk.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = chunk.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Chunk downloaded successfully');
    } catch (error) {
      console.error('Error downloading chunk:', error);
      toast.error('Failed to download chunk');
    }
  };

  const toggleExpandChunk = (chunkId: number) => {
    setExpandedChunk(expandedChunk === chunkId ? null : chunkId);
  };

  // Check if any chunks contain warnings about encoding issues
  const hasEncodingIssues = chunks.some(chunk => 
    chunk.content.includes('[Note: This chunk may contain encoding issues'));

  return (
    <div className={cn("w-full", isVisible ? "animate-slide-up" : "hidden")}>
      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <h3 className="text-xl font-medium mb-4">Output Chunks</h3>
        
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 success-alert">
          <p className="text-sm">
            PDF successfully processed! Split into {chunks.length} chunks.
          </p>
        </div>
        
        {hasEncodingIssues && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700">
            <p className="text-sm font-medium mb-1">⚠️ Potential Text Extraction Issues</p>
            <p className="text-xs">
              Some chunks may contain unreadable text. This typically happens with:
              <ul className="list-disc ml-4 mt-1">
                <li>Scanned PDFs (images rather than text)</li>
                <li>PDFs with custom fonts or encoding</li>
                <li>Password-protected or encrypted PDFs</li>
                <li>PDFs containing primarily images or graphics</li>
              </ul>
              For best results, use searchable PDFs with embedded text.
            </p>
          </div>
        )}
        
        <p className="text-sm text-muted-foreground mb-6">
          The PDF has been split into the following chunks (max 100k tokens each):
        </p>
        
        <div className="space-y-3">
          {chunks.map((chunk) => (
            <div
              key={chunk.id}
              className="chunk-item flex flex-col p-4 border rounded-md bg-background"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/5 p-2 rounded-md">
                    <File size={18} className="text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">{`Chunk ${chunk.id}`}</h4>
                    <p className="text-xs text-muted-foreground">{`${chunk.tokens.toLocaleString()} tokens`}</p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => toggleExpandChunk(chunk.id as number)}
                    className="preview-button bg-secondary/50 hover:bg-secondary/80 text-secondary-foreground p-2 rounded-md flex items-center space-x-2"
                  >
                    <Eye size={16} />
                    <span className="text-sm">{expandedChunk === chunk.id ? 'Hide' : 'Preview'}</span>
                  </button>
                  
                  <button
                    onClick={() => handleDownload(chunk)}
                    className="download-button bg-secondary hover:bg-secondary/80 text-secondary-foreground p-2 rounded-md flex items-center space-x-2"
                  >
                    <Download size={16} />
                    <span className="text-sm">Download</span>
                  </button>
                </div>
              </div>
              
              {expandedChunk === chunk.id && (
                <div className="mt-3 p-3 bg-muted/50 rounded-md overflow-auto max-h-40 text-sm font-mono">
                  {chunk.content.split('\n').map((line, index) => (
                    <div key={index} className="whitespace-pre-wrap">{line || <br />}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChunkList;
