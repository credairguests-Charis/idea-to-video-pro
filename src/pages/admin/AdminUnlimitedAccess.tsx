import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, Shield, ShieldCheck, Crown, User } from "lucide-react";
import { CharisLoader } from "@/components/ui/charis-loader";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface UserWithAccess {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  has_unlimited_access: boolean | null;
  unlimited_access_granted_at: string | null;
  free_credits: number;
  paid_credits: number;
  credits: number | null;
}

export default function AdminUnlimitedAccess() {
  const [users, setUsers] = useState<UserWithAccess[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    user: UserWithAccess | null;
    grantAccess: boolean;
  }>({ open: false, user: null, grantAccess: false });
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const usersPerPage = 20;

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, email, full_name, has_unlimited_access, unlimited_access_granted_at, free_credits, paid_credits, credits')
        .order('has_unlimited_access', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(data || []);
      setFilteredUsers(data || []);
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

    // Subscribe to profile changes
    const channel = supabase
      .channel('profiles-unlimited-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const filtered = users.filter(user =>
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [searchQuery, users]);

  const handleToggleAccess = async () => {
    if (!confirmDialog.user) return;
    
    setProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('admin-grant-unlimited-access', {
        body: {
          target_user_id: confirmDialog.user.user_id,
          grant_access: confirmDialog.grantAccess,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: confirmDialog.grantAccess 
          ? `Unlimited access granted to ${confirmDialog.user.email || confirmDialog.user.full_name}`
          : `Unlimited access revoked from ${confirmDialog.user.email || confirmDialog.user.full_name}`,
      });

      setConfirmDialog({ open: false, user: null, grantAccess: false });
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating access:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user access",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const openConfirmDialog = (user: UserWithAccess, grantAccess: boolean) => {
    setConfirmDialog({ open: true, user, grantAccess });
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const unlimitedAccessCount = users.filter(u => u.has_unlimited_access).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-9 w-56 bg-muted rounded animate-pulse mb-2" />
          <div className="h-5 w-80 bg-muted rounded animate-pulse" />
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <CharisLoader size="lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Unlimited Access Management</h1>
        <p className="text-muted-foreground mt-2">
          Grant or revoke unlimited access to users. Users with unlimited access can use all features without credit limits.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unlimited Access Users</CardTitle>
            <Crown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{unlimitedAccessCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Standard Users</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length - unlimitedAccessCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Search and manage user access permissions
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
                    <TableHead>Credits</TableHead>
                    <TableHead>Access Status</TableHead>
                    <TableHead>Granted At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {user.full_name || 'Unknown'}
                            {user.has_unlimited_access && (
                              <Crown className="h-4 w-4 text-amber-500" />
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-medium">{user.credits ?? 0}</span>
                          <span className="text-muted-foreground text-xs ml-1">
                            ({user.free_credits || 0} free + {user.paid_credits || 0} paid)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.has_unlimited_access ? "default" : "secondary"}
                          className={user.has_unlimited_access ? "bg-amber-500 hover:bg-amber-600" : ""}
                        >
                          {user.has_unlimited_access ? (
                            <>
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              Unlimited
                            </>
                          ) : (
                            <>
                              <Shield className="h-3 w-3 mr-1" />
                              Standard
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.unlimited_access_granted_at 
                          ? new Date(user.unlimited_access_granted_at).toLocaleDateString()
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={user.has_unlimited_access || false}
                            onCheckedChange={(checked) => openConfirmDialog(user, checked)}
                          />
                          <Label className="text-sm">
                            {user.has_unlimited_access ? 'Revoke' : 'Grant'}
                          </Label>
                        </div>
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

          {/* Pagination */}
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
                  {[...Array(Math.min(totalPages, 5))].map((_, index) => {
                    const pageNumber = index + 1;
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
                  })}
                  {totalPages > 5 && <PaginationEllipsis />}
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

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !processing && setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.grantAccess ? 'Grant Unlimited Access' : 'Revoke Unlimited Access'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.grantAccess ? (
                <>
                  Are you sure you want to grant unlimited access to{' '}
                  <strong>{confirmDialog.user?.email || confirmDialog.user?.full_name}</strong>?
                  <br /><br />
                  This user will be able to use all features without any credit limitations.
                </>
              ) : (
                <>
                  Are you sure you want to revoke unlimited access from{' '}
                  <strong>{confirmDialog.user?.email || confirmDialog.user?.full_name}</strong>?
                  <br /><br />
                  This user will return to standard credit-based usage.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, user: null, grantAccess: false })}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog.grantAccess ? "default" : "destructive"}
              onClick={handleToggleAccess}
              disabled={processing}
            >
              {processing ? (
                <CharisLoader size="sm" className="mr-2" />
              ) : null}
              {confirmDialog.grantAccess ? 'Grant Access' : 'Revoke Access'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
