import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"

export interface Folder {
  id: string
  name: string
  user_id: string
  parent_id: string | null
  created_at: string
}

export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  const fetchFolders = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true })

      if (error) throw error
      setFolders(data || [])
    } catch (error) {
      console.error('Error fetching folders:', error)
      toast({
        title: "Error",
        description: "Failed to fetch folders",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createFolder = async (name: string, parentId?: string) => {
    if (!user) return null

    try {
      const { data, error } = await supabase
        .from('folders')
        .insert({
          name,
          user_id: user.id,
          parent_id: parentId || null,
        })
        .select()
        .single()

      if (error) throw error

      setFolders(prev => [...prev, data])
      toast({
        title: "Success",
        description: "Folder created successfully",
      })
      
      return data
    } catch (error) {
      console.error('Error creating folder:', error)
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive",
      })
      return null
    }
  }

  const deleteFolder = async (folderId: string) => {
    if (!user) return false

    try {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId)
        .eq('user_id', user.id)

      if (error) throw error

      setFolders(prev => prev.filter(folder => folder.id !== folderId))
      toast({
        title: "Success",
        description: "Folder deleted successfully",
      })
      
      return true
    } catch (error) {
      console.error('Error deleting folder:', error)
      toast({
        title: "Error",
        description: "Failed to delete folder",
        variant: "destructive",
      })
      return false
    }
  }

  useEffect(() => {
    fetchFolders()
  }, [user])

  return {
    folders,
    loading,
    createFolder,
    deleteFolder,
    refetch: fetchFolders,
  }
}