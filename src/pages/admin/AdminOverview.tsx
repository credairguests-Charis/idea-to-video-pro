import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, Video, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { EnhancedKPICard } from "@/components/admin/EnhancedKPICard";
import { AnalyticsChart } from "@/components/admin/AnalyticsChart";
import { HealthWidget } from "@/components/admin/HealthWidget";
import { RecentActivityPanel } from "@/components/admin/RecentActivityPanel";
import { QuickActions } from "@/components/admin/QuickActions";
import { LiveLogsViewer } from "@/components/admin/LiveLogsViewer";

interface HealthCheckData {
  service_name: string;
  status: 'online' | 'warning' | 'down';
  latency: number;
  error_message?: string;
  checked_at: string;
}

interface DashboardData {
  users: number;
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

    // Subscribe to real-time health check updates
    const channel = supabase
      .channel('health-checks-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'health_checks',
        },
        (payload) => {
          console.log('New health check:', payload);
          const newCheck = payload.new as HealthCheckData;
          setHealthData((prev) => ({
            ...prev,
            [newCheck.service_name]: newCheck,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  // Mock logs for live viewer
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

  // Mock analytics data
  const userGrowthData = [
    { name: 'Jan', users: 45 },
    { name: 'Feb', users: 52 },
    { name: 'Mar', users: 61 },
    { name: 'Apr', users: 72 },
    { name: 'May', users: 85 },
    { name: 'Jun', users: data.users },
  ];

  const videoGenerationData = [
    { name: 'Mon', videos: 12 },
    { name: 'Tue', videos: 19 },
    { name: 'Wed', videos: 15 },
    { name: 'Thu', videos: 22 },
    { name: 'Fri', videos: 28 },
    { name: 'Sat', videos: 17 },
    { name: 'Sun', videos: 14 },
  ];

  const subscriptionDistribution = [
    { name: 'Free', value: Math.max(data.users - data.activeSubscriptions, 0) },
    { name: 'Premium', value: data.activeSubscriptions },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Enhanced KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <EnhancedKPICard
          title="Total Users"
          value={data.users}
          icon={Users}
          trend={{ value: 12.5, isPositive: true, period: 'from last month' }}
          loading={loading}
        />
        <EnhancedKPICard
          title="Active Subscriptions"
          value={data.activeSubscriptions}
          icon={DollarSign}
          trend={{ value: 8.3, isPositive: true, period: 'from last month' }}
          loading={loading}
        />
        <EnhancedKPICard
          title="Monthly Revenue"
          value={`$${data.monthlyRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend={{ value: 15.2, isPositive: true, period: 'from last month' }}
          loading={loading}
        />
        <EnhancedKPICard
          title="Videos Generated"
          value={data.generations}
          icon={Video}
          description={`${data.failedJobs} failed`}
          trend={{ value: 3.1, isPositive: false, period: 'from last week' }}
          loading={loading}
        />
      </div>

      {/* Analytics Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <AnalyticsChart
          title="User Growth"
          description="New users over the last 6 months"
          data={userGrowthData}
          type="line"
          dataKeys={[{ key: 'users', color: 'hsl(var(--chart-1))', name: 'Users' }]}
          xAxisKey="name"
        />
        <AnalyticsChart
          title="Weekly Video Generation"
          description="Videos created per day this week"
          data={videoGenerationData}
          type="bar"
          dataKeys={[{ key: 'videos', color: 'hsl(var(--chart-2))', name: 'Videos' }]}
          xAxisKey="name"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <AnalyticsChart
          title="Subscription Distribution"
          description="Free vs Premium users"
          data={subscriptionDistribution}
          type="pie"
        />
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Conversion Rate</CardTitle>
            <CardDescription>Free to Premium conversion metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Conversion</span>
                <span className="text-2xl font-bold">
                  {data.users > 0 ? ((data.activeSubscriptions / data.users) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-success h-2 rounded-full transition-all"
                  style={{ width: `${data.users > 0 ? (data.activeSubscriptions / data.users) * 100 : 0}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Free Users</p>
                  <p className="text-xl font-bold">{Math.max(data.users - data.activeSubscriptions, 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Premium Users</p>
                  <p className="text-xl font-bold">{data.activeSubscriptions}</p>
                </div>
              </div>
            </div>
            </CardContent>
          </Card>
      </div>

      {/* Health Widgets - Real-time Updates */}
      <div className="grid gap-4 md:grid-cols-3">
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
