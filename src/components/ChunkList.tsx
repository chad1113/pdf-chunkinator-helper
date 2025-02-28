
import React from 'react';
import { Download, File } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  if (!isVisible || chunks.length === 0) return null;

  const handleDownload = (chunk: Chunk) => {
    const blob = new Blob([chunk.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = chunk.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn("w-full", isVisible ? "animate-slide-up" : "hidden")}>
      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <h3 className="text-xl font-medium mb-4">Output Chunks</h3>
        
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 success-alert">
          <p className="text-sm">
            PDF successfully processed! Split into {chunks.length} chunks.
          </p>
        </div>
        
        <p className="text-sm text-muted-foreground mb-6">
          The PDF has been split into the following chunks (max 100k tokens each):
        </p>
        
        <div className="space-y-3">
          {chunks.map((chunk) => (
            <div
              key={chunk.id}
              className="chunk-item flex justify-between items-center p-4 border rounded-md bg-background"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-primary/5 p-2 rounded-md">
                  <File size={18} className="text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">{`Chunk ${chunk.id}`}</h4>
                  <p className="text-xs text-muted-foreground">{`${chunk.tokens.toLocaleString()} tokens`}</p>
                </div>
              </div>
              
              <button
                onClick={() => handleDownload(chunk)}
                className="download-button bg-secondary hover:bg-secondary/80 text-secondary-foreground p-2 rounded-md flex items-center space-x-2"
              >
                <Download size={16} />
                <span className="text-sm">Download</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChunkList;
