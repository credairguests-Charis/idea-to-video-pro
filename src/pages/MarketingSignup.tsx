import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Gift, Sparkles, ArrowRight } from "lucide-react";
import { CharisLoader } from "@/components/ui/charis-loader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface MarketingLink {
  valid: boolean;
  error?: string;
  link_id?: string;
  title?: string;
  initial_credits?: number;
  logos?: Array<{ logo_url: string; display_order: number }>;
  og_image_url?: string;
  og_thumbnail_url?: string;
}

const STATIC_SOCIAL_LOGOS = [
  { name: "Nike", url: "https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg" },
  { name: "Adidas", url: "https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg" },
  { name: "Coca-Cola", url: "https://upload.wikimedia.org/wikipedia/commons/c/ce/Coca-Cola_logo.svg" },
  { name: "Apple", url: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
  { name: "Samsung", url: "https://upload.wikimedia.org/wikipedia/commons/b/b4/Samsung_wordmark.svg" },
];

export default function MarketingSignup() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [linkData, setLinkData] = useState<MarketingLink | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [signingUp, setSigningUp] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    validateLink();
    recordClick();
  }, [slug]);

  const validateLink = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('validate-marketing-link', {
        body: { slug },
      });

      if (error) throw error;

      setLinkData(data);
    } catch (err: any) {
      console.error('Validation error:', err);
      setLinkData({ valid: false, error: 'Failed to validate link' });
    } finally {
      setLoading(false);
    }
  };

  const recordClick = async () => {
    try {
      await supabase.functions.invoke('record-marketing-click', {
        body: { 
          slug,
          user_agent: navigator.userAgent
        },
      });
    } catch (err) {
      console.error('Error recording click:', err);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !fullName) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!linkData?.link_id) {
      toast.error('Invalid marketing link');
      return;
    }

    setSigningUp(true);

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            marketing_link_id: linkData.link_id,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        // Create profile with credits from marketing link
        await supabase.from('profiles').insert({
          user_id: authData.user.id,
          full_name: fullName,
          email: email,
          credits: linkData.initial_credits || 210,
        });

        await supabase.functions.invoke('record-marketing-signup', {
          body: {
            link_id: linkData.link_id,
            user_id: authData.user.id,
            device_info: navigator.userAgent,
            referrer: document.referrer,
            utm_parameters: {}
          },
        });

        toast.success(`Account created! You've received ${linkData.initial_credits} free credits.`);
        navigate('/app/projects');
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      toast.error(err.message || 'Failed to create account');
    } finally {
      setSigningUp(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <CharisLoader size="lg" />
      </div>
    );
  }

  if (!linkData?.valid || linkData.error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md p-8 rounded-lg border border-border bg-card animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <h2 className="text-xl font-semibold text-foreground">Invalid Link</h2>
          </div>
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{linkData.error}</AlertDescription>
          </Alert>
          <Button className="w-full" onClick={() => navigate('/auth')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  const pageUrl = `${window.location.origin}/marketing/${slug}`;
  const ogMedia = linkData.og_image_url || '/charis-logo-marketing.png';
  const hasGiftCard = !!linkData.og_image_url;
  const pageTitle = linkData.title ? `${linkData.title} - Get ${linkData.initial_credits} Free Credits` : `Get ${linkData.initial_credits} Free Credits - Charis`;
  const pageDescription = `Sign up now and receive ${linkData.initial_credits} free credits. No credit card required. Create stunning AI-generated UGC video ads in minutes.`;

  // Detect media type
  const isVideo = ogMedia && ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'].some(ext => ogMedia.toLowerCase().includes(ext));
  const isGif = ogMedia && ogMedia.toLowerCase().includes('.gif');
  
  // Use thumbnail for social preview if video, otherwise use the media itself
  const socialPreviewImage = isVideo && linkData.og_thumbnail_url 
    ? linkData.og_thumbnail_url 
    : ogMedia;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:type" content={isVideo ? "video.other" : "website"} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        {isVideo ? (
          <>
            <meta property="og:video" content={ogMedia} />
            <meta property="og:video:type" content="video/mp4" />
            <meta property="og:video:width" content="1200" />
            <meta property="og:video:height" content="630" />
            {/* Use thumbnail for og:image fallback */}
            <meta property="og:image" content={socialPreviewImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
          </>
        ) : (
          <>
            <meta property="og:image" content={ogMedia} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
          </>
        )}
        <meta name="twitter:card" content={isVideo ? "player" : "summary_large_image"} />
        <meta name="twitter:url" content={pageUrl} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        {isVideo ? (
          <>
            <meta name="twitter:player" content={ogMedia} />
            <meta name="twitter:player:width" content="1200" />
            <meta name="twitter:player:height" content="630" />
            {/* Use thumbnail for twitter:image fallback */}
            <meta name="twitter:image" content={socialPreviewImage} />
          </>
        ) : (
          <meta name="twitter:image" content={ogMedia} />
        )}
      </Helmet>

      {hasGiftCard ? (
        /* Premium Split Layout with Gift Card */
        <div className="min-h-screen flex flex-col lg:flex-row">
          {/* Left Side - Gift Card Hero */}
          <div className="relative lg:w-1/2 bg-gradient-to-br from-primary/10 via-primary/5 to-background flex items-center justify-center p-6 lg:p-12 overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
              <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
              <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
              <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
              <div className="absolute bottom-1/3 left-1/3 w-3 h-3 bg-primary/30 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
            </div>

            <div className="relative z-10 w-full max-w-lg">
              {/* Exclusive Badge */}
              <div className="flex justify-center mb-6 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
                  <Gift className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Exclusive Gift For You</span>
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
              </div>

              {/* Gift Card Container - 9:16 aspect ratio like video gallery */}
              <div 
                className={`relative group transition-all duration-700 flex justify-center ${imageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              >
                {/* Card with fixed width for 9:16 aspect ratio */}
                <div className="relative w-[220px] sm:w-[260px]">
                  {/* Glow Effect Behind Card */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-2xl blur-2xl transform group-hover:scale-105 transition-transform duration-500" />
                  
                  {/* 9:16 Aspect Ratio Container */}
                  <div className="relative w-full" style={{ paddingBottom: "177.78%" }}>
                    <div className="absolute inset-0 bg-card rounded-2xl overflow-hidden shadow-2xl border border-border/50 transform transition-all duration-500 hover:scale-[1.02] hover:shadow-primary/20 hover:shadow-3xl">
                      {isVideo ? (
                        <video
                          src={linkData.og_image_url}
                          className="w-full h-full object-cover"
                          autoPlay
                          loop
                          muted
                          playsInline
                          onLoadedData={() => setImageLoaded(true)}
                        />
                      ) : (
                        <img
                          src={linkData.og_image_url}
                          alt={linkData.title || "Your exclusive gift"}
                          className="w-full h-full object-cover"
                          onLoad={() => setImageLoaded(true)}
                        />
                      )}
                      
                      {/* Shine Effect */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Floating Credit Badge */}
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 animate-fade-in z-10" style={{ animationDelay: '0.3s' }}>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      <span className="font-bold text-lg">{linkData.initial_credits} Free Credits</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Campaign Title */}
              {linkData.title && (
                <h1 className="mt-12 text-2xl lg:text-3xl font-bold text-center text-foreground animate-fade-in" style={{ animationDelay: '0.4s' }}>
                  {linkData.title}
                </h1>
              )}

              <p className="mt-4 text-center text-muted-foreground animate-fade-in" style={{ animationDelay: '0.5s' }}>
                Claim your exclusive gift and start creating stunning AI-generated video ads
              </p>
            </div>
          </div>

          {/* Right Side - Signup Form */}
          <div className="lg:w-1/2 flex flex-col bg-background">
            {/* Logo */}
            <div className="py-6 px-4 border-b border-border">
              <div className="flex justify-center lg:justify-start lg:px-8">
                <img 
                  src="/charis-logo-marketing.png" 
                  alt="Charis" 
                  className="h-12 w-auto"
                />
              </div>
            </div>

            {/* Form Section */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
              <div className="w-full max-w-md animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="mb-8">
                  <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
                    Redeem Your Gift
                  </h2>
                  <p className="text-muted-foreground">
                    Create your free account to claim your {linkData.initial_credits} credits
                  </p>
                </div>

                <form onSubmit={handleSignup} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-foreground text-sm font-medium">
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      required
                      className="border-input bg-background text-foreground h-12 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground text-sm font-medium">
                      Work Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="border-input bg-background text-foreground h-12 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-foreground text-sm font-medium">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="border-input bg-background text-foreground h-12 text-base"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-semibold group" 
                    disabled={signingUp}
                  >
                    {signingUp ? (
                      <>
                        <CharisLoader size="sm" className="mr-2" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Claim My Gift
                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>

                <p className="mt-6 text-xs text-center text-muted-foreground">
                  No credit card required • Instant access
                </p>

                {/* Trust Badges */}
                <div className="mt-8 pt-8 border-t border-border">
                  <p className="text-xs text-center text-muted-foreground uppercase tracking-wider mb-4">
                    Trusted by leading brands
                  </p>
                  <div className="flex flex-wrap justify-center items-center gap-6">
                    {STATIC_SOCIAL_LOGOS.slice(0, 4).map((logo, index) => (
                      <img
                        key={index}
                        src={logo.url}
                        alt={logo.name}
                        className="h-5 w-auto object-contain grayscale opacity-40 hover:opacity-60 transition-opacity"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Standard Layout (No Gift Card) */
        <div className="min-h-screen flex flex-col overflow-hidden">
          {/* Logo Section */}
          <div className="flex-shrink-0 py-6 px-4 border-b border-border">
            <div className="flex justify-center">
              <img 
                src="/charis-logo-marketing.png" 
                alt="Charis" 
                className="h-16 w-auto"
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-md mx-auto px-4 py-8">
              {/* Headline */}
              <div className="text-center mb-8 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-4">
                  <Gift className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Special Offer</span>
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Get {linkData.initial_credits} Free Credits
                </h1>
                <p className="text-muted-foreground">
                  Sign up now, no credit card required
                </p>
              </div>

              {/* Signup Form */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-lg mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-foreground text-sm font-medium">
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      required
                      className="border-input bg-background text-foreground h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground text-sm font-medium">
                      Work Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="border-input bg-background text-foreground h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-foreground text-sm font-medium">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="border-input bg-background text-foreground h-11"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-11 text-base font-medium" 
                    disabled={signingUp}
                  >
                    {signingUp ? (
                      <>
                        <CharisLoader size="sm" className="mr-2" />
                        Creating Account...
                      </>
                    ) : (
                      'Get started free'
                    )}
                  </Button>
                </form>
              </div>

              {/* Dynamic Customer Logos */}
              {linkData.logos && linkData.logos.length > 0 && (
                <div className="mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                  <h3 className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                    Trusted By
                  </h3>
                  <div className="flex flex-wrap justify-center items-center gap-8">
                    {linkData.logos
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((logo, index) => (
                        <img
                          key={index}
                          src={logo.logo_url}
                          alt={`Customer logo ${index + 1}`}
                          className="h-8 w-auto object-contain grayscale opacity-50"
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Static Social Proof Logos */}
              <div className="pt-8 border-t border-border animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <h3 className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                  Trusted at companies large and small
                </h3>
                <div className="flex flex-wrap justify-center items-center gap-8">
                  {STATIC_SOCIAL_LOGOS.map((logo, index) => (
                    <img
                      key={index}
                      src={logo.url}
                      alt={logo.name}
                      className="h-6 w-auto object-contain grayscale opacity-40"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
