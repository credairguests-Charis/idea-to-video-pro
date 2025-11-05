import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Video, Folder, Settings, Plus, Search, LogOut } from "lucide-react";
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
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  
  const { user, signOut } = useAuth();
  const { folders, createFolder } = useFolders();
  const { projects, createProject } = useProjects();
  const { toast } = useToast();

  const navigation = [
    {
      name: "New project",
      href: "/",
      icon: Plus,
      current: location.pathname === "/",
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
    // Title will be auto-generated from script when user enters it
    const result = await createProject({
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
      <div className="w-[240px] bg-card border-r border-border flex flex-col">
        {/* Header with Logo */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
              <span className="text-background font-bold text-sm">S</span>
            </div>
            <span className="font-semibold text-foreground">SMART...</span>
          </div>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300">
          <ul className="space-y-1 mb-8">
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
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Folders Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">Folders</h3>
              <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-accent">
                    <Plus className="w-4 h-4" />
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
              {folders.length > 0 ? (
                folders.map((folder) => (
                  <li key={folder.id}>
                    <NavLink
                      to={`/folders`}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    >
                      <Folder className="w-4 h-4" />
                      {folder.name}
                    </NavLink>
                  </li>
                ))
              ) : (
                <li>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground">
                    <Folder className="w-4 h-4" />
                    New Folder
                  </div>
                </li>
              )}
            </ul>
          </div>

          {/* Projects Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">Projects</h3>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-accent" onClick={handleCreateProject}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <ul className="space-y-1">
              {projects.length > 0 ? (
                projects.slice(0, 3).map((project) => (
                  <li key={project.id}>
                    <NavLink
                      to="/projects"
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    >
                      <div className="w-4 h-4 bg-muted rounded" />
                      <span className="truncate">{project.title}</span>
                    </NavLink>
                  </li>
                ))
              ) : (
                <li>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground">
                    <div className="w-4 h-4 bg-muted rounded" />
                    New Project
                  </div>
                </li>
              )}
            </ul>
          </div>
        </nav>

        {/* Footer with Sign Out - pinned to bottom */}
        <div className="p-4 border-t border-border mt-auto sticky bottom-0 bg-card">
          {user && (
            <div className="mb-2 text-xs text-muted-foreground truncate">
              {user.email}
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}