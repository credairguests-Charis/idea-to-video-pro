import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Search, Coins, TrendingUp, TrendingDown, Users, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface TransactionLog {
  id: string;
  user_id: string;
  credits_change: number;
  reason: string;
  created_at: string;
  metadata: any;
  user_email?: string;
}

interface CreditStats {
  totalCreditsIssued: number;
  totalCreditsUsed: number;
  averageCreditsPerUser: number;
  usersWithCredits: number;
  topUpRevenue: number;
}

export default function AdminCredits() {
  const [transactions, setTransactions] = useState<TransactionLog[]>([]);
  const [stats, setStats] = useState<CreditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch transaction logs
      const { data: transactionData, error: transactionError } = await supabase
        .from("transaction_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (transactionError) throw transactionError;

      // Fetch user emails for transactions
      const userIds = [...new Set(transactionData?.map(t => t.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email")
        .in("user_id", userIds);

      const emailMap = new Map(profiles?.map(p => [p.user_id, p.email]) || []);

      const enrichedTransactions = transactionData?.map(t => ({
        ...t,
        user_email: emailMap.get(t.user_id) || "Unknown",
      })) || [];

      setTransactions(enrichedTransactions);

      // Calculate stats
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("credits");

      const totalCredits = allProfiles?.reduce((sum, p) => sum + (p.credits || 0), 0) || 0;
      const usersWithCredits = allProfiles?.filter(p => (p.credits || 0) > 0).length || 0;

      const creditsIssued = transactionData
        ?.filter(t => t.credits_change > 0)
        .reduce((sum, t) => sum + t.credits_change, 0) || 0;

      const creditsUsed = transactionData
        ?.filter(t => t.credits_change < 0)
        .reduce((sum, t) => sum + Math.abs(t.credits_change), 0) || 0;

      const topUpTransactions = transactionData?.filter(t => 
        t.reason.includes("top-up") || t.reason.includes("topup")
      ) || [];
      
      const topUpRevenue = topUpTransactions.reduce((sum, t) => {
        const metadata = t.metadata as Record<string, any> | null;
        const amount = metadata?.amount_paid || 0;
        return sum + (amount / 100); // Convert from cents
      }, 0);

      setStats({
        totalCreditsIssued: creditsIssued,
        totalCreditsUsed: creditsUsed,
        averageCreditsPerUser: allProfiles?.length ? Math.round(totalCredits / allProfiles.length) : 0,
        usersWithCredits,
        topUpRevenue,
      });

    } catch (error) {
      console.error("Error fetching credit data:", error);
      toast({
        title: "Error",
        description: "Failed to load credit data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredTransactions = transactions.filter(t => 
    t.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Credit Analytics</h1>
          <p className="text-muted-foreground">Monitor credit usage and transactions</p>
        </div>
        <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Issued</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCreditsIssued.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Total credits given to users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCreditsUsed.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Total credits consumed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Credits/User</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.averageCreditsPerUser.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">{stats?.usersWithCredits || 0} users with credits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top-Up Revenue</CardTitle>
            <Coins className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.topUpRevenue.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-muted-foreground">From credit purchases</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Logs */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>All credit transactions across users</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(transaction.created_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium truncate max-w-[200px]">
                            {transaction.user_email}
                          </span>
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {transaction.user_id.slice(0, 8)}...
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{transaction.reason}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={transaction.credits_change > 0 ? "default" : "destructive"}
                          className={transaction.credits_change > 0 ? "bg-green-500/10 text-green-600 hover:bg-green-500/20" : ""}
                        >
                          {transaction.credits_change > 0 ? "+" : ""}
                          {transaction.credits_change}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
