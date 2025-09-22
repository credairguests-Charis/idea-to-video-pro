import { useProjects } from "@/hooks/useProjects"
import { ProjectCard } from "@/components/ProjectCard"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export default function Projects() {
  const { projects, loading, deleteProject } = useProjects()

  const handleDeleteProject = async (projectId: string) => {
    if (confirm("Are you sure you want to delete this project?")) {
      await deleteProject(projectId)
    }
  }


  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Your Projects</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Your Projects</h1>
          <p className="text-muted-foreground">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No projects yet. Create your first video ad!</p>
            <Button asChild>
              <a href="/">Create New Project</a>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {projects.map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                onDelete={handleDeleteProject} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}