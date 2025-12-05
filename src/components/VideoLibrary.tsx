import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VideoPlayer } from "@/components/VideoPlayer";
import { RegenerateVideoDialog } from "@/components/RegenerateVideoDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, Play, MoreVertical, Edit2, RotateCcw, Trash2 } from "lucide-react";
import { CharisLoader } from "@/components/ui/charis-loader";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface VideoGeneration {
  id: string;
  task_id: string;
  status: string;
  result_url: string | null;
  prompt: string;
  title: string | null;
  aspect_ratio: string;
  thumbnail_url: string | null;
  created_at: string;
  completed_at: string | null;
  image_url: string | null;
  n_frames: string;
  remove_watermark: boolean | null;
  user_id?: string;
  project_id?: string | null;
}


interface VideoLibraryProps {
  projectId?: string
}

export function VideoLibrary({ projectId }: VideoLibraryProps = {}) {
  const [videos, setVideos] = useState<VideoGeneration[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoGeneration | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [regenerateVideo, setRegenerateVideo] = useState<VideoGeneration | null>(null);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const { toast } = useToast();
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});
  const observerRef = useRef<HTMLDivElement>(null);
  
  const VIDEOS_PER_PAGE = 12;

  useEffect(() => {
    // Reset and fetch initial videos when project changes
    setVideos([]);
    setPage(0);
    setHasMore(true);
    setLoading(true);
    fetchVideos(0, true);
  }, [projectId]);

  useEffect(() => {
    // Generate thumbnails for videos that don't have them OR have invalid thumbnails (video URLs)
    videos.forEach(async (video) => {
      if (!video.result_url) return;
      
      // Check if thumbnail is missing or invalid (like a .mp4 URL)
      const hasInvalidThumbnail = video.thumbnail_url && 
        (video.thumbnail_url.endsWith('.mp4') || 
         video.thumbnail_url.endsWith('.webm') || 
         !video.thumbnail_url.startsWith('data:image'));
      
      if ((!video.thumbnail_url || hasInvalidThumbnail) && videoRefs.current[video.id]) {
        console.log(`Regenerating thumbnail for video ${video.id}`);
        const thumbnail = await generateThumbnail(video.result_url, video.id);
        // Only persist valid image thumbnails
        if (thumbnail && thumbnail.startsWith('data:image')) {
          const { error } = await supabase
            .from('video_generations')
            .update({ thumbnail_url: thumbnail })
            .eq('id', video.id);
          
          if (!error) {
            // Update local state immediately
            setVideos(prev => prev.map(v => 
              v.id === video.id ? { ...v, thumbnail_url: thumbnail } : v
            ));
          }
        }
      }
    });
  }, [videos]);

  const fetchVideos = async (pageNum: number = 0, isInitial: boolean = false) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const from = pageNum * VIDEOS_PER_PAGE;
    const to = from + VIDEOS_PER_PAGE - 1;

    let query = supabase
      .from('video_generations')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('status', 'success')
      .not('result_url', 'is', null)
      .order('completed_at', { ascending: false })
      .range(from, to);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (!error && data) {
      if (isInitial) {
        setVideos(data);
      } else {
        setVideos(prev => [...prev, ...data]);
      }
      
      // Check if there are more videos to load
      setHasMore(data.length === VIDEOS_PER_PAGE);
    }
    
    if (isInitial) {
      setLoading(false);
    } else {
      setLoadingMore(false);
    }
  };

  const loadMoreVideos = () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchVideos(nextPage, false);
  };

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMoreVideos();
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [hasMore, loadingMore, loading, page]);

  // Realtime updates: add new completed videos without reload
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let pollInterval: NodeJS.Timeout | null = null;
    
    const setup = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData.user;
      if (!currentUser) return;

      // Poll for new completed videos every 3 seconds as backup
      const pollForNewVideos = async () => {
        try {
          let query = supabase
            .from('video_generations')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('status', 'success')
            .not('result_url', 'is', null)
            .order('completed_at', { ascending: false })
            .limit(5);

          if (projectId) {
            query = query.eq('project_id', projectId);
          }

          const { data } = await query;
          
          if (data) {
            setVideos(prev => {
              const merged = [...prev];
              data.forEach(newVideo => {
                if (!merged.some(v => v.id === newVideo.id)) {
                  merged.unshift(newVideo);
                }
              });
              return merged;
            });
          }
        } catch (error) {
          console.error('Error polling for videos:', error);
        }
      };

      pollInterval = setInterval(pollForNewVideos, 3000);

      channel = supabase
        .channel('video-generations-realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'video_generations' },
          async (payload) => {
            const rec = payload.new as VideoGeneration & { user_id: string; project_id?: string | null };
            if (!rec || rec.user_id !== currentUser.id) return;
            if (projectId && rec.project_id !== projectId) return;

            if (rec.status === 'success' && rec.result_url) {
              console.log('📹 New video received via INSERT:', rec.id);
              // Add new video to the list
              setVideos(prev => {
                const exists = prev.some(v => v.id === rec.id);
                return exists ? prev : [rec, ...prev];
              });

              // Auto-generate thumbnail if missing
              if (!rec.thumbnail_url) {
                const thumb = await generateThumbnail(rec.result_url, rec.id);
                if (thumb && thumb.startsWith('data:image')) {
                  await supabase.from('video_generations').update({ thumbnail_url: thumb }).eq('id', rec.id);
                  setVideos(prev => prev.map(v => v.id === rec.id ? { ...v, thumbnail_url: thumb } : v));
                }
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'video_generations' },
          async (payload) => {
            const rec = payload.new as VideoGeneration & { user_id: string; project_id?: string | null };
            if (!rec || rec.user_id !== currentUser.id) return;
            if (projectId && rec.project_id !== projectId) return;

            if (rec.status === 'success' && rec.result_url) {
              console.log('📹 Video updated via UPDATE:', rec.id);
              // Merge or insert
              setVideos(prev => {
                const exists = prev.some(v => v.id === rec.id);
                const next = exists ? prev.map(v => (v.id === rec.id ? { ...v, ...rec } : v)) : [rec, ...prev];
                return next;
              });

              // Auto-generate thumbnail if missing
              if (!rec.thumbnail_url) {
                const thumb = await generateThumbnail(rec.result_url, rec.id);
                if (thumb && thumb.startsWith('data:image')) {
                  await supabase.from('video_generations').update({ thumbnail_url: thumb }).eq('id', rec.id);
                  setVideos(prev => prev.map(v => v.id === rec.id ? { ...v, thumbnail_url: thumb } : v));
                }
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('📹 Realtime subscription status:', status);
        });
    };

    setup();
    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [projectId]);

  const handleVideoClick = (video: VideoGeneration) => {
    setSelectedVideo(video);
    setShowVideoModal(true);
  };

  const generateThumbnail = async (videoUrl: string, videoId: string): Promise<string | null> => {
    return new Promise<string | null>((resolve) => {
      const timeout = setTimeout(() => {
        console.warn(`Thumbnail generation timeout for video ${videoId}`);
        resolve(null);
      }, 10000); // 10 second timeout

      try {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.src = videoUrl;
        video.preload = 'metadata';
        video.muted = true;
        
        const captureFrame = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 0;
            canvas.height = video.videoHeight || 0;
            
            // Validate dimensions
            if (!canvas.width || !canvas.height || canvas.width < 10 || canvas.height < 10) {
              console.warn(`Invalid video dimensions for ${videoId}: ${canvas.width}x${canvas.height}`);
              clearTimeout(timeout);
              return resolve(null);
            }
            
            const ctx = canvas.getContext('2d', { willReadFrequently: false });
            if (!ctx) {
              clearTimeout(timeout);
              return resolve(null);
            }
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Check if canvas is actually filled (not all black/white)
            const imageData = ctx.getImageData(0, 0, Math.min(canvas.width, 100), Math.min(canvas.height, 100));
            const data = imageData.data;
            let hasContent = false;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              // Check if pixel is not pure black (0,0,0) or pure white (255,255,255)
              if ((r > 10 || g > 10 || b > 10) && (r < 245 || g < 245 || b < 245)) {
                hasContent = true;
                break;
              }
            }
            
            if (!hasContent) {
              console.warn(`Generated thumbnail appears to be blank for ${videoId}`);
              clearTimeout(timeout);
              return resolve(null);
            }
            
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);
            
            if (thumbnailUrl && thumbnailUrl.startsWith('data:image') && thumbnailUrl.length > 1000) {
              clearTimeout(timeout);
              resolve(thumbnailUrl);
            } else {
              console.warn(`Invalid thumbnail generated for ${videoId}`);
              clearTimeout(timeout);
              resolve(null);
            }
          } catch (e) {
            console.error('Error capturing thumbnail frame:', e);
            clearTimeout(timeout);
            resolve(null);
          }
        };
        
        video.onloadedmetadata = () => {
          // Try to seek to a point where content exists
          const duration = video.duration;
          if (duration && duration > 0) {
            // Capture at 10% into video, or 1 second, whichever is less
            video.currentTime = Math.min(duration * 0.1, 1.0);
          } else {
            video.currentTime = 0.5;
          }
        };
        
        video.onseeked = () => {
          // Wait a bit for the frame to render
          setTimeout(captureFrame, 200);
        };
        
        video.onerror = (e) => {
          console.error('Video loading error for thumbnail:', e);
          clearTimeout(timeout);
          resolve(null);
        };
        
        // Start loading
        video.load();
      } catch (e) {
        console.error('Error in generateThumbnail:', e);
        clearTimeout(timeout);
        resolve(null);
      }
    });
  };

  const handleDownload = async (video: VideoGeneration) => {
    if (!video.result_url) return;

    try {
      const response = await fetch(video.result_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${video.title || video.prompt || 'video'}-${video.task_id}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Downloaded",
        description: "Video downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download video. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRename = async (videoId: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from('video_generations')
        .update({ title: newTitle })
        .eq('id', videoId);

      if (error) throw error;

      setVideos(videos.map(v => v.id === videoId ? { ...v, title: newTitle } : v));
      setEditingId(null);
      
      toast({
        title: "Renamed",
        description: "Video renamed successfully",
      });
    } catch (error) {
      toast({
        title: "Rename Failed",
        description: "Failed to rename video. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRegenerate = (video: VideoGeneration) => {
    setRegenerateVideo(video);
    setShowRegenerateDialog(true);
  };

  const handleDelete = async (videoId: string) => {
    try {
      const { error } = await supabase
        .from('video_generations')
        .delete()
        .eq('id', videoId);

      if (error) throw error;

      setVideos(videos.filter(v => v.id !== videoId));
      
      toast({
        title: "Deleted",
        description: "Video deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete video. Please try again.",
        variant: "destructive",
      });
    }
  };

  const VideoCardSkeleton = () => (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-[9/16] w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 px-3 md:px-0">
        {Array.from({ length: VIDEOS_PER_PAGE }).map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No generated videos yet</p>
      </div>
    );
  }

  return (
    <>
      <RegenerateVideoDialog
        video={regenerateVideo}
        open={showRegenerateDialog}
        onOpenChange={setShowRegenerateDialog}
        onSuccess={fetchVideos}
        projectId={projectId}
      />
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 px-3 md:px-0">
          {videos.map((video) => {
          const isPortrait = !video.aspect_ratio || video.aspect_ratio === 'portrait' || video.aspect_ratio === '9:16';
          
          return (
            <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow group animate-fade-in">
              <div className={`relative bg-muted ${isPortrait ? 'aspect-[9/16]' : 'aspect-video'}`}>
              {video.result_url && (
                  <>
                    {video.thumbnail_url && video.thumbnail_url.startsWith('data:image') ? (
                      <img 
                        src={video.thumbnail_url} 
                        alt={video.title || video.prompt}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                        <video
                          ref={(el) => { if (el) videoRefs.current[video.id] = el; }}
                          src={video.result_url}
                          className="w-full h-full object-cover"
                          preload="auto"
                          muted
                          playsInline
                          onLoadedData={async (e) => {
                            const videoEl = e.currentTarget;
                            videoEl.currentTime = Math.min(videoEl.duration * 0.1, 1.0);
                          }}
                        />
                      </div>
                    )}
                  </>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => handleVideoClick(video)}
                    className="bg-white/90 hover:bg-white"
                  >
                    <Play className="h-5 w-5 text-primary" />
                  </Button>
                </div>
                
                {/* Dropdown Menu */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="secondary" className="h-8 w-8 bg-black/60 hover:bg-black/80">
                        <MoreVertical className="h-4 w-4 text-white" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setEditingId(video.id);
                        setEditTitle(video.title || video.prompt);
                      }}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRegenerate(video)}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Regenerate
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(video.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <div className="p-3 space-y-2">
                {editingId === video.id ? (
                  <div className="flex gap-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(video.id, editTitle);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button 
                      size="sm" 
                      onClick={() => handleRename(video.id, editTitle)}
                      className="h-8 px-3"
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <p 
                    className="text-sm font-medium line-clamp-2 cursor-pointer hover:text-primary"
                    onClick={() => {
                      setEditingId(video.id);
                      setEditTitle(video.title || video.prompt);
                    }}
                  >
                    {video.title || video.prompt}
                  </p>
                )}
                
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {video.completed_at && format(new Date(video.completed_at), 'MMM d, yyyy')}
                  </p>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDownload(video)}
                    className="h-7 w-7"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
        </div>

        {/* Loading more skeletons */}
        {loadingMore && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <VideoCardSkeleton key={`loading-${i}`} />
            ))}
          </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={observerRef} className="h-4" />

        {/* End of results message */}
        {!hasMore && videos.length > 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            All videos loaded
          </div>
        )}
      </div>

      {/* Video Preview Modal */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden p-0 gap-0 bg-black border-0">
          {selectedVideo?.result_url && (
            <div className="flex flex-col lg:flex-row max-h-[85vh]">
              {/* Video Section - Left */}
              <div className="flex-1 flex items-center justify-center bg-black p-4 lg:p-6">
                <div className={selectedVideo.aspect_ratio === 'portrait' || selectedVideo.aspect_ratio === '9:16' ? 'w-full max-w-md h-[70vh]' : 'w-full h-[70vh]'}>
                  <VideoPlayer 
                    src={selectedVideo.result_url}
                    className="w-full h-full rounded-lg"
                  />
                </div>
              </div>
              
              {/* Details & Actions Panel - Right */}
              <div className="w-full lg:w-80 bg-background/95 backdrop-blur-sm p-6 space-y-6 overflow-y-auto">
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <h3 className="font-semibold text-lg line-clamp-2">
                      {selectedVideo.title || selectedVideo.prompt}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedVideo.completed_at && format(new Date(selectedVideo.completed_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => handleRegenerate(selectedVideo)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Remix
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => handleDownload(selectedVideo)}
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                      onClick={() => {
                        handleDelete(selectedVideo.id);
                        setShowVideoModal(false);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>

                  {/* Separator */}
                  <div className="border-t" />

                  {/* Video Details */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Model</p>
                      <p className="text-sm">AI Gesture</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Actor</p>
                      <p className="text-sm">Custom Avatar</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Prompt</p>
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {selectedVideo.prompt}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
