import { Home, FolderOpen, Video, Settings, User, LogOut, Wand2 } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"

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
} from "@/components/ui/sidebar"

const items = [
  { title: "New Project", url: "/app", icon: Home },
  { title: "Workspace", url: "/app/workspace", icon: FolderOpen },
  { title: "Projects", url: "/app/projects", icon: Video },
  { title: "Video Generator", url: "/app/video-generator", icon: Wand2 },
  { title: "Settings", url: "/app/settings", icon: Settings },
]

export function AppSidebar() {
  const location = useLocation()
  const currentPath = location.pathname
  const { user, signOut } = useAuth()

  const isActive = (path: string) => currentPath === path

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <Sidebar className="w-60" collapsible="icon">
      <SidebarHeader className="border-b border-border px-4 py-3">
        <div className="font-semibold text-lg">Arcads</div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                     <NavLink 
                      to={item.url} 
                      end={item.url === "/app"}
                      className={({ isActive }) => 
                        isActive ? "bg-accent text-accent-foreground" : ""
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Button
              variant="ghost"
              className="w-full justify-start p-2 h-auto"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        {user && (
          <div className="px-2 py-1 text-xs text-muted-foreground border-t">
            {user.email}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}