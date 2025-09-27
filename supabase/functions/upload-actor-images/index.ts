import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Actor images to upload with their metadata
    const actorImages = [
      {
        filename: 'actor-female-1.jpg',
        actorName: 'Emma Rodriguez',
        gender: 'Female'
      },
      {
        filename: 'actor-male-1.jpg',
        actorName: 'James Chen',
        gender: 'Male'
      },
      {
        filename: 'actor-female-2.jpg',
        actorName: 'Zara Williams',
        gender: 'Female'
      },
      {
        filename: 'actor-male-2.jpg',
        actorName: 'Michael Thompson',
        gender: 'Male'
      },
      {
        filename: 'actor-female-3.jpg',
        actorName: 'Lily Zhang',
        gender: 'Female'
      },
      {
        filename: 'actor-male-3.jpg',
        actorName: 'Carlos Martinez',
        gender: 'Male'
      }
    ]

    console.log('Starting actor image upload process...')

    for (const actorImage of actorImages) {
      try {
        console.log(`Processing ${actorImage.filename} for ${actorImage.actorName}`)

        // Fetch the image from the public folder
        const imageResponse = await fetch(`${Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://').replace('.supabase.co', '.supabase.co')}/storage/v1/object/public/omnihuman-content/actors/${actorImage.filename}`)
        
        if (!imageResponse.ok) {
          // Try alternative path
          const altResponse = await fetch(`https://kopclhksdjbheypwsvxz.supabase.co/storage/v1/object/public/omnihuman-content/actors/${actorImage.filename}`)
          if (!altResponse.ok) {
            console.log(`Could not fetch ${actorImage.filename}, skipping...`)
            continue
          }
        }

        const imageBlob = await (imageResponse.ok ? imageResponse : await fetch(`https://kopclhksdjbheypwsvxz.supabase.co/storage/v1/object/public/omnihuman-content/actors/${actorImage.filename}`)).blob()
        const imageBuffer = await imageBlob.arrayBuffer()

        // Upload to actor-images bucket
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('actor-images')
          .upload(`${actorImage.filename}`, imageBuffer, {
            contentType: 'image/jpeg',
            upsert: true
          })

        if (uploadError) {
          console.error(`Error uploading ${actorImage.filename}:`, uploadError)
          continue
        }

        console.log(`Successfully uploaded ${actorImage.filename}`)

        // Get the public URL
        const { data: { publicUrl } } = supabaseClient.storage
          .from('actor-images')
          .getPublicUrl(actorImage.filename)

        console.log(`Public URL for ${actorImage.filename}: ${publicUrl}`)

        // Update the actor record with the new thumbnail URL
        const { error: updateError } = await supabaseClient
          .from('actors')
          .update({ thumbnail_url: publicUrl })
          .eq('name', actorImage.actorName)

        if (updateError) {
          console.error(`Error updating actor ${actorImage.actorName}:`, updateError)
        } else {
          console.log(`Successfully updated ${actorImage.actorName} with new thumbnail URL`)
        }

      } catch (error) {
        console.error(`Error processing ${actorImage.filename}:`, error)
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Actor images upload process completed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in upload-actor-images function:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})