import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Copy, Users, Ban, CheckCircle, XCircle, Clock, Link2, TrendingUp, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface MarketingLink {
  id: string;
  slug: string;
  title: string;
  initial_credits: number;
  expires_at: string;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  revoked: boolean;
  created_at: string;
  og_image_url?: string;
}

interface LinkUsage {
  user_id: string;
  signup_timestamp: string;
  credited_amount: number;
  credits_spent: number;
  email?: string;
}

interface LinkAnalytics {
  total_signups: number;
  total_clicks: number;
  total_credits_used: number;
  exhausted_users: number;
}

export default function AdminMarketingLinks() {
  const [links, setLinks] = useState<MarketingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [initialCredits, setInitialCredits] = useState("105");
  const [ogImage, setOgImage] = useState<File | null>(null);
  const [ogImagePreview, setOgImagePreview] = useState<string | null>(null);
  const [ogThumbnail, setOgThumbnail] = useState<File | null>(null);
  const [ogThumbnailPreview, setOgThumbnailPreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // Analytics state
  const [selectedLink, setSelectedLink] = useState<MarketingLink | null>(null);
  const [usages, setUsages] = useState<LinkUsage[]>([]);
  const [analytics, setAnalytics] = useState<LinkAnalytics | null>(null);
  const [loadingUsages, setLoadingUsages] = useState(false);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Error fetching marketing links:', error);
      toast.error('Failed to load marketing links');
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File must be less than 50MB');
        return;
      }
      setOgImage(file);
      setOgImagePreview(URL.createObjectURL(file));
    }
  };

  const isVideoFile = (url: string) => {
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  const isGifFile = (url: string) => {
    return url.toLowerCase().includes('.gif');
  };

  const isSelectedFileVideo = () => {
    return ogImage && ogImage.type.startsWith('video/');
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Thumbnail must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Thumbnail must be an image file');
        return;
      }
      setOgThumbnail(file);
      setOgThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const removeThumbnail = () => {
    setOgThumbnail(null);
    setOgThumbnailPreview(null);
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = '';
    }
  };

  const removeImage = () => {
    setOgImage(null);
    setOgImagePreview(null);
    setOgThumbnail(null);
    setOgThumbnailPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('marketing-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('marketing-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  const createLink = async () => {
    if (!title || !expiresAt) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreating(true);
    setUploadingImage(true);
    try {
      // Upload media file first if selected
      let og_image_url: string | null = null;
      let og_thumbnail_url: string | null = null;
      
      if (ogImage) {
        og_image_url = await uploadFile(ogImage);
        if (!og_image_url) {
          toast.error('Failed to upload media file');
          return;
        }
      }
      
      // Upload thumbnail if video and thumbnail is provided
      if (ogThumbnail) {
        og_thumbnail_url = await uploadFile(ogThumbnail);
        if (!og_thumbnail_url) {
          toast.error('Failed to upload thumbnail');
          return;
        }
      }

      const { data, error } = await supabase.functions.invoke('admin-create-marketing-link', {
        body: {
          title,
          expires_at: new Date(expiresAt).toISOString(),
          max_uses: maxUses ? parseInt(maxUses) : null,
          initial_credits: parseInt(initialCredits),
          og_image_url,
          og_thumbnail_url
        },
      });

      if (error) throw error;

      toast.success('Marketing link created successfully!');
      setCreateDialogOpen(false);
      setTitle("");
      setExpiresAt("");
      setMaxUses("");
      setInitialCredits("105");
      setOgImage(null);
      setOgImagePreview(null);
      setOgThumbnail(null);
      setOgThumbnailPreview(null);
      fetchLinks();
    } catch (error: any) {
      console.error('Error creating link:', error);
      toast.error(error.message || 'Failed to create link');
    } finally {
      setCreating(false);
      setUploadingImage(false);
    }
  };

  const revokeLink = async (linkId: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-revoke-marketing-link', {
        body: { link_id: linkId },
      });

      if (error) throw error;

      toast.success('Link revoked successfully');
      fetchLinks();
    } catch (error: any) {
      console.error('Error revoking link:', error);
      toast.error(error.message || 'Failed to revoke link');
    }
  };

  const toggleActive = async (linkId: string, isActive: boolean) => {
    try {
      const { error } = await supabase.functions.invoke('admin-toggle-marketing-link', {
        body: { link_id: linkId, is_active: isActive },
      });

      if (error) throw error;

      toast.success(`Link ${isActive ? 'activated' : 'deactivated'}`);
      fetchLinks();
    } catch (error: any) {
      console.error('Error toggling link:', error);
      toast.error(error.message || 'Failed to update link');
    }
  };

  const copyLinkUrl = (slug: string) => {
    const url = `${window.location.origin}/marketing/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const fetchUsages = async (link: MarketingLink) => {
    setSelectedLink(link);
    setLoadingUsages(true);
    
    try {
      // Fetch usages
      const { data: usageData, error: usageError } = await supabase
        .from('marketing_link_usages')
        .select('*')
        .eq('marketing_link_id', link.id)
        .order('signup_timestamp', { ascending: false });

      if (usageError) throw usageError;

      // Enrich with user emails from profiles
      const enrichedUsages = await Promise.all(
        (usageData || []).map(async (usage) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('user_id', usage.user_id)
            .single();

          return {
            ...usage,
            email: profile?.email || 'N/A'
          };
        })
      );

      setUsages(enrichedUsages);

      // Fetch clicks
      const { data: clicksData } = await supabase
        .from('marketing_link_clicks')
        .select('id')
        .eq('marketing_link_id', link.id);

      // Calculate analytics
      const totalCreditsUsed = enrichedUsages.reduce((sum, u) => sum + u.credits_spent, 0);
      const exhaustedUsers = enrichedUsages.filter(u => u.credits_spent >= u.credited_amount).length;

      setAnalytics({
        total_signups: enrichedUsages.length,
        total_clicks: clicksData?.length || 0,
        total_credits_used: totalCreditsUsed,
        exhausted_users: exhaustedUsers
      });

    } catch (error) {
      console.error('Error fetching usages:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoadingUsages(false);
    }
  };

  const getStatus = (link: MarketingLink) => {
    if (link.revoked) return { label: 'Revoked', variant: 'destructive' as const, icon: Ban };
    if (!link.is_active) return { label: 'Inactive', variant: 'secondary' as const, icon: XCircle };
    if (new Date(link.expires_at) < new Date()) return { label: 'Expired', variant: 'secondary' as const, icon: Clock };
    if (link.max_uses && link.current_uses >= link.max_uses) return { label: 'Max Uses', variant: 'secondary' as const, icon: Users };
    return { label: 'Active', variant: 'default' as const, icon: CheckCircle };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Marketing Links</h1>
          <p className="text-muted-foreground">Create promotional signup links with free credits</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Marketing Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Marketing Link</DialogTitle>
              <DialogDescription>
                Generate a new promotional signup link with free credits
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Campaign Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Influencer Campaign - Feb 2024"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credits">Initial Credits</Label>
                <Input
                  id="credits"
                  type="number"
                  value={initialCredits}
                  onChange={(e) => setInitialCredits(e.target.value)}
                  placeholder="105"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expires">Expiration Date *</Label>
                <Input
                  id="expires"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUses">Max Uses (optional)</Label>
                <Input
                  id="maxUses"
                  type="number"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="Leave empty for unlimited"
                />
              </div>
              <div className="space-y-2">
                <Label>Gift Card Media (Image, GIF, or Video)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Upload an image, GIF, or video to display on the signup page and social previews
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,video/*,.gif,.mp4,.webm,.mov"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {ogImagePreview ? (
                  <div className="relative border border-border rounded-lg overflow-hidden">
                    {ogImage && ogImage.type.startsWith('video/') ? (
                      <video 
                        src={ogImagePreview}
                        className="w-full h-32 object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : (
                      <img 
                        src={ogImagePreview} 
                        alt="Preview" 
                        className="w-full h-32 object-cover"
                      />
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-24 flex flex-col gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload Image, GIF, or Video</span>
                  </Button>
                )}
              </div>
              
              {/* Thumbnail upload - shows when video is selected */}
              {isSelectedFileVideo() && (
                <div className="space-y-2">
                  <Label>Video Thumbnail (for social media preview)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Social platforms may not preview videos - this image will be used as fallback
                  </p>
                  <input
                    type="file"
                    ref={thumbnailInputRef}
                    accept="image/*"
                    onChange={handleThumbnailSelect}
                    className="hidden"
                  />
                  {ogThumbnailPreview ? (
                    <div className="relative border border-border rounded-lg overflow-hidden">
                      <img 
                        src={ogThumbnailPreview} 
                        alt="Thumbnail Preview" 
                        className="w-full h-24 object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={removeThumbnail}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-16 flex flex-col gap-1"
                      onClick={() => thumbnailInputRef.current?.click()}
                    >
                      <ImagePlus className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Upload Thumbnail Image</span>
                    </Button>
                  )}
                </div>
              )}
              <Button onClick={createLink} disabled={creating || uploadingImage} className="w-full">
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Link'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">All Marketing Links</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground">Campaign</TableHead>
                <TableHead className="text-foreground">Credits</TableHead>
                <TableHead className="text-foreground">Expiry</TableHead>
                <TableHead className="text-foreground">Uses</TableHead>
                <TableHead className="text-foreground">Status</TableHead>
                <TableHead className="text-foreground">Active</TableHead>
                <TableHead className="text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => {
                const status = getStatus(link);
                const StatusIcon = status.icon;
                
                return (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium text-foreground">{link.title}</TableCell>
                    <TableCell className="text-muted-foreground">{link.initial_credits}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(link.expires_at), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {link.current_uses} {link.max_uses ? `/ ${link.max_uses}` : ''}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className="gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={link.is_active}
                        onCheckedChange={(checked) => toggleActive(link.id, checked)}
                        disabled={link.revoked}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyLinkUrl(link.slug)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => fetchUsages(link)}
                            >
                              <TrendingUp className="h-4 w-4 mr-1" />
                              Analytics
                            </Button>
                          </SheetTrigger>
                          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                            <SheetHeader>
                              <SheetTitle className="text-foreground">{selectedLink?.title}</SheetTitle>
                              <SheetDescription>Analytics and user tracking</SheetDescription>
                            </SheetHeader>
                            {loadingUsages ? (
                              <div className="flex justify-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                              </div>
                            ) : (
                              <div className="space-y-6 pt-6">
                                {/* Analytics Cards */}
                                <div className="grid grid-cols-2 gap-4">
                                  <Card>
                                    <CardContent className="pt-6">
                                      <div className="text-2xl font-bold text-foreground">{analytics?.total_clicks}</div>
                                      <div className="text-sm text-muted-foreground">Total Clicks</div>
                                    </CardContent>
                                  </Card>
                                  <Card>
                                    <CardContent className="pt-6">
                                      <div className="text-2xl font-bold text-foreground">{analytics?.total_signups}</div>
                                      <div className="text-sm text-muted-foreground">Total Signups</div>
                                    </CardContent>
                                  </Card>
                                  <Card>
                                    <CardContent className="pt-6">
                                      <div className="text-2xl font-bold text-foreground">{analytics?.total_credits_used}</div>
                                      <div className="text-sm text-muted-foreground">Credits Used</div>
                                    </CardContent>
                                  </Card>
                                  <Card>
                                    <CardContent className="pt-6">
                                      <div className="text-2xl font-bold text-foreground">{analytics?.exhausted_users}</div>
                                      <div className="text-sm text-muted-foreground">Exhausted Credits</div>
                                    </CardContent>
                                  </Card>
                                </div>

                                {/* Users Table */}
                                <div>
                                  <h3 className="text-lg font-semibold mb-4 text-foreground">Signups</h3>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="text-foreground">Email</TableHead>
                                        <TableHead className="text-foreground">Signup Date</TableHead>
                                        <TableHead className="text-foreground">Credits Used</TableHead>
                                        <TableHead className="text-foreground">Remaining</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {usages.map((usage) => (
                                        <TableRow key={usage.user_id}>
                                          <TableCell className="text-muted-foreground">{usage.email}</TableCell>
                                          <TableCell className="text-muted-foreground">
                                            {format(new Date(usage.signup_timestamp), 'MMM dd, yyyy')}
                                          </TableCell>
                                          <TableCell className="text-muted-foreground">{usage.credits_spent}</TableCell>
                                          <TableCell className="text-muted-foreground">
                                            {usage.credited_amount - usage.credits_spent}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            )}
                          </SheetContent>
                        </Sheet>
                        {!link.revoked && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => revokeLink(link.id)}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}