import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CharisLoader } from "@/components/ui/charis-loader";

export default function AdminHealth() {
  const [checking, setChecking] = useState(false);
  const [healthData, setHealthData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch latest health check data for all services
  const fetchLatestHealthData = async () => {
    try {
      const { data, error } = await supabase
        .from('health_checks' as any)
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(10); // Get recent checks for all services

      if (error) throw error;
      
      if (data) {
        // Group by service_name, keeping only the most recent for each
        const healthMap: Record<string, any> = {};
        data.forEach((check: any) => {
          if (!healthMap[check.service_name]) {
            healthMap[check.service_name] = check;
          }
        });
        setHealthData(healthMap);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching health data:', error);
      setLoading(false);
    }
  };

  const runHealthCheck = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('health-check-cron');

      if (error) throw error;

      toast({
        title: "Health Check Triggered",
        description: "Health check is running. Results will appear shortly.",
      });
      
      // Fetch latest data after a brief delay
      setTimeout(() => {
        fetchLatestHealthData();
      }, 2000);
    } catch (error) {
      console.error('Error running health check:', error);
      toast({
        title: "Error",
        description: "Failed to trigger health check",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  // Set up real-time subscription and auto-refresh
  useEffect(() => {
    // Initial fetch
    fetchLatestHealthData();

    // Set up real-time subscription for health checks
    const channel = supabase
      .channel('health-checks-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'health_checks'
        },
        (payload) => {
          console.log('New health check received:', payload);
          fetchLatestHealthData();
        }
      )
      .subscribe();

    // Auto-refresh every 5 minutes as a fallback
    const intervalId = setInterval(() => {
      fetchLatestHealthData();
    }, 5 * 60 * 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalId);
    };
  }, []);

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

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div className="h-9 w-64 bg-muted rounded animate-pulse" />
          <div className="h-10 w-40 bg-muted rounded animate-pulse" />
        </div>

        <Card>
          <CardHeader>
            <div className="h-6 w-48 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-6 w-6 bg-muted rounded-full animate-pulse" />
                <div>
                  <div className="h-8 w-24 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="h-6 w-40 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-6 w-6 bg-muted rounded-full animate-pulse" />
              <div>
                <div className="h-8 w-20 bg-muted rounded animate-pulse mb-2" />
                <div className="h-4 w-28 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">API Health Monitoring</h1>
        <Button onClick={runHealthCheck} disabled={checking}>
          {checking ? (
            <CharisLoader size="sm" className="mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Run Health Check
        </Button>
      </div>

      {/* OmniHuman API Status */}
      <Card>
        <CardHeader>
          <CardTitle>OmniHuman API Status</CardTitle>
        </CardHeader>
        <CardContent>
          {healthData.omnihuman ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <StatusIcon status={healthData.omnihuman.status} />
                <div>
                  <p className="text-2xl font-bold capitalize">{healthData.omnihuman.status}</p>
                  {healthData.omnihuman.latency && (
                    <p className="text-sm text-gray-500">{healthData.omnihuman.latency}ms response time</p>
                  )}
                </div>
              </div>

              {healthData.omnihuman.error_message && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">
                    <strong>Error:</strong> {healthData.omnihuman.error_message}
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-400">
                Last checked: {new Date(healthData.omnihuman.checked_at).toLocaleString()}
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

      {/* Stripe API Status */}
      <Card>
        <CardHeader>
          <CardTitle>Stripe API Status</CardTitle>
        </CardHeader>
        <CardContent>
          {healthData.stripe ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <StatusIcon status={healthData.stripe.status} />
                <div>
                  <p className="text-2xl font-bold capitalize">{healthData.stripe.status}</p>
                  {healthData.stripe.latency && (
                    <p className="text-sm text-gray-500">{healthData.stripe.latency}ms response time</p>
                  )}
                </div>
              </div>

              {healthData.stripe.error_message && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">
                    <strong>Error:</strong> {healthData.stripe.error_message}
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-400">
                Last checked: {new Date(healthData.stripe.checked_at).toLocaleString()}
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No health check data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supabase Storage Status */}
      <Card>
        <CardHeader>
          <CardTitle>Supabase Storage Status</CardTitle>
        </CardHeader>
        <CardContent>
          {healthData.storage ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <StatusIcon status={healthData.storage.status} />
                <div>
                  <p className="text-2xl font-bold capitalize">{healthData.storage.status}</p>
                  {healthData.storage.latency && (
                    <p className="text-sm text-gray-500">{healthData.storage.latency}ms response time</p>
                  )}
                </div>
              </div>

              {healthData.storage.error_message && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">
                    <strong>Error:</strong> {healthData.storage.error_message}
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-400">
                Last checked: {new Date(healthData.storage.checked_at).toLocaleString()}
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No health check data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
