import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, Video, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { EnhancedKPICard } from "@/components/admin/EnhancedKPICard";
import { HealthWidget } from "@/components/admin/HealthWidget";
import { RecentActivityPanel } from "@/components/admin/RecentActivityPanel";
import { QuickActions } from "@/components/admin/QuickActions";
import { LiveLogsViewer } from "@/components/admin/LiveLogsViewer";
import { AlertsPanel } from "@/components/admin/AlertsPanel";

interface HealthCheckData {
  service_name: string;
  status: 'online' | 'warning' | 'down';
  latency: number;
  error_message?: string;
  checked_at: string;
}

interface TrendData {
  value: number;
  isPositive: boolean;
}

interface DashboardData {
  users: number;
  pausedUsers: number;
  projects: number;
  generations: number;
  activePromos: number;
  failedJobs: number;
  queueLength: number;
  activeSubscriptions: number;
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
  userTrend?: TrendData;
  subscriptionTrend?: TrendData;
  revenueTrend?: TrendData;
  videoTrend?: TrendData;
}

export default function AdminOverview() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState<Record<string, HealthCheckData>>({});
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

  // Fetch latest health check data
  const fetchHealthData = async () => {
    try {
      const { data: healthChecks, error } = await supabase
        .from('health_checks' as any)
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      if (healthChecks) {
        const healthMap: Record<string, HealthCheckData> = {};
        healthChecks.forEach((check: any) => {
          if (!healthMap[check.service_name]) {
            healthMap[check.service_name] = check as HealthCheckData;
          }
        });
        setHealthData(healthMap);
      }
    } catch (error) {
      console.error('Error fetching health data:', error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchHealthData();

    // Set up real-time subscriptions for all relevant tables
    const healthChannel = supabase
      .channel('health-checks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'health_checks'
        },
        (payload) => {
          console.log('Health check data changed:', payload);
          const newCheck = payload.new as HealthCheckData;
          setHealthData((prev) => ({
            ...prev,
            [newCheck.service_name]: newCheck,
          }));
        }
      )
      .subscribe();

    const dashboardChannel = supabase
      .channel('dashboard-data-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          console.log('User data changed, refreshing dashboard...');
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        () => {
          console.log('Project data changed, refreshing dashboard...');
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'omnihuman_generations'
        },
        () => {
          console.log('Generation data changed, refreshing dashboard...');
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_generations'
        },
        () => {
          console.log('Video generation data changed, refreshing dashboard...');
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_audit_logs'
        },
        () => {
          console.log('Admin audit log added, refreshing dashboard...');
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(healthChannel);
      supabase.removeChannel(dashboardChannel);
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 w-full">
        <div className="flex justify-between items-center">
          <div className="h-9 w-48 bg-muted rounded animate-pulse" />
          <div className="h-9 w-24 bg-muted rounded animate-pulse" />
        </div>
        
        {/* KPI Cards Skeleton */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-4 w-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-20 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 w-32 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 w-24 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Alerts Skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-16 w-full bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
        
        {/* Health Widgets Skeleton */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-5 w-32 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-6 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Format activity data
  const recentActivities = data.recentActions.map(action => ({
    id: action.id,
    action: action.action,
    details: typeof action.details === 'string' ? action.details : JSON.stringify(action.details),
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

  // Live logs from admin actions and generation errors
  const liveLogs = [
    ...data.recentActions.slice(0, 10).map(action => ({
      id: action.id,
      timestamp: new Date(action.created_at),
      level: 'info' as const,
      message: `${action.action}: ${typeof action.details === 'string' ? action.details : JSON.stringify(action.details)}`,
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
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Enhanced KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <EnhancedKPICard
          title="Total Users"
          value={data.users}
          icon={Users}
          trend={data.userTrend ? {
            value: data.userTrend.value,
            isPositive: data.userTrend.isPositive,
            period: 'from last month'
          } : undefined}
          loading={loading}
        />
        <EnhancedKPICard
          title="Active Subscriptions"
          value={data.activeSubscriptions}
          icon={DollarSign}
          trend={data.subscriptionTrend ? {
            value: data.subscriptionTrend.value,
            isPositive: data.subscriptionTrend.isPositive,
            period: 'from last month'
          } : undefined}
          loading={loading}
        />
        <EnhancedKPICard
          title="Monthly Revenue"
          value={`$${data.monthlyRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend={data.revenueTrend ? {
            value: data.revenueTrend.value,
            isPositive: data.revenueTrend.isPositive,
            period: 'from last month'
          } : undefined}
          loading={loading}
        />
        <EnhancedKPICard
          title="Videos Generated"
          value={data.generations}
          icon={Video}
          description={`${data.failedJobs} failed`}
          trend={data.videoTrend ? {
            value: data.videoTrend.value,
            isPositive: data.videoTrend.isPositive,
            period: 'from last week'
          } : undefined}
          loading={loading}
        />
      </div>

      {/* Quick Stats Overview */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.users > 0 ? ((data.activeSubscriptions / data.users) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.activeSubscriptions} of {data.users} users
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.generations > 0 
                ? ((data.generations - data.failedJobs) / data.generations * 100).toFixed(1)
                : '0'}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.generations - data.failedJobs} successful generations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Promos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activePromos}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Available promotion codes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Alerts */}
      <AlertsPanel />

      {/* Health Widgets - Real-time Updates */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <HealthWidget
          serviceName="OmniHuman API"
          status={healthData.omnihuman?.status || 'warning'}
          latency={healthData.omnihuman?.latency}
          lastChecked={healthData.omnihuman ? new Date(healthData.omnihuman.checked_at) : undefined}
          details={healthData.omnihuman?.error_message}
        />
        <HealthWidget
          serviceName="Stripe"
          status={healthData.stripe?.status || 'warning'}
          latency={healthData.stripe?.latency}
          lastChecked={healthData.stripe ? new Date(healthData.stripe.checked_at) : undefined}
          details={healthData.stripe?.error_message}
        />
        <HealthWidget
          serviceName="Supabase Storage"
          status={healthData.storage?.status || 'warning'}
          latency={healthData.storage?.latency}
          lastChecked={healthData.storage ? new Date(healthData.storage.checked_at) : undefined}
          details={healthData.storage?.error_message}
        />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Left Column - Activity Panels */}
        <div className="lg:col-span-2 space-y-6">
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
