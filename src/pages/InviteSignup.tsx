import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { CharisLoader } from "@/components/ui/charis-loader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function InviteSignup() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [signingUp, setSigningUp] = useState(false);

  useEffect(() => {
    validateInvite();
  }, [slug]);

  const validateInvite = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('validate-invite', {
        body: { slug },
      });

      if (error) throw error;

      if (data.valid) {
        setValid(true);
        setInviteId(data.invite_id);
      } else {
        setError(data.error || 'Invalid invite link');
      }
    } catch (err: any) {
      console.error('Validation error:', err);
      setError('Failed to validate invite link');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !fullName) {
      toast.error('Please fill in all fields');
      return;
    }

    setSigningUp(true);

    try {
      // Sign up with metadata
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            invite_id: inviteId,
            bypass_paywall: true,
          },
          emailRedirectTo: `${window.location.origin}/app`,
        },
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        // Record invite usage
        await supabase.functions.invoke('record-invite-usage', {
          body: {
            invite_id: inviteId,
            user_id: authData.user.id,
          },
        });

        // Create profile
        await supabase.from('profiles').insert({
          user_id: authData.user.id,
          full_name: fullName,
          email: email,
        });

        toast.success('Account created successfully!');
        navigate('/app');
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
      <div className="min-h-screen flex items-center justify-center">
        <CharisLoader size="lg" />
      </div>
    );
  }

  if (!valid || error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Invalid Invite Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Create Your Account
          </CardTitle>
          <CardDescription>
            You've been invited! Sign up to get started without a subscription.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={signingUp}>
              {signingUp ? (
                <>
                  <CharisLoader size="sm" className="mr-2" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
