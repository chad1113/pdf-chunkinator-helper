
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./utils/corsHeaders.ts";
import { createPdfRecord } from "./utils/database.ts";
import { processPdfIntoChunks } from "./utils/processor.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing PDF request");
    
    // Check request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
      );
    }
    
    // Get the form data
    const formData = await req.formData();
    const file = formData.get('file');
    
    // Check if file is provided
    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Check if file is a PDF
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return new Response(
        JSON.stringify({ success: false, error: 'File must be a PDF' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Create PDF record in database
    const storageFileName = `${crypto.randomUUID()}.pdf`;
    const pdfRecord = await createPdfRecord(
      supabaseClient,
      storageFileName,
      file.name,
      file.size
    );
    
    // Process PDF into chunks
    const chunks = await processPdfIntoChunks(supabaseClient, file, pdfRecord);
    
    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        pdf_id: pdfRecord.id,
        chunks: chunks
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error processing PDF:", error);
    
    // Return error response
    return new Response(
      JSON.stringify({
        success: false,
        error: `Failed to process PDF: ${error.message}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
