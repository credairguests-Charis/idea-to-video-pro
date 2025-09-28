import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Folder, Settings, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ArcadsLayoutProps {
  children: React.ReactNode;
}

export function ArcadsLayout({ children }: ArcadsLayoutProps) {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

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

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border flex flex-col">
        {/* Logo/Brand */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">S</span>
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
              className="pl-10"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4">
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
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Folders Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">Folders</h3>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <ul className="space-y-1">
              <li>
                <Button variant="ghost" className="w-full justify-start gap-3 px-3 py-2 h-auto font-normal">
                  <Folder className="w-4 h-4" />
                  New Folder
                </Button>
              </li>
            </ul>
          </div>

          {/* Projects Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">Projects</h3>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <ul className="space-y-1">
              <li>
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
                  <div className="w-4 h-4 bg-muted rounded" />
                  <span className="text-sm text-muted-foreground">New Project</span>
                </div>
              </li>
            </ul>
          </div>
        </nav>
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