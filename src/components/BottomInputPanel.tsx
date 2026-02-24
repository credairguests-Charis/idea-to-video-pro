import { useState, useRef, useCallback, useEffect } from "react";
import { Users, ArrowUp, ChevronDown, Film, Image as ImageIcon, X, Link2, Loader2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ActorCard } from "@/components/ActorCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OnboardingSpotlight } from "@/components/onboarding/OnboardingSpotlight";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface BrandUrlData {
  url: string;
  title: string;
  description: string;
  content: string;
  isFetching?: boolean;
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
  brandUrl?: BrandUrlData | null;
  onBrandUrlChange?: (data: BrandUrlData | null) => void;
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
  brandUrl: externalBrandUrl,
  onBrandUrlChange,
}: BottomInputPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [charCount, setCharCount] = useState(0);
  const maxChars = 1500;

  // Internal brand URL state (used when no external control is provided)
  const [internalBrandUrl, setInternalBrandUrl] = useState<BrandUrlData | null>(null);
  const brandUrl = externalBrandUrl !== undefined ? externalBrandUrl : internalBrandUrl;
  const setBrandUrl = onBrandUrlChange || setInternalBrandUrl;

  const [urlInput, setUrlInput] = useState("");
  const [urlPopoverOpen, setUrlPopoverOpen] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

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

  const handleFetchUrl = useCallback(async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    // Basic URL validation
    let testUrl = trimmed;
    if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
      testUrl = `https://${testUrl}`;
    }
    try {
      new URL(testUrl);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    setIsFetchingUrl(true);
    setBrandUrl({ url: testUrl, title: '', description: '', content: '', isFetching: true });
    setUrlPopoverOpen(false);
    setUrlInput("");

    try {
      const { data, error } = await supabase.functions.invoke('firecrawl-scrape', {
        body: { url: testUrl },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch URL');

      const brandInfo = data.data;
      setBrandUrl({
        url: testUrl,
        title: brandInfo.title || new URL(testUrl).hostname,
        description: brandInfo.description || '',
        content: brandInfo.content || '',
        isFetching: false,
      });

      toast.success("Brand info loaded", {
        description: brandInfo.title || new URL(testUrl).hostname,
      });
    } catch (err) {
      console.error('Error fetching URL:', err);
      setBrandUrl(null);
      toast.error("Couldn't fetch that URL", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setIsFetchingUrl(false);
    }
  }, [urlInput, setBrandUrl]);

  const handleRemoveBrandUrl = useCallback(() => {
    setBrandUrl(null);
  }, [setBrandUrl]);

  const handleProductImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const localUrl = URL.createObjectURL(file);
    onProductImageChange({
      url: localUrl,
      name: file.name,
      isUploading: true
    });

    try {
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

      const { data: { publicUrl } } = supabase.storage
        .from('actor-images')
        .getPublicUrl(filePath);

      URL.revokeObjectURL(localUrl);
      onProductImageChange({
        url: publicUrl,
        name: file.name,
        isUploading: false
      });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading product image:', error);
      URL.revokeObjectURL(localUrl);
      onProductImageChange(null);
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
    <div className="fixed bottom-0 left-0 md:left-[240px] right-0 z-50 flex justify-center pb-3 md:pb-6 pointer-events-none">
      <div 
        className="w-full max-w-[680px] mx-2 md:mx-auto bg-white rounded-2xl border border-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.08)] pointer-events-auto"
      >
        {/* Header */}
        <div className="relative px-3 md:px-4 pt-3 md:pt-4 pb-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 md:h-7 gap-1 text-xs text-gray-600 hover:bg-accent hover:text-accent-foreground">
                <Users className="h-3 w-3 md:h-3.5 md:w-3.5" />
                <span className="hidden sm:inline">Talking Actors</span>
                <span className="sm:hidden">Actors</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-white z-50">
              <DropdownMenuItem>All Actors</DropdownMenuItem>
              <DropdownMenuItem>Favorites</DropdownMenuItem>
              <DropdownMenuItem>My Clones</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <span className="absolute right-3 md:right-4 top-3 md:top-4 text-[10px] md:text-xs text-gray-400">
            {charCount} / {maxChars}
          </span>
        </div>

        {/* Main content area */}
        <OnboardingSpotlight
          tooltipKey="hasSeenScriptTooltip"
          title="Write your script"
          description="Type what your actor will say. Keep it 30–60 seconds for best results."
          position="top"
          step={2}
          totalSteps={4}
        >
          <div className="px-3 md:px-4">
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
        </OnboardingSpotlight>

        {/* Selected actors, product image, and brand URL chips */}
        {(selectedActors.length > 0 || productImage || brandUrl) && (
          <div className="px-3 md:px-4 pb-3">
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
                    className="ml-1 p-0.5 hover:bg-accent hover:text-accent-foreground rounded-full transition-colors disabled:opacity-50"
                  >
                    <X className="h-3 w-3 text-gray-500" />
                  </button>
                </div>
              )}
              {brandUrl && (
                <div className="relative inline-flex items-center gap-2 pl-2.5 pr-3 py-1 bg-white rounded-full border border-gray-200 shadow-sm max-w-[220px]">
                  {brandUrl.isFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400 shrink-0" />
                  ) : (
                    <Globe className="h-4 w-4 text-primary shrink-0" />
                  )}
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {brandUrl.isFetching ? 'Fetching…' : brandUrl.title || new URL(brandUrl.url).hostname}
                  </span>
                  {!brandUrl.isFetching && (
                    <button
                      onClick={handleRemoveBrandUrl}
                      disabled={isLoading}
                      className="ml-1 p-0.5 hover:bg-accent hover:text-accent-foreground rounded-full transition-colors disabled:opacity-50 shrink-0"
                    >
                      <X className="h-3 w-3 text-gray-500" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-3 md:px-4 pb-3 md:pb-4 pt-3 border-t border-gray-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 md:h-7 gap-1 text-xs text-gray-700 hover:bg-accent hover:text-accent-foreground">
                <Film className="h-3 w-3 md:h-3.5 md:w-3.5" />
                {aspectRatio === "portrait" ? "9:16" : "16:9"}
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

          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap w-full sm:w-auto">
            {selectedActors.length > 0 && (
              <div className="flex items-center gap-1.5 px-2 md:px-2.5 py-1 bg-gray-100 rounded-full">
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
                <span className="text-[10px] md:text-xs font-medium text-gray-700">{selectedActors.length} Actor{selectedActors.length > 1 ? 's' : ''}</span>
              </div>
            )}
            
            <OnboardingSpotlight
              tooltipKey="hasSeenActorTooltip"
              title="Pick your actors"
              description="Choose who appears in your video. Select one or several for A/B testing."
              position="top"
              step={1}
              totalSteps={4}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenActorSelector}
                className="h-6 md:h-7 text-[10px] md:text-xs text-gray-700 hover:bg-accent hover:text-accent-foreground px-2 md:px-3"
                disabled={isLoading}
              >
                <Users className="h-3 w-3 md:h-3.5 md:w-3.5" />
                <span className="hidden sm:inline ml-1">Add actors</span>
              </Button>
            </OnboardingSpotlight>

            {onBulkGenerate && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 md:h-7 text-[10px] md:text-xs text-gray-700 hover:bg-accent hover:text-accent-foreground px-2 md:px-3"
                    disabled={isLoading || !script.trim() || productImage?.isUploading}
                  >
                    <Film className="h-3 w-3 md:h-3.5 md:w-3.5" />
                    <span className="hidden sm:inline ml-1">Bulk</span>
                    <ChevronDown className="h-3 w-3 ml-0.5 md:ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[100] bg-white shadow-lg border border-gray-200">
                  <DropdownMenuItem onClick={() => onBulkGenerate(2)} className="cursor-pointer">
                    2 videos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBulkGenerate(4)} className="cursor-pointer">
                    4 videos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBulkGenerate(6)} className="cursor-pointer">
                    6 videos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBulkGenerate(8)} className="cursor-pointer">
                    8 videos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBulkGenerate(10)} className="cursor-pointer">
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
              className="h-6 md:h-7 text-[10px] md:text-xs text-gray-700 hover:bg-accent hover:text-accent-foreground px-2 md:px-3"
              disabled={isLoading}
            >
              <ImageIcon className="h-3 w-3 md:h-3.5 md:w-3.5" />
              <span className="hidden sm:inline ml-1">Product</span>
            </Button>

            {/* URL Button */}
            <Popover open={urlPopoverOpen} onOpenChange={setUrlPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-6 md:h-7 text-[10px] md:text-xs hover:bg-accent hover:text-accent-foreground px-2 md:px-3",
                    brandUrl ? "text-primary" : "text-gray-700"
                  )}
                  disabled={isLoading || isFetchingUrl}
                >
                  {isFetchingUrl ? (
                    <Loader2 className="h-3 w-3 md:h-3.5 md:w-3.5 animate-spin" />
                  ) : (
                    <Link2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                  )}
                  <span className="hidden sm:inline ml-1">URL</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                side="top"
                className="w-80 p-3 bg-white border border-gray-200 shadow-lg"
              >
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-700">
                    Paste your brand or product URL
                  </p>
                  <p className="text-[11px] text-gray-400">
                    We'll fetch brand positioning, images, and details automatically.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://yourbrand.com"
                      className="h-8 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleFetchUrl();
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={handleFetchUrl}
                      disabled={!urlInput.trim() || isFetchingUrl}
                      className="h-8 px-3 shrink-0"
                    >
                      {isFetchingUrl ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Fetch"
                      )}
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <OnboardingSpotlight
              tooltipKey="hasSeenGenerateTooltip"
              title="Hit generate"
              description="When you're ready, tap here to create your video."
              position="top"
              step={3}
              totalSteps={4}
            >
              <Button
                onClick={onSubmit}
                disabled={isLoading || !script.trim() || productImage?.isUploading}
                className="h-8 w-8 md:h-9 md:w-9 rounded-full p-0 bg-[#0f1729] hover:bg-[#0f1729]/90"
              >
                <ArrowUp className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
              </Button>
            </OnboardingSpotlight>
          </div>
        </div>
      </div>
    </div>
  );
}
