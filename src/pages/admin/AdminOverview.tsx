import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FolderOpen, Video, Tag, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface DashboardData {
  users: number;
  projects: number;
  generations: number;
  activePromos: number;
  apiHealth: any;
  recentActions: any[];
}

export default function AdminOverview() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: dashboardData, error } = await supabase.functions.invoke(
        'admin-get-dashboard-data'
      );

      if (error) throw error;
      setData(dashboardData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-[#0f1729]" />
      </div>
    );
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'down': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{data?.users || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Projects
            </CardTitle>
            <FolderOpen className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{data?.projects || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Videos Generated
            </CardTitle>
            <Video className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{data?.generations || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              API Status
            </CardTitle>
            <div className={`h-3 w-3 rounded-full ${
              data?.apiHealth?.status === 'online' ? 'bg-green-500' :
              data?.apiHealth?.status === 'warning' ? 'bg-yellow-500' :
              'bg-red-500'
            }`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 capitalize">
              {data?.apiHealth?.status || 'Unknown'}
            </div>
            {data?.apiHealth?.latency_ms && (
              <p className="text-xs text-gray-500 mt-1">
                {data.apiHealth.latency_ms}ms latency
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Admin Actions</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.recentActions && data.recentActions.length > 0 ? (
            <div className="space-y-3">
              {data.recentActions.map((action: any) => (
                <div key={action.id} className="flex justify-between items-start border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{action.action}</p>
                    <p className="text-sm text-gray-500">
                      {action.details && JSON.stringify(action.details)}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(action.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No recent actions</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
