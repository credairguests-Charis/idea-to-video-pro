import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Video, Activity, Pause, Play, Download, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserDetailSheetProps {
  user: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

export function UserDetailSheet({ user, open, onOpenChange, onUserUpdated }: UserDetailSheetProps) {
  const [toggling, setToggling] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user && open) {
      fetchUserProjects();
    }
  }, [user, open]);

  const fetchUserProjects = async () => {
    if (!user) return;
    
    setLoadingProjects(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.user_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const createAuditLog = async (action: string, description: string) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) return;

      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser.id,
        action: action,
        target_type: 'user',
        target_id: user.user_id,
        description: description,
      });
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  };

  const handleTogglePause = async () => {
    setToggling(true);
    try {
      const newPausedState = !user.paused;
      
      const { error } = await supabase
        .from('profiles')
        .update({ paused: newPausedState })
        .eq('user_id', user.user_id);

      if (error) throw error;

      // Create audit log
      await createAuditLog(
        newPausedState ? 'PAUSE_USER' : 'UNPAUSE_USER',
        `${newPausedState ? 'Paused' : 'Unpaused'} user ${user.full_name || user.email}`
      );

      toast({
        title: newPausedState ? "User Paused" : "User Unpaused",
        description: `${user.full_name || user.email} is now ${newPausedState ? 'paused' : 'active'}.`,
      });

      onUserUpdated();
    } catch (error) {
      console.error('Error toggling user pause:', error);
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    } finally {
      setToggling(false);
    }
  };

  const handleExportUserData = async () => {
    try {
      const userData = {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        status: user.paused ? 'Paused' : 'Active',
        videos_generated: user.video_count,
        created_at: user.created_at,
        last_activity: user.updated_at,
      };

      const csv = [
        Object.keys(userData).join(','),
        Object.values(userData).join(',')
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-${user.email}-data.csv`;
      a.click();

      // Create audit log
      await createAuditLog(
        'EXPORT_USER_DATA',
        `Exported data for user ${user.full_name || user.email}`
      );

      toast({
        title: "Data Exported",
        description: "User data has been downloaded as CSV",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export user data",
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>User Details</SheetTitle>
          <SheetDescription>
            Comprehensive information and activity logs
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          <div className="space-y-6">
            {/* User Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-full">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{user.full_name || 'Unknown'}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <Badge variant={user.paused ? "destructive" : "default"} className="text-xs">
                  {user.paused ? "Paused" : "Active"}
                </Badge>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold">{user.video_count || 0}</div>
                    <p className="text-xs text-muted-foreground">Videos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold">
                      {user.created_at ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Days Active</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-success">
                      {user.paused ? '0' : '100'}%
                    </div>
                    <p className="text-xs text-muted-foreground">Uptime</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Separator />

            {/* Tabs for Different Sections */}
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="videos">Videos</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Account Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">User ID</p>
                        <p className="text-sm font-mono truncate">{user.user_id}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className="text-sm font-medium">{user.paused ? "Paused" : "Active"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Account Created</p>
                        <p className="text-sm">{new Date(user.created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Last Activity</p>
                        <p className="text-sm">
                          {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'Never'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Admin Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Admin Actions</CardTitle>
                    <CardDescription className="text-xs">
                      Manage user access and export data
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      onClick={handleTogglePause}
                      disabled={toggling}
                      variant={user.paused ? "default" : "destructive"}
                      className="w-full"
                    >
                      {user.paused ? (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Unpause User
                        </>
                      ) : (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Pause User
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleExportUserData}
                      variant="outline"
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export User Data
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {user.paused 
                        ? "This user cannot generate videos. Click to reactivate their account."
                        : "Pausing will prevent this user from generating new videos."}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Videos Tab */}
              <TabsContent value="videos" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Video Projects ({projects.length})
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Recent video generation history
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingProjects ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Loading projects...</p>
                    ) : projects.length > 0 ? (
                      <div className="space-y-3">
                        {projects.map((project) => (
                          <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{project.title}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <p className="text-xs text-muted-foreground">
                                  {new Date(project.created_at).toLocaleDateString()}
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {project.generation_status}
                                </Badge>
                              </div>
                            </div>
                            {project.thumbnail_url && (
                              <div className="w-16 h-16 rounded bg-muted overflow-hidden ml-3">
                                <img 
                                  src={project.thumbnail_url} 
                                  alt={project.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No videos generated yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Activity Timeline
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Recent account activity and events
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Account Status</p>
                          <p className="text-xs text-muted-foreground">
                            Current status: {user.paused ? 'Paused' : 'Active'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {user.updated_at ? new Date(user.updated_at).toLocaleString() : 'No recent activity'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground mt-1.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Last Video Generation</p>
                          <p className="text-xs text-muted-foreground">
                            {projects.length > 0 
                              ? new Date(projects[0].created_at).toLocaleString()
                              : 'No videos generated'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground mt-1.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Account Created</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(user.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
