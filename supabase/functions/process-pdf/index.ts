
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./utils/corsHeaders.ts";
import { ensureStorageBuckets, uploadPdfFile } from "./utils/storage.ts";
import { createPdfRecord } from "./utils/database.ts";
import { processPdfIntoChunks } from "./utils/processor.ts";

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
    
    // Ensure storage buckets exist
    await ensureStorageBuckets(supabase);
    
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
    await uploadPdfFile(supabase, file, fileName);
    
    // Insert PDF record into database
    const pdfRecord = await createPdfRecord(supabase, fileName, file.name, file.size);
    
    // Process PDF into chunks
    const processedChunks = await processPdfIntoChunks(supabase, file, pdfRecord);
    
    // Return information about the processed PDF
    return new Response(
      JSON.stringify({
        success: true,
        pdf_id: pdfRecord.id,
        total_chunks: processedChunks.length,
        chunks: processedChunks
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
      
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
