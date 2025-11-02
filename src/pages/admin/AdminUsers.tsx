import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, User, Video, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UserDetailSheet } from "@/components/admin/UserDetailSheet";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [totalUserCount, setTotalUserCount] = useState(0);
  const [activeUserCount, setActiveUserCount] = useState(0);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch accurate total user count from auth.users
      const { data: totalCount } = await supabase.rpc('get_total_user_count');
      setTotalUserCount(totalCount || 0);
      
      // Fetch active user count
      const { data: activeCount } = await supabase.rpc('get_active_user_count');
      setActiveUserCount(activeCount || 0);
      
      // Fetch users with their project counts
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch project counts for each user
      const usersWithCounts = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { count } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.user_id);

          return {
            ...profile,
            video_count: count || 0,
          };
        })
      );

      setUsers(usersWithCounts);
      setFilteredUsers(usersWithCounts);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    
    // Set up real-time subscriptions for profile changes
    const profilesChannel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          console.log('Profile change detected, refreshing...');
          fetchUsers();
        }
      )
      .subscribe();

    // Set up real-time subscriptions for project changes
    const projectsChannel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        () => {
          console.log('Project change detected, refreshing...');
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(projectsChannel);
    };
  }, []);

  useEffect(() => {
    const filtered = users.filter(user => 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const handleUserClick = (user: any) => {
    setSelectedUser(user);
    setSheetOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const pausedUsers = totalUserCount - activeUserCount;
  const totalVideos = users.reduce((acc, u) => acc + (u.video_count || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and manage all users in the system
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUserCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered in system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUserCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalUserCount > 0 ? ((activeUserCount / totalUserCount) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paused Users</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pausedUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Access restricted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVideos}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Search, filter, and manage user accounts
          </CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Videos</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.full_name || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.paused ? "destructive" : "default"}>
                          {user.paused ? (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Paused
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Video className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{user.video_count || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUserClick(user)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              No users found
            </p>
          )}
        </CardContent>
      </Card>

      <UserDetailSheet 
        user={selectedUser}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUserUpdated={fetchUsers}
      />
    </div>
  );
}
