import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Stethoscope, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface DiagnosticResult {
  timestamp: string
  apiKey: string
  sampleImageAccessible: boolean
  sampleAudioAccessible: boolean
  kieApiStatus: number
  kieApiStatusText: string
  kieApiResponse: any
  success: boolean
}

export function DiagnoseOmnihuman() {
  const [diagnosing, setDiagnosing] = useState(false)
  const [result, setResult] = useState<DiagnosticResult | null>(null)

  const runDiagnostic = async () => {
    setDiagnosing(true)
    setResult(null)
    
    try {
      const { data, error } = await supabase.functions.invoke('diagnose-omnihuman', {
        body: {}
      })

      if (error) {
        throw error
      }

      setResult(data)
      
      if (data.success) {
        toast.success('Diagnostic completed: API is working correctly')
      } else {
        toast.error('Diagnostic found issues with the API')
      }
    } catch (error) {
      console.error('Diagnostic error:', error)
      toast.error('Failed to run diagnostic: ' + (error.message || 'Unknown error'))
    } finally {
      setDiagnosing(false)
    }
  }

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    )
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Stethoscope className="h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-semibold">OmniHuman API Diagnostic</h3>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Test the OmniHuman API connectivity and configuration using sample data from the API documentation.
      </p>
      
      <Button 
        onClick={runDiagnostic} 
        disabled={diagnosing}
        className="w-full mb-4"
        variant="outline"
      >
        {diagnosing ? (
          <>
            <Stethoscope className="h-4 w-4 mr-2 animate-pulse" />
            Running Diagnostic...
          </>
        ) : (
          <>
            <Stethoscope className="h-4 w-4 mr-2" />
            Run Diagnostic Test
          </>
        )}
      </Button>

      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Status</span>
            <Badge variant={result.success ? "default" : "destructive"}>
              {result.success ? "PASS" : "FAIL"}
            </Badge>
          </div>
          
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span>API Key</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(result.apiKey === 'Present')}
                <span className="text-xs">{result.apiKey}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Sample Image Access</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(result.sampleImageAccessible)}
                <span className="text-xs">{result.sampleImageAccessible ? 'OK' : 'Failed'}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Sample Audio Access</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(result.sampleAudioAccessible)}
                <span className="text-xs">{result.sampleAudioAccessible ? 'OK' : 'Failed'}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span>KIE API Response</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(result.kieApiStatus === 200)}
                <span className="text-xs">{result.kieApiStatus} {result.kieApiStatusText}</span>
              </div>
            </div>
          </div>
          
          {result.kieApiResponse && (
            <div className="mt-4">
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground mb-2">
                  View API Response
                </summary>
                <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(result.kieApiResponse, null, 2)}
                </pre>
              </details>
            </div>
          )}
          
          {!result.success && (
            <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-orange-800">Troubleshooting Tips:</p>
                <ul className="text-orange-700 mt-1 space-y-1 text-xs">
                  {result.apiKey !== 'Present' && (
                    <li>• Check that KIE_API_KEY is set in Supabase secrets</li>
                  )}
                  {!result.sampleImageAccessible && (
                    <li>• Sample image URL is not accessible - check network connectivity</li>
                  )}
                  {!result.sampleAudioAccessible && (
                    <li>• Sample audio URL is not accessible - check network connectivity</li>
                  )}
                  {result.kieApiStatus !== 200 && (
                    <li>• KIE API returned error {result.kieApiStatus} - check API key validity</li>
                  )}
                </ul>
              </div>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            Test completed at {new Date(result.timestamp).toLocaleString()}
          </p>
        </div>
      )}
    </Card>
  )
}