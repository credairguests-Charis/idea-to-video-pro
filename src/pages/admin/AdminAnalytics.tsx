import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, TrendingUp, AlertTriangle, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AnalyticsChart } from "@/components/admin/AnalyticsChart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface AnalyticsData {
  users: number;
  projects: number;
  generations: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  failedJobs: number;
  historicalRevenue?: Array<{ month: string; revenue: number }>;
  userGrowthData: Array<{ name: string; users: number }>;
  videoGenerationData: Array<{ name: string; videos: number }>;
  revenueData: Array<{ name: string; revenue: number }>;
}

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30d");
  const { toast } = useToast();

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch dashboard data
      const { data: dashboardData, error: dashboardError } = await supabase.functions.invoke(
        'admin-get-dashboard-data'
      );
      if (dashboardError) throw dashboardError;

      // Fetch historical user data
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('created_at')
        .order('created_at', { ascending: true });
      
      if (profilesError) throw profilesError;

      // Fetch historical generation data from both tables
      const { data: omnihumanGens, error: omnihumanError } = await supabase
        .from('omnihuman_generations')
        .select('created_at, status')
        .order('created_at', { ascending: false })
        .limit(1000);
      
      const { data: videoGens, error: videoError } = await supabase
        .from('video_generations')
        .select('created_at, status')
        .order('created_at', { ascending: false })
        .limit(1000);
      
      if (omnihumanError) console.error('Error fetching omnihuman generations:', omnihumanError);
      if (videoError) console.error('Error fetching video generations:', videoError);
      
      // Combine both generation types
      const generations = [...(omnihumanGens || []), ...(videoGens || [])];

      // Process user growth data (last 6 months)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const now = new Date();
      const userGrowthData = [];
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const usersInMonth = profiles?.filter(p => {
          const createdDate = new Date(p.created_at);
          return createdDate >= monthDate && createdDate <= monthEnd;
        }).length || 0;
        
        userGrowthData.push({
          name: monthNames[monthDate.getMonth()],
          users: usersInMonth
        });
      }

      // Process video generation data (last 7 days)
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const videoGenerationData = [];
      
      for (let i = 6; i >= 0; i--) {
        const dayDate = new Date();
        dayDate.setDate(dayDate.getDate() - i);
        dayDate.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(dayDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const videosInDay = generations.filter(g => {
          const createdDate = new Date(g.created_at);
          return createdDate >= dayDate && createdDate < nextDay;
        }).length;
        
        videoGenerationData.push({
          name: dayNames[dayDate.getDay()],
          videos: videosInDay
        });
      }

      // Use real revenue data from Stripe
      const revenueData = dashboardData.historicalRevenue && dashboardData.historicalRevenue.length > 0
        ? dashboardData.historicalRevenue.map(item => ({
            name: item.month,
            revenue: item.revenue
          }))
        : [
            { name: 'Jan', revenue: 0 },
            { name: 'Feb', revenue: 0 },
            { name: 'Mar', revenue: 0 },
            { name: 'Apr', revenue: 0 },
            { name: 'May', revenue: 0 },
            { name: 'Jun', revenue: dashboardData.monthlyRevenue },
          ];

      setData({
        ...dashboardData,
        userGrowthData,
        videoGenerationData,
        revenueData
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();

    // Set up real-time subscriptions for analytics data
    const analyticsChannel = supabase
      .channel('analytics-data-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          console.log('User data changed, refreshing analytics...');
          fetchAnalytics();
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
          console.log('Project data changed, refreshing analytics...');
          fetchAnalytics();
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
          console.log('Generation data changed, refreshing analytics...');
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(analyticsChannel);
    };
  }, [dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const subscriptionDistribution = [
    { name: 'Free', value: Math.max(data.users - data.activeSubscriptions, 0) },
    { name: 'Premium', value: data.activeSubscriptions },
  ];

  const conversionRate = data.users > 0 ? ((data.activeSubscriptions / data.users) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">Comprehensive insights and data visualization</p>
        </div>
        <div className="flex gap-3 w-full lg:w-auto">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchAnalytics} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* AI-Powered Insights Section (Placeholder for Future) */}
      <Card className="border-dashed border-2 border-info bg-info/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-info" />
            <CardTitle className="text-info">AI Executive Summary</CardTitle>
            <Badge variant="secondary" className="ml-auto">Coming Soon</Badge>
          </div>
          <CardDescription>
            AI-powered insights will automatically analyze trends and provide actionable recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Automated trend detection and pattern recognition</p>
            <p>• Predictive analytics for revenue and user growth</p>
            <p>• Anomaly detection for unusual activity patterns</p>
            <p>• Strategic recommendations based on data insights</p>
          </div>
        </CardContent>
      </Card>

      {/* Primary Analytics Charts */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <AnalyticsChart
          title="User Growth Trend"
          description="New user registrations over the last 6 months"
          data={data.userGrowthData}
          type="line"
          dataKeys={[{ key: 'users', color: 'hsl(var(--chart-1))', name: 'New Users' }]}
          xAxisKey="name"
        />
        <AnalyticsChart
          title="Weekly Video Generation"
          description="Videos created per day over the last 7 days"
          data={data.videoGenerationData}
          type="bar"
          dataKeys={[{ key: 'videos', color: 'hsl(var(--chart-2))', name: 'Videos Generated' }]}
          xAxisKey="name"
        />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <AnalyticsChart
          title="Revenue Trend"
          description="Monthly recurring revenue over time"
          data={data.revenueData}
          type="line"
          dataKeys={[{ key: 'revenue', color: 'hsl(var(--chart-3))', name: 'Revenue ($)' }]}
          xAxisKey="name"
        />
        <AnalyticsChart
          title="Subscription Distribution"
          description="Free vs Premium user breakdown"
          data={subscriptionDistribution}
          type="pie"
        />
      </div>

      {/* Conversion & Performance Metrics */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conversion Rate</CardTitle>
            <CardDescription>Free to Premium conversion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-success">{conversionRate}%</span>
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-success h-2 rounded-full transition-all"
                  style={{ width: `${conversionRate}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {data.activeSubscriptions} of {data.users} users converted
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generation Success Rate</CardTitle>
            <CardDescription>Successful vs failed generations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">
                  {data.generations > 0 
                    ? ((data.generations - data.failedJobs) / data.generations * 100).toFixed(1)
                    : '0'}%
                </span>
                {data.failedJobs > 0 && (
                  <AlertTriangle className="h-6 w-6 text-warning" />
                )}
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-success h-2 rounded-full transition-all"
                  style={{ 
                    width: `${data.generations > 0 
                      ? (data.generations - data.failedJobs) / data.generations * 100
                      : 0}%` 
                  }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {data.failedJobs} failures out of {data.generations} total
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Average Revenue Per User</CardTitle>
            <CardDescription>ARPU calculation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">
                  ${data.users > 0 
                    ? (data.monthlyRevenue / data.users).toFixed(2)
                    : '0.00'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Total revenue: ${data.monthlyRevenue.toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Anomaly Detection Placeholder (Future AI Feature) */}
      <Card className="border-dashed border-2 border-warning/50 bg-warning/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <CardTitle className="text-warning">Anomaly Detection</CardTitle>
            <Badge variant="secondary" className="ml-auto">AI-Powered</Badge>
          </div>
          <CardDescription>
            Automatic detection of unusual patterns or potential issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            AI will monitor metrics in real-time and alert you to:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Sudden drops in user engagement or conversion rates</li>
              <li>Unusual spikes in error rates or failed generations</li>
              <li>Abnormal patterns in revenue or subscription changes</li>
              <li>System performance degradation or API issues</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Predictive Trends Placeholder (Future AI Feature) */}
      <Card className="border-dashed border-2 border-chart-3/50 bg-chart-3/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-chart-3" />
            <CardTitle>Predictive Analytics</CardTitle>
            <Badge variant="secondary" className="ml-auto">AI-Powered</Badge>
          </div>
          <CardDescription>
            AI-driven forecasts and predictions for business metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Future AI capabilities will include:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>30/60/90-day revenue and user growth forecasts</li>
              <li>Churn prediction and retention recommendations</li>
              <li>Optimal pricing and promotion timing suggestions</li>
              <li>Resource allocation and capacity planning insights</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
