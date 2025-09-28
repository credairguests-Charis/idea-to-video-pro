import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Video, Folder, Settings, Plus, Search, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useFolders } from "@/hooks/useFolders";
import { useProjects } from "@/hooks/useProjects";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ArcadsLayoutProps {
  children: React.ReactNode;
}

export function ArcadsLayout({ children }: ArcadsLayoutProps) {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  
  const { user, signOut } = useAuth();
  const { folders, createFolder } = useFolders();
  const { projects, createProject } = useProjects();
  const { toast } = useToast();

  const navigation = [
    {
      name: "New Project",
      href: "/",
      icon: Home,
      current: location.pathname === "/",
    },
    {
      name: "Projects",
      href: "/projects",
      icon: Video,
      current: location.pathname === "/projects",
    },
    {
      name: "Folders",
      href: "/folders",
      icon: Folder,
      current: location.pathname === "/folders",
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      current: location.pathname === "/settings",
    },
  ];

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    setIsCreatingFolder(true);
    const result = await createFolder(newFolderName);
    
    if (result) {
      setNewFolderName("");
      setShowFolderDialog(false);
    }
    setIsCreatingFolder(false);
  };

  const handleCreateProject = async () => {
    const result = await createProject({
      title: "Untitled Project",
      script: ""
    });
    
    if (result) {
      toast({
        title: "Success",
        description: "New project created successfully",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={cn("bg-card border-r border-border flex flex-col transition-all duration-300", isCollapsed ? "w-16" : "w-64")}>
        {/* Header with Logo and Collapse Button */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">A</span>
              </div>
              {!isCollapsed && <span className="font-semibold text-foreground">Arcads</span>}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 p-0"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Search */}
        {!isCollapsed && (
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4">
          <div className={cn("mb-4", !isCollapsed && "block", isCollapsed && "hidden")}>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Navigation</h3>
          </div>
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )
                  }
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {!isCollapsed && <span>{item.name}</span>}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Folders Section */}
          {!isCollapsed && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-muted-foreground">Folders</h3>
                <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Plus className="w-3 h-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Create New Folder</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="folder-name" className="text-right">
                          Name
                        </Label>
                        <Input
                          id="folder-name"
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          className="col-span-3"
                          placeholder="Enter folder name"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCreateFolder();
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowFolderDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateFolder} disabled={isCreatingFolder || !newFolderName.trim()}>
                        {isCreatingFolder ? "Creating..." : "Create"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <ul className="space-y-1">
                {folders.map((folder) => (
                  <li key={folder.id}>
                    <NavLink
                      to={`/folders/${folder.id}`}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-accent/50"
                    >
                      <Folder className="w-4 h-4" />
                      {folder.name}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Projects Section */}
          {!isCollapsed && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-muted-foreground">Recent Projects</h3>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCreateProject}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <ul className="space-y-1">
                {projects.slice(0, 3).map((project) => (
                  <li key={project.id}>
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent/50">
                      <div className="w-4 h-4 bg-muted rounded" />
                      <span className="text-sm text-muted-foreground truncate">{project.title}</span>
                    </div>
                  </li>
                ))}
                {projects.length === 0 && (
                  <li>
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
                      <div className="w-4 h-4 bg-muted rounded" />
                      <span className="text-sm text-muted-foreground">No projects yet</span>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          )}
        </nav>

        {/* Footer with Sign Out */}
        <div className="p-4 border-t border-border">
          {!isCollapsed && user && (
            <div className="mb-2 text-xs text-muted-foreground truncate">
              {user.email}
            </div>
          )}
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-2 text-muted-foreground hover:text-foreground",
              isCollapsed && "justify-center px-2"
            )}
            onClick={handleSignOut}
            title={isCollapsed ? "Sign Out" : undefined}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-card px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-semibold text-foreground">
              {navigation.find(item => item.current)?.name || "New Project"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              New folder
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}