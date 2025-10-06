import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Link, Gift, Key, Activity } from "lucide-react";

interface QuickActionsProps {
  onCreatePromo: () => void;
  onCreatePromoLink: () => void;
  onCreateLifetimeDeal: () => void;
  onCreateBypassLink: () => void;
  onRunHealthCheck: () => void;
}

export function QuickActions({
  onCreatePromo,
  onCreatePromoLink,
  onCreateLifetimeDeal,
  onCreateBypassLink,
  onRunHealthCheck
}: QuickActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <Button onClick={onCreatePromo} variant="outline" className="justify-start" size="sm">
          <Gift className="h-4 w-4 mr-2" />
          Create Promo Code
        </Button>
        <Button onClick={onCreatePromoLink} variant="outline" className="justify-start" size="sm">
          <Link className="h-4 w-4 mr-2" />
          Create Promo Link
        </Button>
        <Button onClick={onCreateLifetimeDeal} variant="outline" className="justify-start" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Create Lifetime Deal
        </Button>
        <Button onClick={onCreateBypassLink} variant="outline" className="justify-start" size="sm">
          <Key className="h-4 w-4 mr-2" />
          Create Admin Bypass Link
        </Button>
        <Button onClick={onRunHealthCheck} variant="outline" className="justify-start" size="sm">
          <Activity className="h-4 w-4 mr-2" />
          Run Health Check
        </Button>
      </CardContent>
    </Card>
  );
}
