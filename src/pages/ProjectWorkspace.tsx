import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ProjectSidebar } from "@/components/ProjectSidebar"
import { VideoLibrary } from "@/components/VideoLibrary"
import { NewProjectArcads } from "@/components/NewProjectArcads"
import { VideoGenerationTracker } from "@/components/VideoGenerationTracker"
import { WelcomeDialog } from "@/components/onboarding/WelcomeDialog"
import { useProjects } from "@/hooks/useProjects"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import Settings from "./Settings"

interface ProjectWorkspaceProps {
  settingsMode?: boolean
}

export default function ProjectWorkspace({ settingsMode = false }: ProjectWorkspaceProps) {
  const navigate = useNavigate()
  const { projectId } = useParams()
  const { projects, loading, createProject } = useProjects()
  const [currentProjectId, setCurrentProjectId] = useState<string | undefined>(projectId)
  const [viewMode, setViewMode] = useState<'generate' | 'library'>('generate')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (projectId) {
      setCurrentProjectId(projectId)
      setViewMode('library')
    } else {
      setViewMode('generate')
    }
  }, [projectId])

  const handleProjectSelect = (id: string) => {
    setCurrentProjectId(id)
    setViewMode('library')
    navigate(`/app/workspace/${id}`)
    setMobileMenuOpen(false) // Close mobile menu on selection
  }

  const handleNewProject = async () => {
    // Create a new project first (title will be auto-generated from script when user enters it)
    const newProject = await createProject({
      aspect_ratio: 'portrait',
    })
    
    if (newProject) {
      setCurrentProjectId(newProject.id)
      setViewMode('generate')
      navigate(`/app/workspace/${newProject.id}`)
    }
  }

  const handleProjectCreated = (projectId: string) => {
    // Not needed anymore since we're on the same page
  }

  const currentProject = projects.find(p => p.id === currentProjectId)

  if (loading) {
    return (
      <div className="flex h-screen">
        <div className="w-64 border-r bg-sidebar animate-pulse" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading projects...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile Menu Button */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="md:hidden fixed top-4 left-4 z-50 bg-white shadow-md"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <ProjectSidebar
            currentProjectId={currentProjectId}
            onProjectSelect={handleProjectSelect}
            onNewProject={handleNewProject}
          />
        </SheetContent>
      </Sheet>

      {/* Sidebar - Hidden on mobile, visible on md and up */}
      <div className="hidden md:block flex-shrink-0">
        <ProjectSidebar
          currentProjectId={currentProjectId}
          onProjectSelect={handleProjectSelect}
          onNewProject={handleNewProject}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {settingsMode ? (
          <Settings />
        ) : currentProject ? (
          <NewProjectArcads projectId={currentProjectId} mode={viewMode} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-semibold text-muted-foreground">
                No project selected
              </h2>
              <p className="text-sm text-muted-foreground">
                Select a project from the sidebar or create a new one
              </p>
              <Button onClick={handleNewProject}>
                Create New Project
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Global Video Generation Tracker */}
      <VideoGenerationTracker />
      
      {/* Onboarding Welcome Dialog */}
      <WelcomeDialog />
    </div>
  )
}
