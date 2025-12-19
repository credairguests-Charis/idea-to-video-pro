import { useState } from "react";
import { Check, ArrowLeft, Sparkles, Zap, Crown, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { CharisLoader } from "@/components/ui/charis-loader";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: string;
  period: string;
  icon: React.ElementType;
  features: string[];
  priceId?: string;
  popular?: boolean;
  comingSoon?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    description: "Perfect for getting started",
    price: "$0",
    period: "forever",
    icon: Sparkles,
    features: [
      "210 free credits on signup",
      "3 AI video generations",
      "Access to basic actors",
      "Standard quality exports",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For serious content creators",
    price: "$500",
    period: "one-time",
    icon: Zap,
    priceId: "price_1SEt7IHtRqlJeQR0AMEVMy6T",
    popular: true,
    features: [
      "Unlimited AI video generations",
      "Full access to all AI actors",
      "HD and 4K video quality",
      "Priority processing queue",
      "Advanced customization options",
      "Commercial usage rights",
      "Priority email support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For teams and agencies",
    price: "Custom",
    period: "per month",
    icon: Crown,
    comingSoon: true,
    features: [
      "Everything in Pro",
      "Dedicated account manager",
      "Custom actor creation",
      "API access",
      "White-label options",
      "SLA guarantees",
      "Phone & chat support",
    ],
  },
];

export default function UpgradePlans() {
  const { user, subscriptionStatus } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubscribe = async (plan: Plan) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!plan.priceId || plan.comingSoon) {
      toast({
        title: "Coming Soon",
        description: "This plan will be available soon!",
      });
      return;
    }

    setLoading(plan.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: plan.priceId },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      console.error("Subscribe error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoading("manage");
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to open customer portal",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-16">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)} 
            className="inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
            <Rocket className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Upgrade Your Experience</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Scale your content creation with our flexible plans. Start free, upgrade anytime.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = subscriptionStatus?.subscribed && plan.id === "pro";
            const isFreePlan = plan.id === "free";
            
            return (
              <Card 
                key={plan.id} 
                className={cn(
                  "relative flex flex-col transition-all hover:shadow-lg",
                  plan.popular && "border-primary shadow-primary/20 shadow-lg scale-105",
                  isCurrentPlan && "ring-2 ring-primary"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4">
                      Most Popular
                    </Badge>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <Badge variant="outline" className="bg-background">
                      Current Plan
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className={cn(
                    "mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4",
                    plan.popular ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                  )}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ml-2">/{plan.period}</span>
                  </div>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  {isCurrentPlan ? (
                    <Button 
                      onClick={handleManageSubscription} 
                      variant="outline" 
                      className="w-full"
                      disabled={loading === "manage"}
                    >
                      {loading === "manage" ? (
                        <>
                          <CharisLoader size="sm" className="mr-2" />
                          Loading...
                        </>
                      ) : (
                        "Manage Subscription"
                      )}
                    </Button>
                  ) : isFreePlan ? (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      disabled
                    >
                      Current Plan
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleSubscribe(plan)}
                      disabled={loading === plan.id || plan.comingSoon}
                      className={cn(
                        "w-full",
                        plan.popular && "bg-primary hover:bg-primary/90"
                      )}
                      variant={plan.popular ? "default" : "outline"}
                    >
                      {loading === plan.id ? (
                        <>
                          <CharisLoader size="sm" className="mr-2" />
                          Processing...
                        </>
                      ) : plan.comingSoon ? (
                        "Coming Soon"
                      ) : (
                        "Get Started"
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            Questions? Contact us at{" "}
            <a href="mailto:support@usecharis.com" className="text-primary hover:underline">
              support@usecharis.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
