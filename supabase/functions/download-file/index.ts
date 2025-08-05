import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get code from URL path
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const code = pathParts[pathParts.length - 1]

    if (!code) {
      return new Response('File not found', { status: 404 })
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if file exists and is not expired (30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    
    const { data: fileData, error: dbError } = await supabaseClient
      .from('mp3_uploads')
      .select('*')
      .eq('code', code)
      .gte('created_at', thirtyMinutesAgo)
      .maybeSingle()

    if (dbError || !fileData) {
      return new Response('File not found or expired', { status: 404 })
    }

    // Get file from storage
    const { data: fileBlob, error: storageError } = await supabaseClient.storage
      .from('mp3-files')
      .download(fileData.file_path)

    if (storageError || !fileBlob) {
      return new Response('File not found', { status: 404 })
    }

    // Increment download count
    await supabaseClient.rpc('increment_download_count', { 
      upload_code: code 
    })

    // Return file directly with proper headers
    return new Response(fileBlob, {
      headers: {
        'Content-Type': fileData.mime_type || 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${fileData.original_filename}"`,
        'Content-Length': fileData.file_size.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Download error:', error)
    return new Response('Internal server error', { status: 500 })
  }
})