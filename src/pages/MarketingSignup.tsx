import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface MarketingLink {
  valid: boolean;
  error?: string;
  link_id?: string;
  title?: string;
  initial_credits?: number;
  logos?: Array<{ logo_url: string; display_order: number }>;
}

const STATIC_SOCIAL_LOGOS = [
  "/badges/ms-startups-badge.png",
  // Add more static social proof logos here as needed
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!linkData?.valid || linkData.error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Invalid Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{linkData.error}</AlertDescription>
            </Alert>
            <Button className="w-full mt-4" onClick={() => navigate('/auth')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <img 
            src="/src/assets/charis-logo-new.png" 
            alt="Charis" 
            className="h-12 w-auto"
          />
        </div>

        {/* Main Signup Card */}
        <Card className="border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              Get Free Video Generation Credits
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              No card required — You get {linkData.initial_credits} free credits, enough for 3 full video generations and agent usage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="border-border bg-background text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="border-border bg-background text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="border-border bg-background text-foreground"
                />
              </div>
              <Button type="submit" className="w-full" disabled={signingUp}>
                {signingUp ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Free Account'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Dynamic Customer Logos */}
        {linkData.logos && linkData.logos.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Trusted By
            </h3>
            <div className="flex flex-wrap justify-center items-center gap-6">
              {linkData.logos
                .sort((a, b) => a.display_order - b.display_order)
                .map((logo, index) => (
                  <img
                    key={index}
                    src={logo.logo_url}
                    alt={`Customer logo ${index + 1}`}
                    className="h-12 w-auto object-contain grayscale opacity-60 hover:opacity-100 transition-opacity"
                  />
                ))}
            </div>
          </div>
        )}

        {/* Static Social Proof Logos */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h3 className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Featured In
          </h3>
          <div className="flex flex-wrap justify-center items-center gap-8">
            {STATIC_SOCIAL_LOGOS.map((logo, index) => (
              <img
                key={index}
                src={logo}
                alt={`Social proof logo ${index + 1}`}
                className="h-10 w-auto object-contain grayscale opacity-70"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}