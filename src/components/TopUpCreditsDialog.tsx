import { useState } from "react";
import { Coins, Sparkles, Check } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CharisLoader } from "@/components/ui/charis-loader";
import { cn } from "@/lib/utils";

interface CreditPackage {
  id: string;
  credits: number;
  price: string;
  videos: number;
  popular?: boolean;
}

const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "small", credits: 350, price: "$25", videos: 5 },
  { id: "medium", credits: 700, price: "$45", videos: 10, popular: true },
  { id: "large", credits: 1400, price: "$80", videos: 20 },
];

interface TopUpCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TopUpCreditsDialog({ open, onOpenChange }: TopUpCreditsDialogProps) {
  const [selectedPackage, setSelectedPackage] = useState<string>("medium");
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-credit-topup", {
        body: { packageId: selectedPackage },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
        onOpenChange(false);
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      console.error("Top up error:", err);
      toast.error(err.message || "Failed to create checkout session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Top Up Credits
          </DialogTitle>
          <DialogDescription>
            Choose a credit package to continue creating amazing videos
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {CREDIT_PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg.id)}
              className={cn(
                "relative flex items-center justify-between p-4 rounded-lg border-2 transition-all text-left",
                selectedPackage === pkg.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-accent/50"
              )}
            >
              {pkg.popular && (
                <div className="absolute -top-2 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Popular
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0",
                  selectedPackage === pkg.id ? "border-primary bg-primary" : "border-muted-foreground"
                )}>
                  {selectedPackage === pkg.id && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    {pkg.credits} Credits
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ~{pkg.videos} videos
                  </div>
                </div>
              </div>
              
              <div className="text-xl font-bold text-foreground">
                {pkg.price}
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handlePurchase} disabled={loading} className="flex-1">
            {loading ? (
              <>
                <CharisLoader size="sm" className="mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Coins className="h-4 w-4 mr-2" />
                Purchase Credits
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Secure payment powered by Stripe. Credits never expire.
        </p>
      </DialogContent>
    </Dialog>
  );
}
