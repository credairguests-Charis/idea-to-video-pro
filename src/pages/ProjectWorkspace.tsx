import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ProjectSidebar } from "@/components/ProjectSidebar"
import { VideoLibrary } from "@/components/VideoLibrary"
import { NewProjectArcads } from "@/components/NewProjectArcads"
import { useProjects } from "@/hooks/useProjects"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function ProjectWorkspace() {
  const navigate = useNavigate()
  const { projectId } = useParams()
  const { projects, loading } = useProjects()
  const [currentProjectId, setCurrentProjectId] = useState<string | undefined>(projectId)
  const [showNewProject, setShowNewProject] = useState(false)

  useEffect(() => {
    if (projectId) {
      setCurrentProjectId(projectId)
    }
  }, [projectId])

  const handleProjectSelect = (id: string) => {
    setCurrentProjectId(id)
    navigate(`/workspace/${id}`)
  }

  const handleNewProject = () => {
    setShowNewProject(true)
  }

  const handleProjectCreated = (projectId: string) => {
    setShowNewProject(false)
    handleProjectSelect(projectId)
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
        {showNewProject ? (
          <div className="flex-1 overflow-auto">
            <div className="p-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewProject(false)}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <NewProjectArcads onProjectCreated={handleProjectCreated} />
            </div>
          </div>
        ) : currentProject ? (
          <div className="flex-1 overflow-auto">
            <VideoLibrary projectId={currentProjectId} />
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
    </div>
  )
}
