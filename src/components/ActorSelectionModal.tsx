import { useState, useEffect } from "react";
import { X, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Actor {
  id: string;
  name: string;
  thumbnail_url: string;
  is_premium: boolean;
  gender: string;
  age_group: string;
}

interface SelectedActor {
  id: string;
  name: string;
  thumbnail_url: string;
}

interface ActorSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelectActors: (actors: SelectedActor[]) => void;
  selectedActors: SelectedActor[];
}

export function ActorSelectionModal({
  open,
  onClose,
  onSelectActors,
  selectedActors,
}: ActorSelectionModalProps) {
  const [actors, setActors] = useState<Actor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [genderFilter, setGenderFilter] = useState<string | null>(null);
  const [ageFilter, setAgeFilter] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(selectedActors.map(a => a.id)));
      fetchActors();
    }
  }, [open, selectedActors]);

  const fetchActors = async () => {
    const { data, error } = await supabase
      .from("actors")
      .select("*")
      .order("name");

    if (!error && data) {
      setActors(data);
    }
  };

  const filteredActors = actors.filter(actor => {
    const matchesSearch = actor.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGender = !genderFilter || actor.gender === genderFilter;
    const matchesAge = !ageFilter || actor.age_group === ageFilter;
    return matchesSearch && matchesGender && matchesAge;
  });

  const toggleActor = (actor: Actor) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(actor.id)) {
      newSelectedIds.delete(actor.id);
    } else {
      newSelectedIds.add(actor.id);
    }
    setSelectedIds(newSelectedIds);
  };

  const handleConfirm = () => {
    const selected = actors
      .filter(a => selectedIds.has(a.id))
      .map(a => ({
        id: a.id,
        name: a.name,
        thumbnail_url: a.thumbnail_url,
      }));
    onSelectActors(selected);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[80vh] p-0">
        <div className="flex h-full">
          {/* Left sidebar - Filters */}
          <div className="w-64 border-r border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Select actors</h3>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>

            <ScrollArea className="h-[calc(80vh-120px)]">
              <div className="space-y-4">
                {/* Category filters */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Category</p>
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "w-full justify-start h-8 text-xs",
                        !genderFilter && !ageFilter && "bg-muted"
                      )}
                      onClick={() => {
                        setGenderFilter(null);
                        setAgeFilter(null);
                      }}
                    >
                      All AI Actors
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-xs">
                      Favorites
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-xs">
                      My Cloned Actors
                    </Button>
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Gender</p>
                  <div className="flex gap-2">
                    <Button
                      variant={genderFilter === "male" ? "default" : "outline"}
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => setGenderFilter(genderFilter === "male" ? null : "male")}
                    >
                      Male
                    </Button>
                    <Button
                      variant={genderFilter === "female" ? "default" : "outline"}
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => setGenderFilter(genderFilter === "female" ? null : "female")}
                    >
                      Female
                    </Button>
                  </div>
                </div>

                {/* Age */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Age</p>
                  <div className="space-y-1">
                    {["Young Adult", "Adult", "Senior"].map((age) => (
                      <Button
                        key={age}
                        variant={ageFilter === age ? "default" : "ghost"}
                        size="sm"
                        className="w-full justify-start h-8 text-xs"
                        onClick={() => setAgeFilter(ageFilter === age ? null : age)}
                      >
                        {age}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Right side - Actor grid */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <p className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleConfirm}>
                  Confirm Selection
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="grid grid-cols-5 gap-3">
                {filteredActors.map((actor) => {
                  const isSelected = selectedIds.has(actor.id);
                  return (
                    <div
                      key={actor.id}
                      className={cn(
                        "relative cursor-pointer group rounded-lg overflow-hidden border-2 transition-all",
                        isSelected ? "border-accent" : "border-transparent hover:border-border"
                      )}
                      onClick={() => toggleActor(actor)}
                    >
                      {/* 9:16 aspect ratio */}
                      <div className="relative w-full" style={{ paddingBottom: "177.78%" }}>
                        <img
                          src={actor.thumbnail_url}
                          alt={actor.name}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        
                        {/* Selection overlay */}
                        {isSelected && (
                          <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                            <div className="bg-accent rounded-full p-2">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}

                        {/* Premium badge */}
                        {actor.is_premium && (
                          <Badge className="absolute top-2 right-2 text-xs">PRO</Badge>
                        )}
                      </div>
                      
                      <div className="p-2 bg-card">
                        <p className="text-xs font-medium truncate">{actor.name}</p>
                        <p className="text-xs text-muted-foreground">HD</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
