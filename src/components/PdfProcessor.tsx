
import React from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PdfProcessorProps {
  file: File | null;
  isProcessing: boolean;
  onProcess: () => void;
}

const PdfProcessor: React.FC<PdfProcessorProps> = ({ file, isProcessing, onProcess }) => {
  if (!file) return null;

  const formatFileSize = (sizeInBytes: number): string => {
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`;
    } else if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(2)} KB`;
    } else {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
    }
  };

  return (
    <div className="w-full animate-slide-up">
      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-medium mb-4">Selected File</h3>
        
        <div className="mb-6">
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">File name:</span>
              <span className="text-sm text-muted-foreground font-mono truncate max-w-[250px]">
                {file.name}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">File size:</span>
              <span className="text-sm text-muted-foreground font-mono">
                {formatFileSize(file.size)}
              </span>
            </div>
          </div>
        </div>
        
        <button
          onClick={onProcess}
          disabled={isProcessing}
          className={cn(
            "button-primary w-full py-3 rounded-md flex items-center justify-center space-x-2 font-medium",
            "transition-all duration-300 transform hover:shadow-md",
            isProcessing 
              ? "bg-muted text-muted-foreground cursor-not-allowed" 
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          <Play size={18} className={isProcessing ? "animate-pulse-subtle" : ""} />
          <span>{isProcessing ? "Processing..." : "Run Script"}</span>
        </button>
      </div>
    </div>
  );
};

export default PdfProcessor;
