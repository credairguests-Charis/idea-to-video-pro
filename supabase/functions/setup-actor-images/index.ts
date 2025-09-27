import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Base64 encoded actor images (these would be the generated UGC-style images)
const actorImageData = {
  'actor-female-1.jpg': '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAASABQDASIAAhEBAxEB/8QAGQAAAgMBAAAAAAAAAAAAAAAAAAMBAgQF/8QAJhAAAgEDAwMEAwEAAAAAAAAAAQIDAAQRBSExQVFhEhNxgaHB8P/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwDm2ekT6rr0en2rKryTGNmcgAZPOSOw9hXoa7pFtpWnQ6faL6IEAwM5JPczseSeSTyaq6Hqk1yd1EEMgCKUJAKjt3HOeeeo/GKKAGa08j7D/wCc7V//2Q==',
  'actor-male-1.jpg': '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAASABQDASIAAhEBAxEB/8QAGQAAAgMBAAAAAAAAAAAAAAAAAAMBAgQF/8QAJhAAAgEDAwMEAwEAAAAAAAAAAQIDAAQRBSExQVFhEhNxgaHB8P/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwDm2ekT6rr0en2rKryTGNmcgAZPOSOw9hXoa7pFtpWnQ6faL6IEAwM5JPczseSeSTyaq6Hqk1yd1EEMgCKUJAKjt3HOeeeo/GKKAGa08j7D/wCc7V//2Q==',
  'actor-female-2.jpg': '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAASABQDASIAAhEBAxEB/8QAGQAAAgMBAAAAAAAAAAAAAAAAAAMBAgQF/8QAJhAAAgEDAwMEAwEAAAAAAAAAAQIDAAQRBSExQVFhEhNxgaHB8P/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwDm2ekT6rr0en2rKryTGNmcgAZPOSOw9hXoa7pFtpWnQ6faL6IEAwM5JPczseSeSTyaq6Hqk1yd1EEMgCKUJAKjt3HOeeeo/GKKAGa08j7D/wCc7V//2Q==',
  'actor-male-2.jpg': '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAASABQDASIAAhEBAxEB/8QAGQAAAgMBAAAAAAAAAAAAAAAAAAMBAgQF/8QAJhAAAgEDAwMEAwEAAAAAAAAAAQIDAAQRBSExQVFhEhNxgaHB8P/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwDm2ekT6rr0en2rKryTGNmcgAZPOSOw9hXoa7pFtpWnQ6faL6IEAwM5JPczseSeSTyaq6Hqk1yd1EEMgCKUJAKjt3HOeeeo/GKKAGa08j7D/wCc7V//2Q==',
  'actor-female-3.jpg': '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAASABQDASIAAhEBAxEB/8QAGQAAAgMBAAAAAAAAAAAAAAAAAAMBAgQF/8QAJhAAAgEDAwMEAwEAAAAAAAAAAQIDAAQRBSExQVFhEhNxgaHB8P/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwDm2ekT6rr0en2rKryTGNmcgAZPOSOw9hXoa7pFtpWnQ6faL6IEAwM5JPczseSeSTyaq6Hqk1yd1EEMgCKUJAKjt3HOeeeo/GKKAGa08j7D/wCc7V//2Q==',
  'actor-male-3.jpg': '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAASABQDASIAAhEBAxEB/8QAGQAAAgMBAAAAAAAAAAAAAAAAAAMBAgQF/8QAJhAAAgEDAwMEAwEAAAAAAAAAAQIDAAQRBSExQVFhEhNxgaHB8P/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwDm2ekT6rr0en2rKryTGNmcgAZPOSOw9hXoa7pFtpWnQ6faL6IEAwM5JPczseSeSTyaq6Hqk1yd1EEMgCKUJAKjt3HOeeeo/GKKAGa08j7D/wCc7V//2Q=='
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

    console.log('Starting actor image setup process...')

    // Upload each actor image to storage
    for (const [filename, base64Data] of Object.entries(actorImageData)) {
      try {
        console.log(`Processing ${filename}`)

        // Convert base64 to buffer
        const imageData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

        // Upload to actor-images bucket
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('actor-images')
          .upload(filename, imageData, {
            contentType: 'image/jpeg',
            upsert: true
          })

        if (uploadError) {
          console.error(`Error uploading ${filename}:`, uploadError)
          continue
        }

        console.log(`Successfully uploaded ${filename}`)

        // Get the public URL
        const { data: { publicUrl } } = supabaseClient.storage
          .from('actor-images')
          .getPublicUrl(filename)

        console.log(`Public URL for ${filename}: ${publicUrl}`)

        // Update actor records based on filename
        let actorName = ''
        switch (filename) {
          case 'actor-female-1.jpg':
            actorName = 'Emma Rodriguez'
            break
          case 'actor-male-1.jpg':
            actorName = 'James Chen'
            break
          case 'actor-female-2.jpg':
            actorName = 'Zara Williams'
            break
          case 'actor-male-2.jpg':
            actorName = 'Michael Thompson'
            break
          case 'actor-female-3.jpg':
            actorName = 'Lily Zhang'
            break
          case 'actor-male-3.jpg':
            actorName = 'Carlos Martinez'
            break
        }

        if (actorName) {
          const { error: updateError } = await supabaseClient
            .from('actors')
            .update({ thumbnail_url: publicUrl })
            .eq('name', actorName)

          if (updateError) {
            console.error(`Error updating actor ${actorName}:`, updateError)
          } else {
            console.log(`Successfully updated ${actorName} with new thumbnail URL`)
          }
        }

      } catch (error) {
        console.error(`Error processing ${filename}:`, error)
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Actor images setup completed successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in setup-actor-images function:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})