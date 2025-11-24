import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Play, Loader2 } from "lucide-react";

interface AgentInputProps {
  onSubmit: (brandData: any) => void;
  isRunning: boolean;
}

export function AgentInput({ onSubmit, isRunning }: AgentInputProps) {
  const [brandName, setBrandName] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [brandVoice, setBrandVoice] = useState("");
  const [keyMessages, setKeyMessages] = useState("");
  const [competitorQuery, setCompetitorQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!brandName || !competitorQuery) {
      return;
    }

    onSubmit({
      brandName,
      productCategory,
      targetAudience,
      brandVoice,
      keyMessages: keyMessages.split(",").map((m) => m.trim()).filter(Boolean),
      competitorQuery,
      maxCompetitors: 3,
    });
  };

  return (
    <div className="p-4 border-t border-border/50 bg-card">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="brandName" className="text-xs font-medium">
              Brand Name *
            </Label>
            <Input
              id="brandName"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Acme Corp"
              disabled={isRunning}
              required
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="productCategory" className="text-xs font-medium">
              Product Category
            </Label>
            <Input
              id="productCategory"
              value={productCategory}
              onChange={(e) => setProductCategory(e.target.value)}
              placeholder="SaaS, E-commerce, etc."
              disabled={isRunning}
              className="h-9 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="targetAudience" className="text-xs font-medium">
              Target Audience
            </Label>
            <Input
              id="targetAudience"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="B2B marketers, developers"
              disabled={isRunning}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brandVoice" className="text-xs font-medium">
              Brand Voice
            </Label>
            <Input
              id="brandVoice"
              value={brandVoice}
              onChange={(e) => setBrandVoice(e.target.value)}
              placeholder="Professional, friendly"
              disabled={isRunning}
              className="h-9 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="keyMessages" className="text-xs font-medium">
            Key Messages (comma-separated)
          </Label>
          <Input
            id="keyMessages"
            value={keyMessages}
            onChange={(e) => setKeyMessages(e.target.value)}
            placeholder="Fast, Reliable, Secure"
            disabled={isRunning}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="competitorQuery" className="text-xs font-medium">
            Competitor Query *
          </Label>
          <Textarea
            id="competitorQuery"
            value={competitorQuery}
            onChange={(e) => setCompetitorQuery(e.target.value)}
            placeholder="marketing automation SaaS competitors"
            disabled={isRunning}
            required
            className="h-20 text-sm resize-none"
          />
        </div>

        <Button
          type="submit"
          disabled={isRunning || !brandName || !competitorQuery}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Workflow...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Start Agent Workflow
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
