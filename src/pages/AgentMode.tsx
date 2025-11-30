import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AgentNavbar } from "@/components/agent/AgentNavbar";
import { AgentHero } from "@/components/agent/AgentHero";
import { AgentWorkspace } from "@/components/agent/AgentWorkspace";
import { AgentCreationDrawer } from "@/components/agent/AgentCreationDrawer";

export default function AgentMode() {
  const { user } = useAuth();
  const [isCreationDrawerOpen, setIsCreationDrawerOpen] = useState(false);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <AgentNavbar />

      {/* Hero Section */}
      <AgentHero onCreateAgent={() => setIsCreationDrawerOpen(true)} />

      {/* Workspace Section */}
      <AgentWorkspace onCreateAgent={() => setIsCreationDrawerOpen(true)} />

      {/* Creation Drawer */}
      <AgentCreationDrawer
        open={isCreationDrawerOpen}
        onOpenChange={setIsCreationDrawerOpen}
      />
    </div>
  );
}
