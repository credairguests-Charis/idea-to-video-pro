import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, CheckCircle } from "lucide-react";
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
      // Sign up
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
        // Create profile
        await supabase.from('profiles').insert({
          user_id: authData.user.id,
          full_name: fullName,
          email: email,
          credits: 0, // Will be set by edge function
        });

        // Record marketing signup and grant credits
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
        navigate('/');
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
        <div className="w-full max-w-md p-8 rounded-lg border border-border bg-card">
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
  const ogImage = linkData.og_image_url || '/charis-logo-marketing.png';
  const pageTitle = linkData.title ? `${linkData.title} - Get ${linkData.initial_credits} Free Credits` : `Get ${linkData.initial_credits} Free Credits - Charis`;
  const pageDescription = `Sign up now and receive ${linkData.initial_credits} free credits. No credit card required. Create stunning AI-generated UGC video ads in minutes.`;

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Open Graph Meta Tags for Social Sharing */}
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={pageUrl} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>

      {/* Logo Section - Fixed at top */}
      <div className="flex-shrink-0 py-6 px-4 border-b border-border">
        <div className="flex justify-center">
          <img 
            src="/charis-logo-marketing.png" 
            alt="Charis" 
            className="h-16 w-auto"
          />
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-8">
          {/* Headline */}
          <div className="text-center mb-8">
            <p className="text-muted-foreground text-base">
              Sign Up and get up to {linkData.initial_credits} credit, No card required
            </p>
          </div>

          {/* Signup Form - Centered and Modular */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-8">
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
            <div className="mb-8">
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
          <div className="pt-8 border-t border-border">
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
  );
}