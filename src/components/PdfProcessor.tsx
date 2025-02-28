
import React from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/utils/fileValidation';

interface PdfProcessorProps {
  file: File | null;
  isProcessing: boolean;
  onProcess: () => void;
}

const PdfProcessor: React.FC<PdfProcessorProps> = ({ file, isProcessing, onProcess }) => {
  if (!file) return null;

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
          <Play size={18} className={isProcessing ? "animate-pulse" : ""} />
          <span>
            {isProcessing 
              ? "Processing PDF (this may take a moment)..." 
              : "Process PDF"
            }
          </span>
        </button>
        
        {isProcessing && (
          <div className="mt-4 text-sm text-muted-foreground">
            <p>The PDF is being processed. This includes:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Uploading the file</li>
              <li>Extracting text content</li>
              <li>Splitting into manageable chunks</li>
              <li>Storing data for retrieval</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfProcessor;
