import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Copy, Plus, Users, Ban, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface InviteLink {
  id: string;
  slug: string;
  expires_at: string;
  max_uses: number | null;
  current_uses: number;
  revoked: boolean;
  created_at: string;
}

interface InviteUsage {
  id: string;
  user_id: string;
  used_at: string;
  user_email?: string;
}

export default function AdminLinks() {
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUses, setMaxUses] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<InviteLink | null>(null);
  const [usages, setUsages] = useState<InviteUsage[]>([]);
  const [loadingUsages, setLoadingUsages] = useState(false);

  useEffect(() => {
    fetchInviteLinks();
  }, []);

  const fetchInviteLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('invite_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInviteLinks(data || []);
    } catch (err: any) {
      console.error('Error fetching invite links:', err);
      toast.error('Failed to load invite links');
    } finally {
      setLoading(false);
    }
  };

  const createInviteLink = async () => {
    if (!expiresAt) {
      toast.error('Please set an expiration date');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-invite', {
        body: {
          expires_at: new Date(expiresAt).toISOString(),
          max_uses: maxUses,
        },
      });

      if (error) throw error;

      toast.success('Invite link created successfully');
      setDialogOpen(false);
      setExpiresAt("");
      setMaxUses(null);
      fetchInviteLinks();
    } catch (err: any) {
      console.error('Error creating invite link:', err);
      toast.error(err.message || 'Failed to create invite link');
    } finally {
      setCreating(false);
    }
  };

  const revokeInviteLink = async (inviteId: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-revoke-invite', {
        body: { invite_id: inviteId },
      });

      if (error) throw error;

      toast.success('Invite link revoked');
      fetchInviteLinks();
    } catch (err: any) {
      console.error('Error revoking invite link:', err);
      toast.error(err.message || 'Failed to revoke invite link');
    }
  };

  const copyInviteUrl = (slug: string) => {
    const url = `${window.location.origin}/invite/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Invite link copied to clipboard');
  };

  const fetchUsages = async (inviteId: string) => {
    setLoadingUsages(true);
    try {
      const { data, error } = await supabase
        .from('invite_link_usages')
        .select('*')
        .eq('invite_id', inviteId);

      if (error) throw error;

      // Fetch user emails
      const usagesWithEmails = await Promise.all(
        (data || []).map(async (usage) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('user_id', usage.user_id)
            .single();
          
          return { ...usage, user_email: profile?.email };
        })
      );

      setUsages(usagesWithEmails);
    } catch (err: any) {
      console.error('Error fetching usages:', err);
      toast.error('Failed to load usages');
    } finally {
      setLoadingUsages(false);
    }
  };

  const getStatus = (link: InviteLink) => {
    if (link.revoked) return { label: 'Revoked', variant: 'destructive' as const };
    if (new Date(link.expires_at) < new Date()) return { label: 'Expired', variant: 'secondary' as const };
    if (link.max_uses && link.current_uses >= link.max_uses) return { label: 'Max Uses', variant: 'secondary' as const };
    return { label: 'Active', variant: 'default' as const };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invite Links</h1>
          <p className="text-muted-foreground">Generate invite links that bypass the paywall</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Invite Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Invite Link</DialogTitle>
              <DialogDescription>
                Generate a new invite link with custom expiration and usage limits
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="expires">Expiration Date</Label>
                <Input
                  id="expires"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUses">Max Uses (Optional)</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={maxUses || ""}
                  onChange={(e) => setMaxUses(e.target.value ? parseInt(e.target.value) : null)}
                />
              </div>
              <Button onClick={createInviteLink} disabled={creating} className="w-full">
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Link'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Invite Links</CardTitle>
          <CardDescription>
            Manage and monitor invite links for paywall bypass
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inviteLinks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No invite links created yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Link</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inviteLinks.map((link) => {
                  const status = getStatus(link);
                  return (
                    <TableRow key={link.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            /invite/{link.slug}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyInviteUrl(link.slug)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/invite/${link.slug}`, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(link.expires_at), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {link.current_uses} / {link.max_uses || '∞'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Sheet>
                            <SheetTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedLink(link);
                                  fetchUsages(link.id);
                                }}
                              >
                                <Users className="h-3 w-3 mr-1" />
                                Users
                              </Button>
                            </SheetTrigger>
                            <SheetContent>
                              <SheetHeader>
                                <SheetTitle>Users Who Used This Link</SheetTitle>
                                <SheetDescription>
                                  {link.current_uses} user(s) signed up with this invite
                                </SheetDescription>
                              </SheetHeader>
                              <div className="mt-6 space-y-4">
                                {loadingUsages ? (
                                  <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                  </div>
                                ) : usages.length === 0 ? (
                                  <div className="text-center py-8 text-muted-foreground">
                                    No users yet
                                  </div>
                                ) : (
                                  usages.map((usage) => (
                                    <div key={usage.id} className="border-b pb-3">
                                      <div className="font-medium">{usage.user_email || 'Unknown'}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {format(new Date(usage.used_at), 'MMM dd, yyyy HH:mm')}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </SheetContent>
                          </Sheet>
                          {!link.revoked && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => revokeInviteLink(link.id)}
                            >
                              <Ban className="h-3 w-3 mr-1" />
                              Revoke
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
