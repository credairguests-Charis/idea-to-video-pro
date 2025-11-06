import { AdminSidebar } from "./AdminSidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { useState, useEffect } from "react";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-lg font-semibold text-foreground">Admin Dashboard</h1>
          </header>
          <main className="flex-1 p-6 md:p-8 overflow-y-auto">
            <div className="w-full max-w-[1600px] mx-auto">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
