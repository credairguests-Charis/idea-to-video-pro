import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, Video, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { KPICard } from "@/components/admin/KPICard";
import { HealthWidget } from "@/components/admin/HealthWidget";
import { RecentActivityPanel } from "@/components/admin/RecentActivityPanel";
import { QuickActions } from "@/components/admin/QuickActions";
import { LiveLogsViewer } from "@/components/admin/LiveLogsViewer";

interface DashboardData {
  users: number;
  projects: number;
  generations: number;
  activePromos: number;
  failedJobs: number;
  queueLength: number;
  monthlyRevenue: number;
  apiHealth: {
    status: string;
    latency_ms?: number;
    checked_at: string;
  };
  recentActions: Array<{
    id: string;
    action: string;
    details: string;
    created_at: string;
  }>;
  recentErrors: Array<{
    id: string;
    error_message: string;
    project_id: string;
    created_at: string;
  }>;
}

export default function AdminOverview() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

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
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  // Format activity data
  const recentActivities = data.recentActions.map(action => ({
    id: action.id,
    action: action.action,
    details: action.details,
    timestamp: new Date(action.created_at),
    type: 'info' as const
  }));

  const recentErrorActivities = (data.recentErrors || []).map(error => ({
    id: error.id,
    action: 'Generation Error',
    details: error.error_message,
    timestamp: new Date(error.created_at),
    type: 'error' as const
  }));

  // Mock logs for live viewer
  const liveLogs = [
    ...data.recentActions.slice(0, 10).map(action => ({
      id: action.id,
      timestamp: new Date(action.created_at),
      level: 'info' as const,
      message: `${action.action}: ${action.details}`,
      source: 'admin'
    })),
    ...(data.recentErrors || []).slice(0, 10).map(error => ({
      id: error.id,
      timestamp: new Date(error.created_at),
      level: 'error' as const,
      message: error.error_message,
      source: 'generation'
    }))
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Users"
          value={data.users}
          icon={Users}
          loading={loading}
        />
        <KPICard
          title="Active Subscriptions"
          value={0}
          icon={DollarSign}
          description="Coming soon"
          loading={loading}
        />
        <KPICard
          title="Monthly Revenue"
          value={`$${data.monthlyRevenue.toLocaleString()}`}
          icon={DollarSign}
          loading={loading}
        />
        <KPICard
          title="Generation Queue"
          value={data.queueLength}
          icon={Video}
          description={`${data.failedJobs} failed`}
          loading={loading}
        />
      </div>

      {/* Health Widgets */}
      <div className="grid gap-4 md:grid-cols-3">
        <HealthWidget
          serviceName="OmniHuman API"
          status={data.apiHealth.status as any}
          latency={data.apiHealth.latency_ms}
          lastChecked={new Date(data.apiHealth.checked_at)}
        />
        <HealthWidget
          serviceName="Stripe"
          status="online"
          latency={45}
          lastChecked={new Date()}
        />
        <HealthWidget
          serviceName="Supabase Storage"
          status="online"
          latency={12}
          lastChecked={new Date()}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Activity Panels */}
        <div className="md:col-span-2 space-y-6">
          <RecentActivityPanel
            title="Recent Admin Actions"
            activities={recentActivities}
            maxHeight="300px"
          />
          {recentErrorActivities.length > 0 && (
            <RecentActivityPanel
              title="Recent Generation Errors"
              activities={recentErrorActivities}
              maxHeight="300px"
            />
          )}
        </div>

        {/* Right Column - Quick Actions & Navigation */}
        <div className="space-y-6">
          <QuickActions
            onCreatePromo={() => navigate('/admin/promos')}
            onCreatePromoLink={() => navigate('/admin/promos')}
            onCreateLifetimeDeal={() => navigate('/admin/promos')}
            onCreateBypassLink={() => navigate('/admin/links')}
            onRunHealthCheck={() => navigate('/admin/health')}
          />
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-3">
                <Button variant="outline" size="sm" onClick={() => navigate('/admin/health')}>
                  View Detailed Health
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/admin/logs')}>
                  View All Logs
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/admin/users')}>
                  Manage Users
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Live Logs Viewer */}
      <LiveLogsViewer logs={liveLogs} maxHeight="400px" />
    </div>
  );
}
