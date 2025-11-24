import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, TrendingUp, Target, Video, FileText, Lightbulb, CheckCircle2, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AgentPreviewProps {
  data: any;
  session: any;
}

export function AgentPreview({ data, session }: AgentPreviewProps) {
  if (!session) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Ready to Analyze</h3>
          <p className="text-muted-foreground">
            Start the agent workflow to see competitor research, video analysis, 
            and UGC script recommendations here.
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="animate-pulse">
            <Brain className="h-16 w-16 text-primary mx-auto mb-4" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Analyzing competitors...</h3>
          <p className="text-muted-foreground">
            Researching Meta ads, processing videos, and generating insights.
          </p>
        </div>
      </div>
    );
  }

  // Handle synthesis output structure
  const hasSynthesis = data.synthesisId || data.suggestedScripts || data.adAnalyses;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {hasSynthesis ? (
          <>
            {/* Header */}
            <div className="pb-4 border-b border-border">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <h2 className="text-2xl font-bold">Workflow Complete</h2>
              </div>
              <p className="text-muted-foreground">
                {data.brandName && `Analysis for ${data.brandName}`}
                {data.competitorSummary && ` • ${data.competitorSummary.totalCompetitors} competitors • ${data.competitorSummary.totalAdsAnalyzed} ads analyzed`}
              </p>
            </div>

            <Tabs defaultValue="scripts" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="scripts">Scripts</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
                <TabsTrigger value="trends">Trends</TabsTrigger>
              </TabsList>

              {/* UGC Scripts */}
              <TabsContent value="scripts" className="space-y-4 mt-4">
                {data.suggestedScripts && data.suggestedScripts.length > 0 ? (
                  data.suggestedScripts.map((script: any, index: number) => (
                    <Card key={index} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{script.scriptTitle}</h3>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="secondary">{script.scriptDuration}</Badge>
                            <Badge variant="outline">{script.targetAudience}</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-2">Full Script</div>
                          <p className="text-sm whitespace-pre-line bg-muted/50 p-3 rounded">
                            {script.fullScript}
                          </p>
                        </div>

                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-2">Hook</div>
                          <p className="text-sm font-medium bg-primary/10 p-3 rounded">
                            {script.hookSuggestion}
                          </p>
                        </div>

                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-2">CTA</div>
                          <p className="text-sm font-medium bg-green-500/10 p-3 rounded">
                            {script.ctaSuggestion}
                          </p>
                        </div>

                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-2">Visual Guidelines</div>
                          <ul className="list-disc list-inside space-y-1">
                            {script.visualGuidelines?.map((guideline: string, i: number) => (
                              <li key={i} className="text-sm text-foreground">{guideline}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-2">Why It Works</div>
                          <p className="text-sm bg-muted/30 p-3 rounded italic">
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
                    <Card key={index} className="p-6">
                      <div className="flex items-start gap-4">
                        {analysis.videoUrl && (
                          <div className="flex-shrink-0">
                            <video 
                              src={analysis.videoUrl} 
                              controls 
                              className="w-48 h-32 rounded object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 space-y-3">
                          <div>
                            <h3 className="font-semibold">{analysis.advertiser}</h3>
                            <div className="text-xs text-muted-foreground">Ad ID: {analysis.adId}</div>
                          </div>

                          <div>
                            <div className="text-sm font-medium text-muted-foreground mb-1">Hook</div>
                            <p className="text-sm bg-primary/10 p-2 rounded">
                              {analysis.hookAnalysis?.hookText}
                            </p>
                            <div className="text-xs text-muted-foreground mt-1">
                              Effectiveness: {analysis.hookAnalysis?.effectiveness}/10 • 
                              Type: {analysis.hookAnalysis?.hookType}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-medium text-muted-foreground mb-1">Key Takeaways</div>
                            <ul className="list-disc list-inside space-y-1">
                              {analysis.keyTakeaways?.map((takeaway: string, i: number) => (
                                <li key={i} className="text-sm">{takeaway}</li>
                              ))}
                            </ul>
                          </div>
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
                {data.insights && (
                  <>
                    {data.insights.marketTrends && data.insights.marketTrends.length > 0 && (
                      <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <TrendingUp className="h-5 w-5 text-blue-500" />
                          <h3 className="text-lg font-semibold">Market Trends</h3>
                        </div>
                        <ul className="space-y-2">
                          {data.insights.marketTrends.map((trend: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{trend}</span>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    )}

                    {data.insights.opportunityGaps && data.insights.opportunityGaps.length > 0 && (
                      <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Lightbulb className="h-5 w-5 text-yellow-500" />
                          <h3 className="text-lg font-semibold">Opportunity Gaps</h3>
                        </div>
                        <ul className="space-y-2">
                          {data.insights.opportunityGaps.map((gap: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{gap}</span>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    )}

                    {data.insights.competitiveAdvantages && (
                      <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Target className="h-5 w-5 text-green-500" />
                          <h3 className="text-lg font-semibold">Competitive Advantages</h3>
                        </div>
                        <ul className="space-y-2">
                          {data.insights.competitiveAdvantages.map((advantage: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{advantage}</span>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Trends & Recommendations */}
              <TabsContent value="trends" className="space-y-4 mt-4">
                {data.competitorSummary && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Summary</h3>
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

                {data.competitorSummary?.keyTrends && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Key Trends</h3>
                    <div className="flex flex-wrap gap-2">
                      {data.competitorSummary.keyTrends.map((trend: string, i: number) => (
                        <Badge key={i} variant="secondary">{trend}</Badge>
                      ))}
                    </div>
                  </Card>
                )}

                {data.recommendations && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
                    <div className="space-y-4">
                      {data.recommendations.topPerformingPatterns && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-2">
                            Top Performing Patterns
                          </div>
                          <ul className="space-y-1">
                            {data.recommendations.topPerformingPatterns.map((pattern: string, i: number) => (
                              <li key={i} className="text-sm flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                {pattern}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {data.recommendations.avoidPatterns && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-2">
                            Patterns to Avoid
                          </div>
                          <ul className="space-y-1">
                            {data.recommendations.avoidPatterns.map((pattern: string, i: number) => (
                              <li key={i} className="text-sm flex items-start gap-2">
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
          </>
        ) : (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Raw Output</h3>
            <pre className="text-xs bg-muted p-4 rounded overflow-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
