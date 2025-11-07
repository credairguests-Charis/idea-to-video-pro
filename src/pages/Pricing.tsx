import { useState, useEffect } from "react";
import { Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
export default function Pricing() {
  const {
    user,
    subscriptionStatus,
    checkSubscription
  } = useAuth();
  const [loading, setLoading] = useState(false);
  const {
    toast
  } = useToast();
  const navigate = useNavigate();

  // Refresh subscription status on mount
  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user, checkSubscription]);

  // Redirect if already subscribed
  useEffect(() => {
    if (subscriptionStatus?.subscribed) {
      const timer = setTimeout(() => navigate("/app"), 2000);
      return () => clearTimeout(timer);
    }
  }, [subscriptionStatus, navigate]);

  // Arcads Pro subscription price ID from Stripe
  const ARCADS_PRO_PRICE_ID = "price_1SEt7IHtRqlJeQR0AMEVMy6T";
  const handleSubscribe = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setLoading(true);
    try {
      console.info('[Pricing] Creating checkout session', {
        priceId: ARCADS_PRO_PRICE_ID
      });
      const {
        data,
        error
      } = await supabase.functions.invoke("create-checkout", {
        body: {
          priceId: ARCADS_PRO_PRICE_ID
        }
      });
      if (error) {
        console.error('[Pricing] create-checkout error', error);
        throw error;
      }
      console.info('[Pricing] create-checkout response', data);
      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('[Pricing] Subscribe failed', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to open customer portal",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const features = ["Unlimited AI video generations", "Full access to all AI actors", "HD and 4K video quality", "Priority processing queue", "Advanced customization options", "Commercial usage rights", "Email support", "API access (coming soon)"];
  return <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-16">
        {!user && <div className="mb-6">
            <Button variant="ghost" onClick={() => navigate('/auth')} className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Button>
          </div>}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-muted-foreground text-lg">
            One plan with everything you need to create professional AI videos
          </p>
        </div>

        {!user && <Alert className="max-w-lg mx-auto mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please <a href="/auth" className="underline font-medium">sign in or create an account</a> to subscribe
            </AlertDescription>
          </Alert>}

        {subscriptionStatus?.subscribed && <Alert className="max-w-lg mx-auto mb-8 bg-primary/10 border-primary">
            <Check className="h-4 w-4 text-primary" />
            <AlertDescription className="text-primary">
              You're already subscribed! Redirecting to dashboard...
            </AlertDescription>
          </Alert>}

        <div className="max-w-lg mx-auto">
          <Card className={subscriptionStatus?.subscribed ? "border-primary shadow-lg" : ""}>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl">Charis Pro</CardTitle>
              <CardDescription className="text-2xl font-bold mt-2">
                $500<span className="text-base font-normal text-muted-foreground">/month</span>
              </CardDescription>
              {subscriptionStatus?.subscribed && <div className="mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
                    Active Plan
                  </span>
                </div>}
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {features.map((feature, index) => <li key={index} className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">{feature}</span>
                  </li>)}
              </ul>
            </CardContent>
            <CardFooter>
              {subscriptionStatus?.subscribed ? <Button onClick={handleManageSubscription} disabled={loading} className="w-full" variant="outline">
                  {loading ? "Loading..." : "Manage Subscription"}
                </Button> : <Button onClick={handleSubscribe} disabled={loading} className="w-full" size="lg">
                  {loading ? "Loading..." : "Get Started"}
                </Button>}
            </CardFooter>
          </Card>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>All plans include a 7-day money-back guarantee</p>
            <p className="mt-2">Questions? Contact us at support@usecharis.com</p>
          </div>
        </div>
      </div>
    </div>;
}