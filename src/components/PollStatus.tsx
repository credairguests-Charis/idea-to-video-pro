import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export function PollStatus() {
  const [polling, setPolling] = useState(false)

  const triggerStatusPoll = async () => {
    setPolling(true)
    
    try {
      const { data, error } = await supabase.functions.invoke('poll-omnihuman-status', {
        body: {}
      })

      if (error) {
        throw error
      }

      if (data.success) {
        toast.success(`Status polling complete: ${data.message}`)
      } else {
        throw new Error(data.error || 'Polling failed')
      }
    } catch (error) {
      console.error('Status polling error:', error)
      toast.error('Failed to poll status: ' + (error.message || 'Unknown error'))
    } finally {
      setPolling(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-muted/50">
      <h3 className="text-lg font-semibold mb-2">Manual Status Check</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Manually check the status of pending video generations. This will poll the OmniHuman API for any stuck or pending tasks.
      </p>
      <Button 
        onClick={triggerStatusPoll} 
        disabled={polling}
        className="w-full"
        variant="outline"
      >
        {polling ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Polling Status...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            Check Generation Status
          </>
        )}
      </Button>
    </div>
  )
}