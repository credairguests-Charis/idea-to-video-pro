import { useState, useEffect } from "react"
import { ChevronRight, ChevronDown, FolderOpen, Folder, FileText, Plus, MoreVertical, Edit2, Copy, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useFolders } from "@/hooks/useFolders"
import { useProjects } from "@/hooks/useProjects"
import { cn } from "@/lib/utils"

interface ProjectSidebarProps {
  currentProjectId?: string
  onProjectSelect: (projectId: string) => void
  onNewProject: () => void
}

export function ProjectSidebar({ currentProjectId, onProjectSelect, onNewProject }: ProjectSidebarProps) {
  const { folders, createFolder, renameFolder, deleteFolder } = useFolders()
  const { projects, updateProject, duplicateProject, deleteProject } = useProjects()
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [newFolderDialog, setNewFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [renamingItem, setRenamingItem] = useState<{ id: string; type: 'folder' | 'project'; name: string } | null>(null)
  const [renameValue, setRenameValue] = useState("")

  // Auto-expand folder containing current project
  useEffect(() => {
    if (currentProjectId) {
      const currentProject = projects.find(p => p.id === currentProjectId)
      if (currentProject?.folder_id) {
        setExpandedFolders(prev => new Set(prev).add(currentProject.folder_id!))
      }
    }
  }, [currentProjectId, projects])

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      await createFolder(newFolderName.trim())
      setNewFolderName("")
      setNewFolderDialog(false)
    }
  }

  const handleRename = async () => {
    if (!renamingItem || !renameValue.trim()) return

    if (renamingItem.type === 'folder') {
      await renameFolder(renamingItem.id, renameValue.trim())
    } else {
      await updateProject(renamingItem.id, { title: renameValue.trim() })
    }
    setRenamingItem(null)
    setRenameValue("")
  }

  const handleDuplicate = async (projectId: string) => {
    const newProject = await duplicateProject(projectId)
    if (newProject) {
      onProjectSelect(newProject.id)
    }
  }

  const handleMoveToFolder = async (projectId: string, folderId: string | null) => {
    await updateProject(projectId, { folder_id: folderId })
  }

  const standaloneProjects = projects.filter(p => !p.folder_id)

  return (
    <div className="flex flex-col h-full bg-sidebar border-r">
      <div className="p-4 border-b space-y-2">
        <Button onClick={onNewProject} className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
        <Button onClick={() => setNewFolderDialog(true)} variant="outline" className="w-full" size="sm">
          <FolderOpen className="h-4 w-4 mr-2" />
          New Folder
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Folders */}
          {folders.map(folder => {
            const folderProjects = projects.filter(p => p.folder_id === folder.id)
            const isExpanded = expandedFolders.has(folder.id)

            return (
              <div key={folder.id} className="space-y-1">
                <div className="flex items-center gap-1 group">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 justify-start px-2 h-8"
                    onClick={() => toggleFolder(folder.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 mr-1 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-1 shrink-0" />
                    )}
                    {isExpanded ? (
                      <FolderOpen className="h-4 w-4 mr-2 shrink-0" />
                    ) : (
                      <Folder className="h-4 w-4 mr-2 shrink-0" />
                    )}
                    <span className="truncate text-sm">{folder.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {folderProjects.length}
                    </span>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setRenamingItem({ id: folder.id, type: 'folder', name: folder.name })
                          setRenameValue(folder.name)
                        }}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteFolder(folder.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {isExpanded && (
                  <div className="ml-6 space-y-1">
                    {folderProjects.map(project => (
                      <div key={project.id} className="flex items-center gap-1 group">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "flex-1 justify-start px-2 h-8",
                            currentProjectId === project.id && "bg-accent"
                          )}
                          onClick={() => onProjectSelect(project.id)}
                        >
                          <FileText className="h-4 w-4 mr-2 shrink-0" />
                          <span className="truncate text-sm">{project.title}</span>
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setRenamingItem({ id: project.id, type: 'project', name: project.title })
                                setRenameValue(project.title)
                              }}
                            >
                              <Edit2 className="h-4 w-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(project.id)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleMoveToFolder(project.id, null)}>
                              <FolderOpen className="h-4 w-4 mr-2" />
                              Remove from folder
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteProject(project.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Standalone Projects */}
          {standaloneProjects.map(project => (
            <div key={project.id} className="flex items-center gap-1 group">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex-1 justify-start px-2 h-8",
                  currentProjectId === project.id && "bg-accent"
                )}
                onClick={() => onProjectSelect(project.id)}
              >
                <FileText className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate text-sm">{project.title}</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setRenamingItem({ id: project.id, type: 'project', name: project.title })
                      setRenameValue(project.title)
                    }}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicate(project.id)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  {folders.length > 0 && (
                    <>
                      <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                        Move to folder:
                      </DropdownMenuItem>
                      {folders.map(folder => (
                        <DropdownMenuItem
                          key={folder.id}
                          onClick={() => handleMoveToFolder(project.id, folder.id)}
                          className="pl-6"
                        >
                          <Folder className="h-4 w-4 mr-2" />
                          {folder.name}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={() => deleteProject(project.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* New Folder Dialog */}
      <Dialog open={newFolderDialog} onOpenChange={setNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>Enter a name for your new folder</DialogDescription>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renamingItem} onOpenChange={() => setRenamingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {renamingItem?.type}</DialogTitle>
            <DialogDescription>
              Enter a new name for this {renamingItem?.type}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="New name"
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
