import { useState } from "react"
import { ChevronDown, Plus, Sparkles, Upload, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ActorSelector } from "@/components/ActorSelector"
import { AudioUpload } from "@/components/AudioUpload"
import { TTSControls } from "@/components/TTSControls"
import { useProjects } from "@/hooks/useProjects"
import { useToast } from "@/hooks/use-toast"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"

interface SelectedActor {
  id: string
  name: string
  thumbnail_url: string
}

export function NewProject() {
  const [title, setTitle] = useState("")
  const [script, setScript] = useState("")
  const [selectedActors, setSelectedActors] = useState<SelectedActor[]>([])
  const [showActorSelector, setShowActorSelector] = useState(false)
  const [loading, setLoading] = useState(false)
  const [audioSource, setAudioSource] = useState<'tts' | 'upload'>('tts')
  const [uploadedAudio, setUploadedAudio] = useState<File | null>(null)
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null)
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false)
  
  const { createProject } = useProjects()
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleGenerateTTS = async (voice: string, language: string) => {
    if (!script.trim()) {
      toast({
        title: "Missing Script",
        description: "Please enter a script to generate audio",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingTTS(true)
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-tts', {
        body: { 
          text: script.trim(), 
          voice, 
          language,
          projectId: 'temp-' + Date.now() // Temporary ID for TTS generation
        }
      })

      if (error) throw error

      if (data.success) {
        setGeneratedAudioUrl(data.audioUrl)
        setAudioSource('tts')
        toast({
          title: "Audio Generated",
          description: "Your script has been converted to audio",
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('TTS generation error:', error)
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate audio from script",
        variant: "destructive",
      })
    }
    
    setIsGeneratingTTS(false)
  }

  const handleAudioSelected = (audioFile: File, duration: number) => {
    setUploadedAudio(audioFile)
    setAudioSource('upload')
    setGeneratedAudioUrl(null)
  }

  const handleAudioRemoved = () => {
    setUploadedAudio(null)
    setGeneratedAudioUrl(null)
  }

  const handleCreateProject = async () => {
    // Check if user is paused
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('paused')
          .eq('user_id', user.id)
          .single();

        if (profileError) throw profileError;

        if (profile?.paused) {
          toast({
            title: "Account Paused",
            description: "Your account has been paused by an administrator. Please contact support to reactivate your account.",
            variant: "destructive",
          });
          return;
        }
      }
    } catch (error) {
      console.error('Error checking user status:', error);
    }

    if (!title.trim() && !script.trim()) {
      toast({
        title: "Missing Information",
        description: "Please add a title or script for your project",
        variant: "destructive",
      })
      return
    }

    if (selectedActors.length === 0) {
      toast({
        title: "No Actors Selected",
        description: "Please select at least one actor for your video",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    
    try {
      const projectData = {
        title: title.trim() || "Untitled Project",
        script: script.trim() || "",
        selected_actors: selectedActors.map(actor => actor.id),
        aspect_ratio: "portrait",
        audio_source: audioSource,
        generation_status: 'pending',
        generation_progress: 0,
      }

      const project = await createProject(projectData)
      
      if (project) {
        // Handle audio processing and OmniHuman generation
        let audioUrl = generatedAudioUrl

        if (audioSource === 'upload' && uploadedAudio) {
          // Upload audio file
          const reader = new FileReader()
          reader.onload = async () => {
            const base64Audio = reader.result?.toString().split(',')[1]
            if (base64Audio) {
              const { data, error } = await supabase.functions.invoke('upload-audio', {
                body: {
                  audioData: base64Audio,
                  fileName: uploadedAudio.name,
                  projectId: project.id,
                  duration: 0 // Will be calculated server-side
                }
              })

              if (!error && data.success) {
                audioUrl = data.audioUrl
                await startOmniHumanGeneration(project.id, audioUrl)
              }
            }
          }
          reader.readAsDataURL(uploadedAudio)
        } else if (audioSource === 'tts' && script.trim()) {
          // Generate TTS for the actual project
          const { data, error } = await supabase.functions.invoke('generate-tts', {
            body: { 
              text: script.trim(), 
              voice: 'alloy', // Default voice, could be made configurable
              language: 'en-US', // Default language, could be made configurable
              projectId: project.id
            }
          })

          if (!error && data.success) {
            audioUrl = data.audioUrl
            await startOmniHumanGeneration(project.id, audioUrl)
          }
        }

        // Navigate to projects page
        navigate("/projects")
      }
    } catch (error) {
      console.error('Project creation error:', error)
      toast({
        title: "Creation Failed",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      })
    }
    
    setLoading(false)
  }

  const startOmniHumanGeneration = async (projectId: string, audioUrl: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-omnihuman', {
        body: {
          projectId,
          actorIds: selectedActors.map(actor => actor.id),
          audioUrl
        }
      })

      if (error) {
        console.error('OmniHuman generation error:', error)
        toast({
          title: "Generation Started",
          description: "Your project was created but video generation encountered an issue",
          variant: "destructive",
        })
      } else if (data.success) {
        toast({
          title: "Generation Started",
          description: `Started generating videos for ${data.generations.length} actor(s)`,
        })
      }
    } catch (error) {
      console.error('Error starting OmniHuman generation:', error)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="w-full max-w-2xl text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Generate winning assets
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Turn your ideas into high-converting video ads with AI actors
          </p>
          
          {/* Project Title Input */}
          <div className="mb-6">
            <Label htmlFor="project-title" className="sr-only">Project Title</Label>
            <Input
              id="project-title"
              placeholder="Enter project title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-center text-lg"
            />
          </div>
          
          {/* Selected Actors Preview - TikTok Style */}
          {selectedActors.length > 0 && (
            <div className="flex justify-center gap-4 mb-8">
              {selectedActors.slice(0, 3).map((actor) => (
                <div key={actor.id} className="text-center">
                  <div className="w-16 h-20 rounded-lg bg-muted mb-2 overflow-hidden border-2 border-primary/20 shadow-lg">
                    <img
                      src={actor.thumbnail_url}
                      alt={actor.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-xs font-medium text-foreground">{actor.name}</span>
                </div>
              ))}
              {selectedActors.length > 3 && (
                <div className="text-center">
                  <div className="w-16 h-20 rounded-lg bg-muted mb-2 overflow-hidden border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">+{selectedActors.length - 3}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">more</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Input Section */}
      <div className="border-t border-border bg-card/50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Controls Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setShowActorSelector(true)}
                className="flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-primary" />
                </div>
                Talking Actors
                <ChevronDown className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowActorSelector(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add actors
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>AI Generation</span>
                <div className="w-8 h-4 bg-primary rounded-full relative">
                  <div className="w-3 h-3 bg-background rounded-full absolute top-0.5 right-0.5"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Script Input */}
          <div className="relative mb-6">
            <Textarea
              placeholder="Enter your script or describe your video idea..."
              value={script}
              onChange={(e) => setScript(e.target.value)}
              className="min-h-[120px] resize-none text-base"
            />
            <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
              {script.length}/2000
            </div>
          </div>

          {/* Audio Source Selection */}
          <div className="mb-6">
            <Tabs value={audioSource} onValueChange={(value) => setAudioSource(value as 'tts' | 'upload')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tts" className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Text-to-Speech
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Audio
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="tts" className="mt-4">
                <TTSControls 
                  onGenerate={handleGenerateTTS}
                  disabled={loading || !script.trim()}
                  isGenerating={isGeneratingTTS}
                />
                {generatedAudioUrl && (
                  <div className="mt-3 p-3 bg-primary/10 rounded-lg">
                    <p className="text-sm text-foreground">✓ Audio generated from script</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="upload" className="mt-4">
                <AudioUpload 
                  onAudioSelected={handleAudioSelected}
                  onAudioRemoved={handleAudioRemoved}
                  disabled={loading}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-3">
            <Button variant="outline" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Script
            </Button>
            <Button 
              className="flex items-center gap-2 bg-primary hover:bg-primary/90"
              onClick={handleCreateProject}
              disabled={loading || selectedActors.length === 0 || (!script.trim() && !uploadedAudio && !generatedAudioUrl)}
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Actor Selection Modal */}
      {showActorSelector && (
        <ActorSelector
          onClose={() => setShowActorSelector(false)}
          onSelectActors={setSelectedActors}
          selectedActors={selectedActors}
        />
      )}
    </div>
  )
}