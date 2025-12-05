import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, User, Video, CheckCircle, XCircle } from "lucide-react";
import { CharisLoader } from "@/components/ui/charis-loader";
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [totalUserCount, setTotalUserCount] = useState(0);
  const [activeUserCount, setActiveUserCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  
  const usersPerPage = 50;

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

      // Fetch project counts and video generation counts for each user
      const usersWithCounts = await Promise.all(
        (profilesData || []).map(async (profile) => {
          // Count projects
          const { count: projectCount } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.user_id);

          // Count OmniHuman generations
          const { count: omnihumanCount } = await supabase
            .from('omnihuman_generations')
            .select('*', { count: 'exact', head: true })
            .in('project_id', 
              await supabase
                .from('projects')
                .select('id')
                .eq('user_id', profile.user_id)
                .then(({ data }) => data?.map(p => p.id) || [])
            );

          // Count Sora video generations  
          const { count: videoGenCount } = await supabase
            .from('video_generations')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.user_id);

          const totalVideos = (omnihumanCount || 0) + (videoGenCount || 0);

          console.log(`User ${profile.email}: ${omnihumanCount} OmniHuman + ${videoGenCount} Sora = ${totalVideos} total videos`);

          return {
            ...profile,
            project_count: projectCount || 0,
            video_count: totalVideos,
            omnihuman_count: omnihumanCount || 0,
            sora_count: videoGenCount || 0,
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
    
    // Set up real-time subscriptions for profile, project, and generation changes
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

    // Real-time subscription for omnihuman generations
    const omnihumanChannel = supabase
      .channel('omnihuman-gen-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'omnihuman_generations'
        },
        () => {
          console.log('OmniHuman generation change detected, refreshing...');
          fetchUsers();
        }
      )
      .subscribe();

    // Real-time subscription for video generations
    const videoGenChannel = supabase
      .channel('video-gen-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_generations'
        },
        () => {
          console.log('Video generation change detected, refreshing...');
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(projectsChannel);
      supabase.removeChannel(omnihumanChannel);
      supabase.removeChannel(videoGenChannel);
    };
  }, []);

  useEffect(() => {
    const filtered = users.filter(user => 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to first page when search changes
  }, [searchQuery, users]);

  const handleUserClick = (user: any) => {
    setSelectedUser(user);
    setSheetOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-9 w-56 bg-muted rounded animate-pulse mb-2" />
          <div className="h-5 w-80 bg-muted rounded animate-pulse" />
        </div>

        {/* Summary Cards Skeleton */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-4 w-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 w-28 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table Skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 w-32 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse mb-4" />
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3 border-b">
                  <div className="flex-1">
                    <div className="h-4 w-40 bg-muted rounded animate-pulse mb-2" />
                    <div className="h-3 w-52 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="h-6 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-12 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-8 w-28 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pausedUsers = totalUserCount - activeUserCount;
  const totalVideos = users.reduce((acc, u) => acc + (u.video_count || 0), 0);
  
  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

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
                  {paginatedUsers.map((user) => (
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
                        <div className="flex items-center gap-2">
                          <Video className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{user.video_count || 0}</span>
                          {(user.omnihuman_count > 0 || user.sora_count > 0) && (
                            <span className="text-xs text-muted-foreground">
                              ({user.omnihuman_count || 0}OH + {user.sora_count || 0}S)
                            </span>
                          )}
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
          
          {/* Pagination - only show if there are more than 50 users */}
          {filteredUsers.length > usersPerPage && (
            <div className="flex items-center justify-between px-2 py-4 border-t mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {[...Array(totalPages)].map((_, index) => {
                    const pageNumber = index + 1;
                    // Show first page, last page, current page, and pages around current
                    if (
                      pageNumber === 1 ||
                      pageNumber === totalPages ||
                      (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                    ) {
                      return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            onClick={() => setCurrentPage(pageNumber)}
                            isActive={currentPage === pageNumber}
                            className="cursor-pointer"
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    } else if (
                      pageNumber === currentPage - 2 ||
                      pageNumber === currentPage + 2
                    ) {
                      return (
                        <PaginationItem key={pageNumber}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return null;
                  })}

                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
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
