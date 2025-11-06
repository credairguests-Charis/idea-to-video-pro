import { useState, useRef, useCallback, useEffect } from "react";
import { Users, ArrowUp, ChevronDown, Film, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ActorCard } from "@/components/ActorCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SelectedActor {
  id: string;
  name: string;
  thumbnail_url: string;
}

interface ProductImage {
  url: string;
  name: string;
  isUploading?: boolean;
}

interface BottomInputPanelProps {
  script: string;
  onScriptChange: (value: string) => void;
  selectedActors: SelectedActor[];
  onRemoveActor: (actorId: string) => void;
  onOpenActorSelector: () => void;
  aspectRatio: "portrait" | "landscape";
  onAspectRatioChange: (ratio: "portrait" | "landscape") => void;
  onSubmit: () => void;
  onBulkGenerate?: (count: number) => void;
  isLoading: boolean;
  productImage: ProductImage | null;
  onProductImageChange: (image: ProductImage | null) => void;
}

export function BottomInputPanel({
  script,
  onScriptChange,
  selectedActors,
  onRemoveActor,
  onOpenActorSelector,
  aspectRatio,
  onAspectRatioChange,
  onSubmit,
  onBulkGenerate,
  isLoading,
  productImage,
  onProductImageChange,
}: BottomInputPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [charCount, setCharCount] = useState(0);
  const maxChars = 1500;

  useEffect(() => {
    setCharCount(script.length);
  }, [script]);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    textarea.style.height = "72px";
    const newHeight = Math.min(textarea.scrollHeight, 300);
    textarea.style.height = `${newHeight}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [script, adjustHeight]);

  const handleProductImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    // Show loading state with local preview
    const localUrl = URL.createObjectURL(file);
    onProductImageChange({
      url: localUrl,
      name: file.name,
      isUploading: true
    });

    try {
      // Upload to Supabase Storage
      const { supabase } = await import('@/integrations/supabase/client');
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('actor-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('actor-images')
        .getPublicUrl(filePath);

      // Update with public URL
      URL.revokeObjectURL(localUrl);
      onProductImageChange({
        url: publicUrl,
        name: file.name,
        isUploading: false
      });
      
      // Reset file input to allow uploading another image
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading product image:', error);
      URL.revokeObjectURL(localUrl);
      onProductImageChange(null);
      // You could add a toast notification here to inform the user
    }
  }, [onProductImageChange]);

  const handleRemoveProductImage = useCallback(() => {
    if (productImage) {
      URL.revokeObjectURL(productImage.url);
      onProductImageChange(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [productImage, onProductImageChange]);

  return (
    <div className="fixed bottom-0 left-[240px] right-0 z-50 flex justify-center pb-6 pointer-events-none">
      <div 
        className="w-full max-w-[680px] mx-auto bg-white rounded-2xl border border-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.08)] pointer-events-auto"
      >
        {/* Header */}
        <div className="relative px-4 pt-4 pb-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-gray-600 hover:text-gray-900">
                <Users className="h-3.5 w-3.5" />
                Talking Actors
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-white z-50">
              <DropdownMenuItem>All Actors</DropdownMenuItem>
              <DropdownMenuItem>Favorites</DropdownMenuItem>
              <DropdownMenuItem>My Clones</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <span className="absolute right-4 top-4 text-xs text-gray-400">
            {charCount} / {maxChars}
          </span>
        </div>

        {/* Main content area */}
        <div className="px-4">
          <Textarea
            ref={textareaRef}
            value={script}
            onChange={(e) => {
              if (e.target.value.length <= maxChars) {
                onScriptChange(e.target.value);
              }
            }}
            placeholder="Write script..."
            className={cn(
              "min-h-[60px] max-h-[200px] w-full resize-none border-0 bg-transparent",
              "focus-visible:ring-0 focus-visible:ring-offset-0 text-sm",
              "placeholder:text-gray-400"
            )}
            disabled={isLoading}
          />
        </div>

        {/* Selected actors and product image */}
        {(selectedActors.length > 0 || productImage) && (
          <div className="px-4 pb-3">
            <div className="flex flex-wrap gap-2 items-center">
              {selectedActors.map((actor) => (
                <ActorCard
                  key={actor.id}
                  actor={actor}
                  onRemove={() => onRemoveActor(actor.id)}
                  showSettings={false}
                  disabled={isLoading}
                />
              ))}
              {productImage && (
                <div className="relative inline-flex items-center gap-2 pl-1 pr-3 py-1 bg-white rounded-full border border-gray-200 shadow-sm">
                  <img
                    src={productImage.url}
                    alt="Product"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    {productImage.isUploading ? 'Uploading...' : 'Product'}
                  </span>
                  <button
                    onClick={handleRemoveProductImage}
                    disabled={isLoading || productImage.isUploading}
                    className="ml-1 p-0.5 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                  >
                    <X className="h-3 w-3 text-gray-500" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-4 pb-4 pt-3 border-t border-gray-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-gray-700">
                <Film className="h-3.5 w-3.5" />
                {aspectRatio === "portrait" ? "9:16 – Portrait" : "16:9 – Landscape"}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => onAspectRatioChange("portrait")}>
                <Film className="h-4 w-4 mr-2" />
                9:16 – Portrait
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAspectRatioChange("landscape")}>
                <Film className="h-4 w-4 mr-2" />
                16:9 – Landscape
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-2">
            {selectedActors.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full">
                <div className="flex -space-x-2">
                  {selectedActors.slice(0, 2).map((actor) => (
                    <img
                      key={actor.id}
                      src={actor.thumbnail_url}
                      alt={actor.name}
                      className="w-5 h-5 rounded-full border-2 border-white object-cover"
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-gray-700">{selectedActors.length} Actor{selectedActors.length > 1 ? 's' : ''}</span>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenActorSelector}
              className="h-7 text-xs text-gray-700 hover:text-gray-900"
              disabled={isLoading}
            >
              <Users className="h-3.5 w-3.5 mr-1" />
              Add actors
            </Button>

            {onBulkGenerate && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-gray-700 hover:text-gray-900"
                    disabled={isLoading || !script.trim() || productImage?.isUploading}
                  >
                    <Film className="h-3.5 w-3.5 mr-1" />
                    Bulk Generate
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[100] bg-white shadow-lg border border-gray-200">
                  <DropdownMenuItem onClick={() => onBulkGenerate(2)} className="cursor-pointer hover:bg-gray-100">
                    2 videos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBulkGenerate(4)} className="cursor-pointer hover:bg-gray-100">
                    4 videos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBulkGenerate(6)} className="cursor-pointer hover:bg-gray-100">
                    6 videos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBulkGenerate(8)} className="cursor-pointer hover:bg-gray-100">
                    8 videos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBulkGenerate(10)} className="cursor-pointer hover:bg-gray-100">
                    10 videos
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProductImageUpload}
              className="hidden"
              disabled={isLoading}
            />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-7 text-xs text-gray-700 hover:text-gray-900"
              disabled={isLoading}
            >
              <ImageIcon className="h-3.5 w-3.5 mr-1" />
              Upload product
            </Button>

            <Button
              onClick={onSubmit}
              disabled={isLoading || !script.trim() || productImage?.isUploading}
              className="h-9 w-9 rounded-full p-0 bg-[#0f1729] hover:bg-[#0f1729]/90"
            >
              <ArrowUp className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
