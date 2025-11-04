import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"

export interface Project {
  id: string
  title: string
  script: string | null
  status: string
  selected_actors: string[] | null
  aspect_ratio: string
  thumbnail_url: string | null
  generated_video_url: string | null
  folder_id: string | null
  created_at: string
  updated_at: string
  user_id: string
  omnihuman_task_ids?: string[] | null
  omnihuman_video_urls?: string[] | null
  audio_source?: string | null
  tts_settings?: any | null
  generation_status?: string | null
  generation_progress?: number | null
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  const fetchProjects = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast({
        title: "Error",
        description: "Failed to fetch projects",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createProject = async (projectData: {
    title: string
    script?: string
    selected_actors?: string[]
    aspect_ratio?: string
    audio_source?: string
    tts_settings?: any
    generation_status?: string
    generation_progress?: number
  }) => {
    if (!user) return null

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...projectData,
          user_id: user.id,
          status: 'draft',
        })
        .select()
        .single()

      if (error) throw error

      setProjects(prev => [data, ...prev])
      toast({
        title: "Success",
        description: "Project created successfully",
      })
      
      return data
    } catch (error) {
      console.error('Error creating project:', error)
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      })
      return null
    }
  }

  const updateProject = async (projectId: string, updates: Partial<Project>) => {
    if (!user) return null

    try {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error

      setProjects(prev => 
        prev.map(project => 
          project.id === projectId ? data : project
        )
      )

      toast({
        title: "Success",
        description: "Project updated successfully",
      })
      
      return data
    } catch (error) {
      console.error('Error updating project:', error)
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      })
      return null
    }
  }

  const duplicateProject = async (projectId: string) => {
    if (!user) return null

    try {
      const originalProject = projects.find(p => p.id === projectId)
      if (!originalProject) throw new Error('Project not found')

      const { data, error } = await supabase
        .from('projects')
        .insert({
          title: `${originalProject.title} (Copy)`,
          script: originalProject.script,
          selected_actors: originalProject.selected_actors,
          aspect_ratio: originalProject.aspect_ratio,
          audio_source: originalProject.audio_source,
          tts_settings: originalProject.tts_settings,
          folder_id: originalProject.folder_id,
          user_id: user.id,
          status: 'draft',
        })
        .select()
        .single()

      if (error) throw error

      setProjects(prev => [data, ...prev])
      toast({
        title: "Success",
        description: "Project duplicated successfully",
      })
      
      return data
    } catch (error) {
      console.error('Error duplicating project:', error)
      toast({
        title: "Error",
        description: "Failed to duplicate project",
        variant: "destructive",
      })
      return null
    }
  }

  const deleteProject = async (projectId: string) => {
    if (!user) return false

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', user.id)

      if (error) throw error

      setProjects(prev => prev.filter(project => project.id !== projectId))
      toast({
        title: "Success",
        description: "Project deleted successfully",
      })
      
      return true
    } catch (error) {
      console.error('Error deleting project:', error)
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      })
      return false
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [user])

  return {
    projects,
    loading,
    createProject,
    updateProject,
    duplicateProject,
    deleteProject,
    refetch: fetchProjects,
  }
}