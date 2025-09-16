import { useState, useEffect } from "react"
import { X, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/integrations/supabase/client"

interface Actor {
  id: string
  name: string
  gender: string
  age_group: string
  ethnicity: string
  accent: string
  emotions: string[]
  scenarios: string[]
  thumbnail_url: string
  is_premium: boolean
}

interface ActorSelectorProps {
  onClose: () => void
  onSelectActors: (actors: Array<{ id: string; name: string; thumbnail_url: string }>) => void
  selectedActors: Array<{ id: string; name: string; thumbnail_url: string }>
}

const filterCategories = [
  "All AI Actors",
  "My Cloned Actors", 
  "Gender",
  "Age",
  "Ethnicity",
  "Accent",
  "Emotions",
  "Scenarios"
]

export function ActorSelector({ onClose, onSelectActors, selectedActors }: ActorSelectorProps) {
  const [actors, setActors] = useState<Actor[]>([])
  const [filteredActors, setFilteredActors] = useState<Actor[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFilter, setSelectedFilter] = useState("All AI Actors")
  const [selectedActorIds, setSelectedActorIds] = useState<Set<string>>(
    new Set(selectedActors.map(a => a.id))
  )

  useEffect(() => {
    fetchActors()
  }, [])

  useEffect(() => {
    let filtered = actors

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(actor =>
        actor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        actor.emotions.some(emotion => emotion.toLowerCase().includes(searchTerm.toLowerCase())) ||
        actor.scenarios.some(scenario => scenario.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Apply category filter
    switch (selectedFilter) {
      case "Gender":
        // Group by gender - for now just show all
        break
      case "My Cloned Actors":
        filtered = filtered.filter(actor => actor.is_premium)
        break
      default:
        // All AI Actors - show all
        break
    }

    setFilteredActors(filtered)
  }, [actors, searchTerm, selectedFilter])

  const fetchActors = async () => {
    const { data, error } = await supabase
      .from('actors')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching actors:', error)
      return
    }

    setActors(data || [])
  }

  const toggleActorSelection = (actor: Actor) => {
    const newSelectedIds = new Set(selectedActorIds)
    
    if (newSelectedIds.has(actor.id)) {
      newSelectedIds.delete(actor.id)
    } else {
      newSelectedIds.add(actor.id)
    }
    
    setSelectedActorIds(newSelectedIds)
  }

  const handleConfirmSelection = () => {
    const selected = actors
      .filter(actor => selectedActorIds.has(actor.id))
      .map(actor => ({
        id: actor.id,
        name: actor.name,
        thumbnail_url: actor.thumbnail_url
      }))
    
    onSelectActors(selected)
    onClose()
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[80vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-semibold">Select AI Actors</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Filters */}
          <div className="w-64 border-r border-border bg-muted/20 p-4">
            <div className="space-y-2">
              {filterCategories.map((category) => (
                <Button
                  key={category}
                  variant={selectedFilter === category ? "secondary" : "ghost"}
                  className="w-full justify-start text-sm"
                  onClick={() => setSelectedFilter(category)}
                >
                  {category}
                </Button>
              ))}
            </div>

            {/* Filter Tags */}
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-3">Quick Filters</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">Male</Badge>
                <Badge variant="outline" className="text-xs">Female</Badge>
                <Badge variant="outline" className="text-xs">20-30</Badge>
                <Badge variant="outline" className="text-xs">30-40</Badge>
                <Badge variant="outline" className="text-xs">Professional</Badge>
              </div>
            </div>
          </div>

          {/* Right Content - Actor Grid */}
          <div className="flex-1 flex flex-col">
            {/* Search Bar */}
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search actors by name, emotion, or scenario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {selectedActorIds.size > 0 && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {selectedActorIds.size} actor{selectedActorIds.size > 1 ? 's' : ''} selected
                  </span>
                  <Button onClick={handleConfirmSelection} size="sm">
                    Confirm Selection
                  </Button>
                </div>
              )}
            </div>

            {/* Actor Grid */}
            <div className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-4 gap-4">
                {filteredActors.map((actor) => (
                  <div
                    key={actor.id}
                    className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all ${
                      selectedActorIds.has(actor.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent bg-card hover:border-border'
                    }`}
                    onClick={() => toggleActorSelection(actor)}
                  >
                    {/* Actor Image */}
                    <div className="aspect-square rounded-lg bg-muted mb-3 overflow-hidden">
                      <img
                        src={actor.thumbnail_url}
                        alt={actor.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.svg'
                        }}
                      />
                    </div>
                    
                    {/* Actor Info */}
                    <h4 className="font-medium text-sm mb-1">{actor.name}</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      {actor.gender} • {actor.age_group}
                    </p>
                    
                    {/* Emotions/Scenarios Tags */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {actor.emotions.slice(0, 2).map((emotion) => (
                        <Badge key={emotion} variant="outline" className="text-xs py-0">
                          {emotion}
                        </Badge>
                      ))}
                    </div>
                    
                    {actor.is_premium && (
                      <Badge className="absolute top-2 right-2 text-xs bg-amber-500 hover:bg-amber-600">
                        Premium
                      </Badge>
                    )}
                    
                    {selectedActorIds.has(actor.id) && (
                      <div className="absolute inset-0 bg-primary/10 rounded-lg flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          ✓
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}