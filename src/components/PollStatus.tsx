import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export function PollStatus() {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>OmniHuman Polling Disabled</AlertTitle>
      <AlertDescription>
        OmniHuman API has been disabled for security reasons. Sora video generation status updates automatically.
      </AlertDescription>
    </Alert>
  )
}