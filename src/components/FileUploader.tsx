
import React, { useState } from 'react';
import { FilePdf } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        onFileSelect(file);
      }
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        onFileSelect(file);
      }
    }
  };

  return (
    <div
      className={cn(
        "upload-area w-full border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-all",
        isDragging ? "border-primary bg-secondary/70" : "border-border bg-background",
        "animate-fade-in"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        id="file-upload"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <div className="file-icon mb-4 text-muted-foreground">
        <FilePdf size={48} strokeWidth={1.5} className={cn("transition-transform duration-300", isDragging && "scale-110")} />
      </div>
      <h3 className="text-lg font-medium mb-2">Drag & drop your PDF here</h3>
      <p className="text-sm text-muted-foreground mb-4">or click to select</p>
      <button
        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        Select PDF File
      </button>
    </div>
  );
};

export default FileUploader;
