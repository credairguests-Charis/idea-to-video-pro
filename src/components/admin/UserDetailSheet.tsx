import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Video, LogIn, Pause, Play } from "lucide-react";
import { useState } from "react";
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
  const { toast } = useToast();

  if (!user) return null;

  const handleTogglePause = async () => {
    setToggling(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ paused: !user.paused })
        .eq('user_id', user.user_id);

      if (error) throw error;

      toast({
        title: user.paused ? "User Unpaused" : "User Paused",
        description: `${user.full_name || user.email} is now ${user.paused ? 'active' : 'paused'}.`,
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>User Details</SheetTitle>
          <SheetDescription>
            Comprehensive information about this user
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          <div className="space-y-6">
            {/* User Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-full">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{user.full_name || 'Unknown'}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <Badge variant={user.paused ? "destructive" : "default"}>
                  {user.paused ? "Paused" : "Active"}
                </Badge>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Account Status</p>
                  <p className="font-medium">{user.paused ? "Paused" : "Active"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{new Date(user.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Videos Generated</p>
                  <p className="font-medium">{user.video_count || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Login</p>
                  <p className="font-medium">
                    {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Admin Actions</h4>
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
              <p className="text-xs text-muted-foreground">
                {user.paused 
                  ? "This user cannot generate videos. Click to reactivate their account."
                  : "Pausing will prevent this user from generating new videos."}
              </p>
            </div>

            <Separator />

            {/* Recent Videos */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Video className="h-4 w-4" />
                Recent Videos
              </h4>
              {user.video_count > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Total: {user.video_count} videos generated
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No videos generated yet</p>
              )}
            </div>

            {/* Activity Log */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Activity Log
              </h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Last activity: {user.updated_at ? new Date(user.updated_at).toLocaleString() : 'No activity'}</p>
                <p>Account created: {new Date(user.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
