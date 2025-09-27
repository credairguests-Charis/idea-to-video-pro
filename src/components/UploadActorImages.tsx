import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export function UploadActorImages() {
  const [uploading, setUploading] = useState(false)

  const uploadActorImages = async () => {
    setUploading(true)
    
    try {
      const actorImages = [
        { filename: 'actor-female-1.jpg', actorName: 'Emma Rodriguez' },
        { filename: 'actor-male-1.jpg', actorName: 'James Chen' },
        { filename: 'actor-female-2.jpg', actorName: 'Zara Williams' },
        { filename: 'actor-male-2.jpg', actorName: 'Michael Thompson' },
        { filename: 'actor-female-3.jpg', actorName: 'Lily Zhang' },
        { filename: 'actor-male-3.jpg', actorName: 'Carlos Martinez' }
      ]

      for (const actorImage of actorImages) {
        console.log(`Uploading ${actorImage.filename}...`)
        
        try {
          // Fetch the image from the public folder
          const response = await fetch(`/actors/${actorImage.filename}`)
          if (!response.ok) {
            console.error(`Failed to fetch ${actorImage.filename}`)
            continue
          }

          const blob = await response.blob()
          
          // Upload to Supabase storage
          const { error: uploadError } = await supabase.storage
            .from('actor-images')
            .upload(actorImage.filename, blob, {
              contentType: 'image/jpeg',
              upsert: true
            })

          if (uploadError) {
            console.error(`Error uploading ${actorImage.filename}:`, uploadError)
            continue
          }

          console.log(`Successfully uploaded ${actorImage.filename}`)
        } catch (error) {
          console.error(`Error processing ${actorImage.filename}:`, error)
        }
      }

      toast.success('UGC-style actor images uploaded successfully!')
      
    } catch (error) {
      console.error('Error uploading actor images:', error)
      toast.error('Failed to upload actor images')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-muted/50">
      <h3 className="text-lg font-semibold mb-2">Upload UGC Actor Images</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Upload the generated UGC-style actor images to Supabase storage so they can be used in the Actor Selection modal.
      </p>
      <Button 
        onClick={uploadActorImages} 
        disabled={uploading}
        className="w-full"
      >
        {uploading ? 'Uploading...' : 'Upload Actor Images to Storage'}
      </Button>
    </div>
  )
}