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
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Find files older than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    
    const { data: expiredFiles, error: selectError } = await supabaseClient
      .from('mp3_uploads')
      .select('*')
      .lt('created_at', thirtyMinutesAgo)

    if (selectError) {
      throw selectError
    }

    if (!expiredFiles || expiredFiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No expired files found', count: 0 }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    let deletedCount = 0
    let errors = []

    // Delete each expired file
    for (const file of expiredFiles) {
      try {
        // Delete from storage
        const { error: storageError } = await supabaseClient.storage
          .from('mp3-files')
          .remove([file.file_path])

        if (storageError) {
          console.error(`Failed to delete file from storage: ${file.file_path}`, storageError)
          errors.push(`Storage deletion failed for ${file.code}: ${storageError.message}`)
        }

        // Delete from database
        const { error: dbError } = await supabaseClient
          .from('mp3_uploads')
          .delete()
          .eq('id', file.id)

        if (dbError) {
          console.error(`Failed to delete file from database: ${file.id}`, dbError)
          errors.push(`Database deletion failed for ${file.code}: ${dbError.message}`)
        } else {
          deletedCount++
          console.log(`Successfully deleted expired file: ${file.code}`)
        }
      } catch (error) {
        console.error(`Error processing file ${file.code}:`, error)
        errors.push(`Processing error for ${file.code}: ${error.message}`)
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Cleanup completed`,
        deletedCount,
        totalExpired: expiredFiles.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Cleanup function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})