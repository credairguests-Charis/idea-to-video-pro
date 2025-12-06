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
  AlertCircle,
  Video,
  Eye
} from "lucide-react";
import { VideoGallery } from "./VideoGallery";

interface AgentWorkspaceProps {
  data: any;
  session: any;
  intermediateData?: {
    extractedAds?: any[];
    downloadedVideos?: any[];
    videoAnalyses?: any[];
  };
}

// Safe accessor for nested properties
const safeArray = (arr: any): any[] => Array.isArray(arr) ? arr : [];
const safeString = (val: any, fallback = ""): string => typeof val === "string" ? val : fallback;
const safeNumber = (val: any, fallback = 0): number => typeof val === "number" ? val : fallback;

export function AgentWorkspace({ data, session, intermediateData }: AgentWorkspaceProps) {
  // Extract intermediate data with safe defaults
  const extractedAds = safeArray(intermediateData?.extractedAds);
  const downloadedVideos = safeArray(intermediateData?.downloadedVideos);
  const videoAnalyses = safeArray(intermediateData?.videoAnalyses);
  
  // Transform downloaded videos for VideoGallery
  const videoItems = downloadedVideos.map((v: any) => ({
    url: v.url || v.video_url || v.videoUrl || "",
    thumbnailUrl: v.thumbnail_url || v.thumbnailUrl || v.thumbnail || "",
    title: v.title || v.ad_title || "Competitor Ad",
    advertiser: v.advertiser || v.advertiser_name || "",
    duration: v.duration || "",
    sourceUrl: v.source_url || v.sourceUrl || v.ad_url || "",
  })).filter((v: any) => v.url);

  // Also check for videos in final synthesis data
  const synthesisVideos = safeArray(data?.adAnalyses)
    .filter((ad: any) => ad.videoUrl || ad.video_url)
    .map((ad: any) => ({
      url: ad.videoUrl || ad.video_url || "",
      thumbnailUrl: ad.thumbnailUrl || ad.thumbnail_url || "",
      title: ad.title || "Analyzed Ad",
      advertiser: ad.advertiser || "",
      duration: ad.duration || "",
      sourceUrl: ad.sourceUrl || ad.source_url || "",
    }));

  const allVideos = [...videoItems, ...synthesisVideos].filter((v, i, arr) => 
    arr.findIndex(x => x.url === v.url) === i
  );
  // Empty state when no data - also handles null/undefined gracefully
  if (!data) {
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

  // Handle synthesis output structure - defensive checks
  const hasSynthesis = Boolean(
    data?.synthesisId || 
    (Array.isArray(data?.suggestedScripts) && data.suggestedScripts.length > 0) || 
    (Array.isArray(data?.adAnalyses) && data.adAnalyses.length > 0)
  );

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

  // Safely extract arrays and objects with fallbacks
  const suggestedScripts = safeArray(data?.suggestedScripts);
  const adAnalyses = safeArray(data?.adAnalyses);
  const insights = data?.insights || {};
  const marketTrends = safeArray(insights?.marketTrends);
  const opportunityGaps = safeArray(insights?.opportunityGaps);
  const competitiveAdvantages = safeArray(insights?.competitiveAdvantages);
  const competitorSummary = data?.competitorSummary || {};
  const keyTrends = safeArray(competitorSummary?.keyTrends);
  const recommendations = data?.recommendations || {};
  const topPerformingPatterns = safeArray(recommendations?.topPerformingPatterns);
  const avoidPatterns = safeArray(recommendations?.avoidPatterns);

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
            {data?.brandName && `Analysis for ${data.brandName}`}
            {competitorSummary?.totalCompetitors != null && ` • ${safeNumber(competitorSummary.totalCompetitors)} competitors`}
            {competitorSummary?.totalAdsAnalyzed != null && ` • ${safeNumber(competitorSummary.totalAdsAnalyzed)} ads analyzed`}
          </p>
        </div>

        <Tabs defaultValue={allVideos.length > 0 ? "preview" : "scripts"} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-muted/20 rounded-lg p-1">
            <TabsTrigger value="preview" className="text-sm rounded-md flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="scripts" className="text-sm rounded-md">Scripts</TabsTrigger>
            <TabsTrigger value="analysis" className="text-sm rounded-md">Analysis</TabsTrigger>
            <TabsTrigger value="insights" className="text-sm rounded-md">Insights</TabsTrigger>
            <TabsTrigger value="trends" className="text-sm rounded-md">Trends</TabsTrigger>
          </TabsList>

          {/* Live Preview Tab - Videos */}
          <TabsContent value="preview" className="space-y-4 mt-4">
            <Card className="p-5 border-border/40">
              <div className="flex items-center gap-2 mb-4">
                <Video className="h-5 w-5 text-purple-500" />
                <h3 className="text-base font-semibold text-foreground">Downloaded Competitor Ads</h3>
                {allVideos.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {allVideos.length} video{allVideos.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <VideoGallery 
                videos={allVideos}
                title=""
                emptyMessage="Videos will appear here as they are downloaded during analysis"
              />
            </Card>

            {/* Extracted Ads Preview */}
            {extractedAds.length > 0 && (
              <Card className="p-5 border-border/40">
                <h3 className="text-base font-semibold text-foreground mb-4">
                  Extracted Ads ({extractedAds.length})
                </h3>
                <div className="space-y-3 max-h-64 overflow-auto">
                  {extractedAds.slice(0, 10).map((ad: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-2 bg-muted/20 rounded-lg">
                      {ad.thumbnail_url && (
                        <img 
                          src={ad.thumbnail_url} 
                          alt="" 
                          className="w-16 h-10 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {ad.advertiser || ad.title || "Ad"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {ad.ad_copy || ad.description || ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Video Analyses Preview */}
            {videoAnalyses.length > 0 && (
              <Card className="p-5 border-border/40">
                <h3 className="text-base font-semibold text-foreground mb-4">
                  Video Analyses ({videoAnalyses.length})
                </h3>
                <div className="space-y-3">
                  {videoAnalyses.map((analysis: any, i: number) => (
                    <div key={i} className="p-3 bg-muted/20 rounded-lg">
                      <div className="text-sm font-medium mb-2">
                        {analysis.title || `Video ${i + 1}`}
                      </div>
                      {analysis.transcript && (
                        <div className="text-xs text-muted-foreground line-clamp-3">
                          {analysis.transcript.slice(0, 200)}...
                        </div>
                      )}
                      {analysis.scenes && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {analysis.scenes.length} scenes detected
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          {/* UGC Scripts */}
          <TabsContent value="scripts" className="space-y-4 mt-4">
            {suggestedScripts.length > 0 ? (
              suggestedScripts.map((script: any, index: number) => (
                <Card key={index} className="p-5 border-border/40">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        {safeString(script?.scriptTitle, "Untitled Script")}
                      </h3>
                      <div className="flex gap-2 mt-2">
                        {script?.scriptDuration && (
                          <Badge variant="secondary" className="text-xs">{script.scriptDuration}</Badge>
                        )}
                        {script?.targetAudience && (
                          <Badge variant="outline" className="text-xs">{script.targetAudience}</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {script?.fullScript && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2">Full Script</div>
                        <p className="text-sm whitespace-pre-line bg-muted/20 p-3 rounded-lg border border-border/30">
                          {script.fullScript}
                        </p>
                      </div>
                    )}

                    {script?.hookSuggestion && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2">Hook</div>
                        <p className="text-sm font-medium bg-primary/5 p-3 rounded-lg border border-primary/10">
                          {script.hookSuggestion}
                        </p>
                      </div>
                    )}

                    {script?.ctaSuggestion && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2">CTA</div>
                        <p className="text-sm font-medium bg-green-50 p-3 rounded-lg border border-green-100">
                          {script.ctaSuggestion}
                        </p>
                      </div>
                    )}

                    {safeArray(script?.visualGuidelines).length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2">Visual Guidelines</div>
                        <ul className="list-disc list-inside space-y-1">
                          {safeArray(script.visualGuidelines).map((guideline: string, i: number) => (
                            <li key={i} className="text-sm text-foreground">{guideline}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {script?.whyItWorks && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2">Why It Works</div>
                        <p className="text-sm bg-muted/10 p-3 rounded-lg italic text-muted-foreground">
                          {script.whyItWorks}
                        </p>
                      </div>
                    )}

                    {script?.inspiredBy && (
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
            {adAnalyses.length > 0 ? (
              adAnalyses.map((analysis: any, index: number) => (
                <Card key={index} className="p-5 border-border/40">
                  <div className="flex items-start gap-4">
                    {analysis?.videoUrl && (
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
                        <h3 className="font-semibold text-foreground">
                          {safeString(analysis?.advertiser, "Unknown Advertiser")}
                        </h3>
                        {analysis?.adId && (
                          <div className="text-xs text-muted-foreground">Ad ID: {analysis.adId}</div>
                        )}
                      </div>

                      {analysis?.hookAnalysis && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">Hook</div>
                          <p className="text-sm bg-primary/5 p-2 rounded-lg">
                            {safeString(analysis.hookAnalysis?.hookText, "No hook text")}
                          </p>
                          <div className="text-xs text-muted-foreground mt-1">
                            {analysis.hookAnalysis?.effectiveness != null && `Effectiveness: ${analysis.hookAnalysis.effectiveness}/10`}
                            {analysis.hookAnalysis?.hookType && ` • Type: ${analysis.hookAnalysis.hookType}`}
                          </div>
                        </div>
                      )}

                      {safeArray(analysis?.keyTakeaways).length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">Key Takeaways</div>
                          <ul className="list-disc list-inside space-y-1">
                            {safeArray(analysis.keyTakeaways).map((takeaway: string, i: number) => (
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
            {(marketTrends.length > 0 || opportunityGaps.length > 0 || competitiveAdvantages.length > 0) ? (
              <>
                {marketTrends.length > 0 && (
                  <Card className="p-5 border-border/40">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      <h3 className="text-base font-semibold text-foreground">Market Trends</h3>
                    </div>
                    <ul className="space-y-2">
                      {marketTrends.map((trend: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-foreground">{trend}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {opportunityGaps.length > 0 && (
                  <Card className="p-5 border-border/40">
                    <div className="flex items-center gap-2 mb-4">
                      <Lightbulb className="h-5 w-5 text-yellow-500" />
                      <h3 className="text-base font-semibold text-foreground">Opportunity Gaps</h3>
                    </div>
                    <ul className="space-y-2">
                      {opportunityGaps.map((gap: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-foreground">{gap}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {competitiveAdvantages.length > 0 && (
                  <Card className="p-5 border-border/40">
                    <div className="flex items-center gap-2 mb-4">
                      <Target className="h-5 w-5 text-green-500" />
                      <h3 className="text-base font-semibold text-foreground">Competitive Advantages</h3>
                    </div>
                    <ul className="space-y-2">
                      {competitiveAdvantages.map((advantage: string, i: number) => (
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
            {(competitorSummary?.totalCompetitors != null || competitorSummary?.totalAdsAnalyzed != null) && (
              <Card className="p-5 border-border/40">
                <h3 className="text-base font-semibold text-foreground mb-4">Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {safeNumber(competitorSummary?.totalCompetitors)}
                    </div>
                    <div className="text-sm text-muted-foreground">Competitors Analyzed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {safeNumber(competitorSummary?.totalAdsAnalyzed)}
                    </div>
                    <div className="text-sm text-muted-foreground">Ads Processed</div>
                  </div>
                </div>
              </Card>
            )}

            {keyTrends.length > 0 && (
              <Card className="p-5 border-border/40">
                <h3 className="text-base font-semibold text-foreground mb-4">Key Trends</h3>
                <div className="flex flex-wrap gap-2">
                  {keyTrends.map((trend: string, i: number) => (
                    <Badge key={i} variant="secondary">{trend}</Badge>
                  ))}
                </div>
              </Card>
            )}

            {(topPerformingPatterns.length > 0 || avoidPatterns.length > 0) && (
              <Card className="p-5 border-border/40">
                <h3 className="text-base font-semibold text-foreground mb-4">Recommendations</h3>
                <div className="space-y-4">
                  {topPerformingPatterns.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        Top Performing Patterns
                      </div>
                      <ul className="space-y-1">
                        {topPerformingPatterns.map((pattern: string, i: number) => (
                          <li key={i} className="text-sm flex items-start gap-2 text-foreground">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            {pattern}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {avoidPatterns.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        Patterns to Avoid
                      </div>
                      <ul className="space-y-1">
                        {avoidPatterns.map((pattern: string, i: number) => (
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