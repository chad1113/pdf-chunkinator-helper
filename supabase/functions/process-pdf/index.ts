
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @deno-types="https://cdn.jsdelivr.net/npm/pdf-parse@1.1.1/index.d.ts"
import * as pdfParse from "https://cdn.jsdelivr.net/npm/pdf-parse@1.1.1/lib/pdf-parse.js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function estimateTokens(text: string): number {
  // A very rough estimate: 1 token is ~4 chars in English
  return Math.ceil(text.length / 4);
}

function chunkText(text: string, maxTokens: number = 100000): { chunks: string[], tokenCounts: number[] } {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  const tokenCounts: number[] = [];
  
  let currentChunk = "";
  let currentTokenCount = 0;
  
  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);
    
    if (currentTokenCount + paragraphTokens > maxTokens && currentChunk !== "") {
      // Store current chunk and start a new one
      chunks.push(currentChunk);
      tokenCounts.push(currentTokenCount);
      currentChunk = paragraph;
      currentTokenCount = paragraphTokens;
    } else {
      // Add to current chunk
      if (currentChunk !== "") {
        currentChunk += "\n\n";
      }
      currentChunk += paragraph;
      currentTokenCount += paragraphTokens;
    }
  }
  
  // Add the last chunk if it's not empty
  if (currentChunk !== "") {
    chunks.push(currentChunk);
    tokenCounts.push(currentTokenCount);
  }
  
  return { chunks, tokenCounts };
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create storage buckets if they don't exist
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      if (!buckets?.find(b => b.name === 'pdfs')) {
        await supabase.storage.createBucket('pdfs', { public: false });
        console.log('Created pdfs bucket');
      }
      if (!buckets?.find(b => b.name === 'pdf_chunks')) {
        await supabase.storage.createBucket('pdf_chunks', { public: false });
        console.log('Created pdf_chunks bucket');
      }
    } catch (err) {
      console.error('Error creating buckets:', err);
    }
    
    // Get formData from request
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file uploaded' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      return new Response(
        JSON.stringify({ error: 'Uploaded file is not a PDF' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    // Create a unique filename for storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, '');
    const fileExt = file.name.split('.').pop();
    const fileName = `${timestamp}_${crypto.randomUUID()}.${fileExt}`;
    
    // Upload the PDF to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pdfs')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      });
      
    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload PDF', details: uploadError }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
    // Insert PDF record into database
    const { data: pdfRecord, error: dbError } = await supabase
      .from('processed_pdfs')
      .insert({
        filename: fileName,
        original_name: file.name,
        size: file.size
      })
      .select()
      .single();
      
    if (dbError) {
      console.error('Error inserting PDF record:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to save PDF metadata', details: dbError }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
    // Get the PDF file from storage to process it
    const { data: pdfData, error: pdfFetchError } = await supabase.storage
      .from('pdfs')
      .download(fileName);
      
    if (pdfFetchError || !pdfData) {
      console.error('Error fetching PDF for processing:', pdfFetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve PDF for processing', details: pdfFetchError }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
    // Process the PDF to extract text
    try {
      const arrayBuffer = await pdfData.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);
      const pdfContent = await pdfParse(typedArray);
      const text = pdfContent.text;
      
      // Split text into chunks
      const { chunks, tokenCounts } = chunkText(text);
      const processedChunks = [];
      
      // Save each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunkNumber = i + 1;
        const chunkFileName = `${pdfRecord.id}_chunk_${chunkNumber}.txt`;
        
        // Save chunk text to storage
        const { data: chunkUploadData, error: chunkUploadError } = await supabase.storage
          .from('pdf_chunks')
          .upload(chunkFileName, chunks[i], {
            contentType: 'text/plain',
            upsert: false
          });
          
        if (chunkUploadError) {
          console.error(`Error uploading chunk ${chunkNumber}:`, chunkUploadError);
          continue;
        }
        
        // Insert chunk record into database
        const { data: chunkRecord, error: chunkDbError } = await supabase
          .from('pdf_chunks')
          .insert({
            pdf_id: pdfRecord.id,
            chunk_number: chunkNumber,
            filename: chunkFileName,
            tokens: tokenCounts[i],
            content: chunks[i]
          })
          .select()
          .single();
          
        if (chunkDbError) {
          console.error(`Error inserting chunk ${chunkNumber} record:`, chunkDbError);
          continue;
        }
        
        processedChunks.push({
          id: chunkRecord.id,
          chunk_number: chunkNumber,
          tokens: tokenCounts[i],
          content: chunks[i]
        });
      }
      
      // Return information about the processed PDF
      return new Response(
        JSON.stringify({
          success: true,
          pdf_id: pdfRecord.id,
          total_chunks: chunks.length,
          chunks: processedChunks.map(chunk => ({
            id: chunk.id,
            chunk_number: chunk.chunk_number,
            tokens: chunk.tokens
          }))
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
      
    } catch (parseError) {
      console.error('Error parsing PDF:', parseError);
      return new Response(
        JSON.stringify({ error: 'Failed to parse PDF content', details: parseError.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
