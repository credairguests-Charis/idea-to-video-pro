import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ProjectSidebar } from "@/components/ProjectSidebar"
import { VideoLibrary } from "@/components/VideoLibrary"
import { NewProjectArcads } from "@/components/NewProjectArcads"
import { VideoGenerationTracker } from "@/components/VideoGenerationTracker"
import { useProjects } from "@/hooks/useProjects"
import { Button } from "@/components/ui/button"

export default function ProjectWorkspace() {
  const navigate = useNavigate()
  const { projectId } = useParams()
  const { projects, loading, createProject } = useProjects()
  const [currentProjectId, setCurrentProjectId] = useState<string | undefined>(projectId)
  const [viewMode, setViewMode] = useState<"generate" | "library">("library")
  useEffect(() => {
    if (projectId) {
      setCurrentProjectId(projectId)
    }
  }, [projectId])

  const handleProjectSelect = (id: string) => {
    setCurrentProjectId(id)
    setViewMode("library")
    navigate(`/app/workspace/${id}`)
  }

  const handleNewProject = async () => {
    // Create a new project first
    const newProject = await createProject({
      title: 'Untitled Project',
      aspect_ratio: 'portrait',
    })
    
    if (newProject) {
      setCurrentProjectId(newProject.id)
      setViewMode("generate")
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
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0">
        <ProjectSidebar
          currentProjectId={currentProjectId}
          onProjectSelect={handleProjectSelect}
          onNewProject={handleNewProject}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentProject ? (
          <div className="flex-1 overflow-auto">
            <div className="p-6 space-y-8">
              {/* Project Header */}
              <div>
                <h1 className="text-2xl font-bold">{currentProject.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Generate and manage videos in this project
                </p>
              </div>

              {/* Video Generation Interface */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Generate New Video</h2>
                <NewProjectArcads projectId={currentProjectId} mode={viewMode} />
              </div>

              {/* Existing Videos */}
              {viewMode !== "library" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Project Videos</h2>
                  <VideoLibrary projectId={currentProjectId} />
                </div>
              )}
            </div>
          </div>
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
    </div>
  )
}
