
import React, { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import PdfProcessor from '@/components/PdfProcessor';
import ChunkList, { Chunk } from '@/components/ChunkList';
import { splitPdfIntoChunks } from '@/utils/pdfUtils';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/toaster';

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setChunks([]);
    setShowResults(false);
    toast.success("File selected", {
      description: `${file.name} has been selected.`,
      duration: 3000,
    });
  };

  const handleProcess = async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    setShowResults(false);
    
    try {
      // Process the file using our utility function
      const resultChunks = await splitPdfIntoChunks(selectedFile);
      
      setChunks(resultChunks);
      setShowResults(true);
      
      toast.success("Processing complete", {
        description: `Split into ${resultChunks.length} chunks successfully.`,
        duration: 5000,
      });
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Processing failed", {
        description: "There was an error processing your file.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Determine if the selected file is a PDF or DOCX
  const fileType = selectedFile?.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOCX';

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
      <Toaster />
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Document Chunker</h1>
          <p className="text-lg text-muted-foreground">
            Upload a document (PDF or DOCX) and split it into chunks of maximum 100k tokens.
          </p>
        </div>
        
        <div className="space-y-8">
          {!selectedFile ? (
            <FileUploader onFileSelect={handleFileSelect} />
          ) : (
            <div className="space-y-8 animate-fade-in">
              <PdfProcessor 
                file={selectedFile} 
                isProcessing={isProcessing} 
                onProcess={handleProcess} 
              />
              
              <ChunkList 
                chunks={chunks} 
                isVisible={showResults} 
              />
              
              {showResults && (
                <div className="animate-fade-in text-center">
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setChunks([]);
                      setShowResults(false);
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground underline"
                  >
                    Process another document
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        <footer className="mt-16 text-center text-sm text-muted-foreground">
          <p>Document Chunker Tool &copy; {new Date().getFullYear()}</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
