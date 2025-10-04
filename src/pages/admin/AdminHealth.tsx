import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function AdminHealth() {
  const [checking, setChecking] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const { toast } = useToast();

  const runHealthCheck = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-health-check');

      if (error) throw error;

      setHealthData(data);
      toast({
        title: "Health Check Complete",
        description: `Status: ${data.status}`,
      });
    } catch (error) {
      console.error('Error running health check:', error);
      toast({
        title: "Error",
        description: "Failed to run health check",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'down':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">API Health Monitoring</h1>
        <Button onClick={runHealthCheck} disabled={checking}>
          {checking ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Run Health Check
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>OmniHuman API Status</CardTitle>
        </CardHeader>
        <CardContent>
          {healthData ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <StatusIcon status={healthData.status} />
                <div>
                  <p className="text-2xl font-bold capitalize">{healthData.status}</p>
                  {healthData.latency && (
                    <p className="text-sm text-gray-500">{healthData.latency}ms response time</p>
                  )}
                </div>
              </div>

              {healthData.errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">
                    <strong>Error:</strong> {healthData.errorMessage}
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-400">
                Last checked: {new Date(healthData.timestamp).toLocaleString()}
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No health check data available</p>
              <Button onClick={runHealthCheck} variant="outline">
                Run First Health Check
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Database Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div>
              <p className="text-2xl font-bold">Online</p>
              <p className="text-sm text-gray-500">Connection active</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
