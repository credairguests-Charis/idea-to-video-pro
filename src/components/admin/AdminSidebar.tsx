import { LayoutDashboard, Activity, Tag, Link2, FileText, Users, LogOut, Sun, Moon, BarChart3 } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const menuItems = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard, end: true },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Health", url: "/admin/health", icon: Activity },
  { title: "Promotions", url: "/admin/promos", icon: Tag },
  { title: "Admin Links", url: "/admin/links", icon: Link2 },
  { title: "Audit Logs", url: "/admin/logs", icon: FileText },
  { title: "Users", url: "/admin/users", icon: Users },
];

interface AdminSidebarProps {
  isDarkMode: boolean;
  setIsDarkMode: (value: boolean) => void;
}

export function AdminSidebar({ isDarkMode, setIsDarkMode }: AdminSidebarProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar-background" collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        {!isCollapsed && (
          <h2 className="text-xl font-bold text-sidebar-foreground">Admin Dashboard</h2>
        )}
        {isCollapsed && (
          <div className="flex justify-center">
            <LayoutDashboard className="h-6 w-6 text-sidebar-foreground" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto">
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs uppercase px-3 py-2">
              Main Menu
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <TooltipProvider delayDuration={0}>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            end={item.end}
                            className={({ isActive }) =>
                              `flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 w-full ${
                                isActive
                                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                                  : "text-sidebar-foreground hover:bg-sidebar-accent/20 hover:text-sidebar-accent-foreground"
                              }`
                            }
                          >
                            {({ isActive }) => (
                              <>
                                <item.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-primary-foreground' : 'text-sidebar-foreground'}`} />
                                {!isCollapsed && (
                                  <span className={`flex-1 ${isActive ? 'text-primary-foreground' : 'text-sidebar-foreground'}`}>
                                    {item.title}
                                  </span>
                                )}
                              </>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      {isCollapsed && (
                        <TooltipContent side="right" className="font-medium">
                          {item.title}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </TooltipProvider>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border space-y-3">
        {!isCollapsed ? (
          <>
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                <Label htmlFor="theme-toggle" className="text-sm text-sidebar-foreground cursor-pointer">
                  {isDarkMode ? 'Dark' : 'Light'}
                </Label>
              </div>
              <Switch
                id="theme-toggle"
                checked={isDarkMode}
                onCheckedChange={setIsDarkMode}
              />
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5 mr-3" />
              <span>Sign Out</span>
            </Button>
          </>
        ) : (
          <TooltipProvider delayDuration={0}>
            <div className="flex flex-col items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-sidebar-foreground hover:bg-sidebar-accent"
                    onClick={() => setIsDarkMode(!isDarkMode)}
                  >
                    {isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-sidebar-foreground hover:bg-sidebar-accent"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  Sign Out
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
