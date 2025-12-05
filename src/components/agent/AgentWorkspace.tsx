import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table2, 
  Plus, 
  TrendingUp, 
  Target, 
  Lightbulb, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";

interface AgentWorkspaceProps {
  data: any;
  session: any;
}

export function AgentWorkspace({ data, session }: AgentWorkspaceProps) {
  // Empty state when no data
  if (!session || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center max-w-sm px-8">
          {/* Table Icon - Minimal line style */}
          <div className="w-14 h-14 mx-auto mb-5 flex items-center justify-center border border-border/60 rounded-lg">
            <Table2 className="h-6 w-6 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          
          <h3 className="text-base font-medium text-foreground mb-2">
            No columns in this table yet
          </h3>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            Start by adding enrichments or ask Charis agent to help you get started!
          </p>
          
          <Button variant="default" className="rounded-lg shadow-sm h-9 px-4 text-sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Column
          </Button>
        </div>
      </div>
    );
  }

  // Handle synthesis output structure
  const hasSynthesis = data.synthesisId || data.suggestedScripts || data.adAnalyses;

  if (!hasSynthesis) {
    return (
      <ScrollArea className="h-full bg-white">
        <div className="p-6">
          <Card className="p-6 border-border/40">
            <h3 className="text-lg font-semibold mb-4">Raw Output</h3>
            <pre className="text-xs bg-muted/30 p-4 rounded-lg overflow-auto border border-border/30">
              {JSON.stringify(data, null, 2)}
            </pre>
          </Card>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full bg-white">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="pb-4 border-b border-border/40">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <h2 className="text-xl font-semibold text-foreground">Analysis Complete</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {data.brandName && `Analysis for ${data.brandName}`}
            {data.competitorSummary && ` • ${data.competitorSummary.totalCompetitors} competitors • ${data.competitorSummary.totalAdsAnalyzed} ads analyzed`}
          </p>
        </div>

        <Tabs defaultValue="scripts" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted/20 rounded-lg p-1">
            <TabsTrigger value="scripts" className="text-sm rounded-md">Scripts</TabsTrigger>
            <TabsTrigger value="analysis" className="text-sm rounded-md">Analysis</TabsTrigger>
            <TabsTrigger value="insights" className="text-sm rounded-md">Insights</TabsTrigger>
            <TabsTrigger value="trends" className="text-sm rounded-md">Trends</TabsTrigger>
          </TabsList>

          {/* UGC Scripts */}
          <TabsContent value="scripts" className="space-y-4 mt-4">
            {data.suggestedScripts && data.suggestedScripts.length > 0 ? (
              data.suggestedScripts.map((script: any, index: number) => (
                <Card key={index} className="p-5 border-border/40">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{script.scriptTitle}</h3>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">{script.scriptDuration}</Badge>
                        <Badge variant="outline" className="text-xs">{script.targetAudience}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">Full Script</div>
                      <p className="text-sm whitespace-pre-line bg-muted/20 p-3 rounded-lg border border-border/30">
                        {script.fullScript}
                      </p>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">Hook</div>
                      <p className="text-sm font-medium bg-primary/5 p-3 rounded-lg border border-primary/10">
                        {script.hookSuggestion}
                      </p>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">CTA</div>
                      <p className="text-sm font-medium bg-green-50 p-3 rounded-lg border border-green-100">
                        {script.ctaSuggestion}
                      </p>
                    </div>

                    {script.visualGuidelines && script.visualGuidelines.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2">Visual Guidelines</div>
                        <ul className="list-disc list-inside space-y-1">
                          {script.visualGuidelines.map((guideline: string, i: number) => (
                            <li key={i} className="text-sm text-foreground">{guideline}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">Why It Works</div>
                      <p className="text-sm bg-muted/10 p-3 rounded-lg italic text-muted-foreground">
                        {script.whyItWorks}
                      </p>
                    </div>

                    {script.inspiredBy && (
                      <div className="text-xs text-muted-foreground">
                        Inspired by: {script.inspiredBy}
                      </div>
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No scripts generated yet
              </div>
            )}
          </TabsContent>

          {/* Ad Analysis */}
          <TabsContent value="analysis" className="space-y-4 mt-4">
            {data.adAnalyses && data.adAnalyses.length > 0 ? (
              data.adAnalyses.map((analysis: any, index: number) => (
                <Card key={index} className="p-5 border-border/40">
                  <div className="flex items-start gap-4">
                    {analysis.videoUrl && (
                      <div className="flex-shrink-0">
                        <video 
                          src={analysis.videoUrl} 
                          controls 
                          className="w-44 h-28 rounded-lg object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{analysis.advertiser}</h3>
                        <div className="text-xs text-muted-foreground">Ad ID: {analysis.adId}</div>
                      </div>

                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Hook</div>
                        <p className="text-sm bg-primary/5 p-2 rounded-lg">
                          {analysis.hookAnalysis?.hookText}
                        </p>
                        <div className="text-xs text-muted-foreground mt-1">
                          Effectiveness: {analysis.hookAnalysis?.effectiveness}/10 • 
                          Type: {analysis.hookAnalysis?.hookType}
                        </div>
                      </div>

                      {analysis.keyTakeaways && analysis.keyTakeaways.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">Key Takeaways</div>
                          <ul className="list-disc list-inside space-y-1">
                            {analysis.keyTakeaways.map((takeaway: string, i: number) => (
                              <li key={i} className="text-sm text-foreground">{takeaway}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No ad analysis available
              </div>
            )}
          </TabsContent>

          {/* Insights */}
          <TabsContent value="insights" className="space-y-4 mt-4">
            {data.insights ? (
              <>
                {data.insights.marketTrends && data.insights.marketTrends.length > 0 && (
                  <Card className="p-5 border-border/40">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      <h3 className="text-base font-semibold text-foreground">Market Trends</h3>
                    </div>
                    <ul className="space-y-2">
                      {data.insights.marketTrends.map((trend: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-foreground">{trend}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {data.insights.opportunityGaps && data.insights.opportunityGaps.length > 0 && (
                  <Card className="p-5 border-border/40">
                    <div className="flex items-center gap-2 mb-4">
                      <Lightbulb className="h-5 w-5 text-yellow-500" />
                      <h3 className="text-base font-semibold text-foreground">Opportunity Gaps</h3>
                    </div>
                    <ul className="space-y-2">
                      {data.insights.opportunityGaps.map((gap: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-foreground">{gap}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {data.insights.competitiveAdvantages && data.insights.competitiveAdvantages.length > 0 && (
                  <Card className="p-5 border-border/40">
                    <div className="flex items-center gap-2 mb-4">
                      <Target className="h-5 w-5 text-green-500" />
                      <h3 className="text-base font-semibold text-foreground">Competitive Advantages</h3>
                    </div>
                    <ul className="space-y-2">
                      {data.insights.competitiveAdvantages.map((advantage: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-foreground">{advantage}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No insights available
              </div>
            )}
          </TabsContent>

          {/* Trends & Recommendations */}
          <TabsContent value="trends" className="space-y-4 mt-4">
            {data.competitorSummary && (
              <Card className="p-5 border-border/40">
                <h3 className="text-base font-semibold text-foreground mb-4">Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {data.competitorSummary.totalCompetitors}
                    </div>
                    <div className="text-sm text-muted-foreground">Competitors Analyzed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {data.competitorSummary.totalAdsAnalyzed}
                    </div>
                    <div className="text-sm text-muted-foreground">Ads Processed</div>
                  </div>
                </div>
              </Card>
            )}

            {data.competitorSummary?.keyTrends && data.competitorSummary.keyTrends.length > 0 && (
              <Card className="p-5 border-border/40">
                <h3 className="text-base font-semibold text-foreground mb-4">Key Trends</h3>
                <div className="flex flex-wrap gap-2">
                  {data.competitorSummary.keyTrends.map((trend: string, i: number) => (
                    <Badge key={i} variant="secondary">{trend}</Badge>
                  ))}
                </div>
              </Card>
            )}

            {data.recommendations && (
              <Card className="p-5 border-border/40">
                <h3 className="text-base font-semibold text-foreground mb-4">Recommendations</h3>
                <div className="space-y-4">
                  {data.recommendations.topPerformingPatterns && data.recommendations.topPerformingPatterns.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        Top Performing Patterns
                      </div>
                      <ul className="space-y-1">
                        {data.recommendations.topPerformingPatterns.map((pattern: string, i: number) => (
                          <li key={i} className="text-sm flex items-start gap-2 text-foreground">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            {pattern}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {data.recommendations.avoidPatterns && data.recommendations.avoidPatterns.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        Patterns to Avoid
                      </div>
                      <ul className="space-y-1">
                        {data.recommendations.avoidPatterns.map((pattern: string, i: number) => (
                          <li key={i} className="text-sm flex items-start gap-2 text-foreground">
                            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                            {pattern}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
