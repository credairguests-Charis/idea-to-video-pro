import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export function DiagnoseOmnihuman() {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>OmniHuman Disabled</AlertTitle>
      <AlertDescription>
        OmniHuman API has been disabled for security reasons. Please use Sora for video generation.
      </AlertDescription>
    </Alert>
  )
}