import { useState } from "react"
import { ChevronDown, Plus, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ActorSelector } from "@/components/ActorSelector"

interface SelectedActor {
  id: string
  name: string
  thumbnail_url: string
}

export function NewProject() {
  const [script, setScript] = useState("")
  const [selectedActors, setSelectedActors] = useState<SelectedActor[]>([])
  const [showActorSelector, setShowActorSelector] = useState(false)

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
          
          {/* Selected Actors Preview */}
          {selectedActors.length > 0 && (
            <div className="flex justify-center gap-3 mb-6">
              {selectedActors.map((actor) => (
                <div key={actor.id} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-muted mb-1 overflow-hidden">
                    <img
                      src={actor.thumbnail_url}
                      alt={actor.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{actor.name}</span>
                </div>
              ))}
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
                <span>Text to Speech</span>
                <div className="w-8 h-4 bg-muted rounded-full relative">
                  <div className="w-3 h-3 bg-primary rounded-full absolute top-0.5 left-0.5"></div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Speech to Speech</span>
                <div className="w-8 h-4 bg-muted rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Script Input */}
          <div className="relative">
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

          {/* Action Buttons */}
          <div className="flex justify-center gap-3 mt-4">
            <Button variant="outline" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Script
            </Button>
            <Button className="flex items-center gap-2 bg-primary hover:bg-primary/90">
              Create Video
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