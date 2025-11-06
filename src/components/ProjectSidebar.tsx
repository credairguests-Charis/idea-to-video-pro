import { useState, useEffect, useCallback, useRef } from "react"
import { ChevronRight, ChevronDown, FolderOpen, Folder, Plus, MoreVertical, Edit2, Copy, Trash2, Settings, LogOut, FolderPlus } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
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
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { folders, createFolder, renameFolder, deleteFolder } = useFolders()
  const { projects, updateProject, duplicateProject, deleteProject } = useProjects()
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [newFolderDialog, setNewFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [renamingItem, setRenamingItem] = useState<{ id: string; type: 'folder' | 'project'; name: string } | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [deletingFolder, setDeletingFolder] = useState<{ id: string; name: string } | null>(null)
  const [displayedProjects, setDisplayedProjects] = useState(20)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [movingToFolder, setMovingToFolder] = useState<{ id: string; name: string } | null>(null)
  const [selectedProjectsToMove, setSelectedProjectsToMove] = useState<Set<string>>(new Set())

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

  const handleDeleteFolder = async (folderId: string) => {
    const folderProjects = projects.filter(p => p.folder_id === folderId)
    
    if (folderProjects.length > 0) {
      // Show confirmation dialog if folder has projects
      const folder = folders.find(f => f.id === folderId)
      if (folder) {
        setDeletingFolder({ id: folderId, name: folder.name })
        return
      }
    }
    
    // No projects, delete directly
    await deleteFolder(folderId)
  }

  const confirmDeleteFolder = async () => {
    if (!deletingFolder) return

    // Delete all projects in the folder first
    const folderProjects = projects.filter(p => p.folder_id === deletingFolder.id)
    for (const project of folderProjects) {
      await deleteProject(project.id)
    }

    // Then delete the folder
    await deleteFolder(deletingFolder.id)
    setDeletingFolder(null)
  }

  const handleMoveProjectsToFolder = () => {
    if (!movingToFolder) return
    
    selectedProjectsToMove.forEach(projectId => {
      handleMoveToFolder(projectId, movingToFolder.id)
    })
    
    setMovingToFolder(null)
    setSelectedProjectsToMove(new Set())
  }

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjectsToMove(prev => {
      const newSet = new Set(prev)
      if (newSet.has(projectId)) {
        newSet.delete(projectId)
      } else {
        newSet.add(projectId)
      }
      return newSet
    })
  }

  // Infinite scroll handler
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const bottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100
    
    if (bottom && displayedProjects < projects.length) {
      setDisplayedProjects(prev => Math.min(prev + 20, projects.length))
    }
  }, [displayedProjects, projects.length])

  const standaloneProjects = projects.filter(p => !p.folder_id).slice(0, displayedProjects)

  return (
    <div className="flex flex-col h-full bg-sidebar border-r">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">S</span>
          </div>
          <span className="font-semibold text-foreground">SmartUGC</span>
        </div>
        <div className="space-y-2">
          <Button 
            onClick={onNewProject} 
            className="w-full justify-start rounded-lg h-10 bg-background hover:bg-accent text-foreground shadow-none border" 
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
          <Button 
            onClick={() => setNewFolderDialog(true)} 
            variant="ghost" 
            className="w-full justify-start rounded-lg h-9" 
            size="sm"
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            New Folder
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1" onScrollCapture={handleScroll}>
        <div className="p-2 space-y-0.5" ref={scrollRef}>
          {/* Folders */}
          {folders.map(folder => {
            const folderProjects = projects.filter(p => p.folder_id === folder.id)
            const isExpanded = expandedFolders.has(folder.id)

            return (
              <div key={folder.id} className="space-y-0.5">
                <div className="relative group flex items-center rounded-md mx-2 my-0.5 hover:bg-accent/50 transition-colors">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 justify-start px-3 h-10 hover:bg-transparent"
                    onClick={() => toggleFolder(folder.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 mr-1.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-1.5 shrink-0 text-muted-foreground" />
                    )}
                    {isExpanded ? (
                      <FolderOpen className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
                    ) : (
                      <Folder className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate text-sm font-medium">{folder.name}</span>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 h-8 w-8 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-50 w-48 bg-popover text-popover-foreground border border-border shadow-md">
                      <DropdownMenuItem
                        onClick={() => {
                          setMovingToFolder({ id: folder.id, name: folder.name })
                          setSelectedProjectsToMove(new Set())
                        }}
                      >
                        <FolderPlus className="h-4 w-4 mr-2" />
                        Move Projects Here
                      </DropdownMenuItem>
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
                        onClick={() => handleDeleteFolder(folder.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {isExpanded && (
                  <div className="ml-8 space-y-0.5">
                    {folderProjects.map(project => (
                        <div key={project.id} className="relative group flex items-center rounded-md hover:bg-accent/50 transition-colors mx-2 my-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "flex-1 justify-start px-3 h-10 hover:bg-transparent text-left pr-10",
                            currentProjectId === project.id && "bg-muted hover:bg-muted"
                          )}
                          onClick={() => onProjectSelect(project.id)}
                        >
                          <span className="text-sm truncate">{project.title}</span>
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                             <Button variant="ghost" size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 h-8 w-8 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="z-50 w-48 bg-popover text-popover-foreground border border-border shadow-md">
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
            <div key={project.id} className="relative group flex items-center rounded-md hover:bg-accent/50 transition-colors mx-2 my-0.5">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex-1 justify-start px-3 h-10 hover:bg-transparent text-left pr-10",
                  currentProjectId === project.id && "bg-muted hover:bg-muted"
                )}
                onClick={() => onProjectSelect(project.id)}
              >
                <span className="truncate text-sm">{project.title}</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 h-8 w-8 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-50 w-48 bg-popover text-popover-foreground border border-border shadow-md">
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
                      <DropdownMenuItem disabled className="text-xs text-muted-foreground pointer-events-none">
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

      {/* Footer with user info and actions */}
      <div className="p-3 border-t mt-auto bg-sidebar space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-accent/50 h-9"
          onClick={() => navigate('/app/settings')}
          size="sm"
        >
          <Settings className="h-4 w-4" />
          <span className="text-sm">Settings</span>
        </Button>
        {user && (
          <div className="flex items-center gap-2 px-2">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground truncate">
                {user.email}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => signOut()}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

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

      {/* Delete Folder Confirmation */}
      <AlertDialog open={!!deletingFolder} onOpenChange={() => setDeletingFolder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the folder "{deletingFolder?.name}" and all {projects.filter(p => p.folder_id === deletingFolder?.id).length} project(s) inside it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFolder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move Projects to Folder Dialog */}
      <Dialog open={!!movingToFolder} onOpenChange={() => setMovingToFolder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Move Projects to "{movingToFolder?.name}"</DialogTitle>
            <DialogDescription>
              Select projects to move into this folder
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-2">
              {standaloneProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No projects available to move
                </p>
              ) : (
                standaloneProjects.map(project => (
                  <div
                    key={project.id}
                    onClick={() => toggleProjectSelection(project.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedProjectsToMove.has(project.id)
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-accent"
                    )}
                  >
                    <div className={cn(
                      "h-4 w-4 rounded border-2 flex items-center justify-center shrink-0",
                      selectedProjectsToMove.has(project.id)
                        ? "bg-primary border-primary"
                        : "border-muted-foreground"
                    )}>
                      {selectedProjectsToMove.has(project.id) && (
                        <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm flex-1 truncate">{project.title}</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovingToFolder(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleMoveProjectsToFolder}
              disabled={selectedProjectsToMove.size === 0}
            >
              Move {selectedProjectsToMove.size > 0 && `(${selectedProjectsToMove.size})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
