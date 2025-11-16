import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, TrendingUp, Target, Video, FileText, Lightbulb } from "lucide-react";

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
          <h3 className="text-xl font-semibold mb-2">Ready to Create</h3>
          <p className="text-muted-foreground">
            Start an agent session to see creative analysis, competitor research, 
            and video generation results here.
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
          <h3 className="text-xl font-semibold mb-2">Agent is thinking...</h3>
          <p className="text-muted-foreground">
            Analyzing your brief and preparing creative insights.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-8 space-y-6">
        {/* Brand Analysis */}
        {data.brand_analysis && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Brand Analysis</h3>
            </div>
            <div className="space-y-3">
              {data.brand_analysis.voice && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Brand Voice</div>
                  <p className="text-sm">{data.brand_analysis.voice}</p>
                </div>
              )}
              {data.brand_analysis.target_audience && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Target Audience</div>
                  <p className="text-sm">{data.brand_analysis.target_audience}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Competitor Insights */}
        {data.competitor_insights && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Competitor Insights</h3>
            </div>
            <div className="space-y-4">
              {data.competitor_insights.top_hooks && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Top Performing Hooks</div>
                  <div className="flex flex-wrap gap-2">
                    {data.competitor_insights.top_hooks.map((hook: string, i: number) => (
                      <Badge key={i} variant="secondary">{hook}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {data.competitor_insights.formats && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Popular Formats</div>
                  <div className="flex flex-wrap gap-2">
                    {data.competitor_insights.formats.map((format: string, i: number) => (
                      <Badge key={i} variant="outline">{format}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Trends */}
        {data.trends && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Current Trends</h3>
            </div>
            <div className="space-y-2">
              {data.trends.map((trend: any, i: number) => (
                <div key={i} className="p-3 bg-muted rounded-lg">
                  <div className="font-medium text-sm">{trend.name}</div>
                  {trend.description && (
                    <div className="text-xs text-muted-foreground mt-1">{trend.description}</div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Generated Script */}
        {data.script && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Generated Script</h3>
            </div>
            <div className="space-y-3">
              {data.script.hook && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Hook</div>
                  <p className="text-sm font-medium">{data.script.hook}</p>
                </div>
              )}
              {data.script.body && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Body</div>
                  <p className="text-sm whitespace-pre-line">{data.script.body}</p>
                </div>
              )}
              {data.script.cta && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">CTA</div>
                  <p className="text-sm font-medium">{data.script.cta}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Video Generation */}
        {data.video && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Video className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Video Generation</h3>
            </div>
            {data.video.status && (
              <Badge className="mb-3">{data.video.status}</Badge>
            )}
            {data.video.url && (
              <video 
                src={data.video.url} 
                controls 
                className="w-full rounded-lg"
              />
            )}
            {data.video.thumbnail && !data.video.url && (
              <img 
                src={data.video.thumbnail} 
                alt="Video thumbnail" 
                className="w-full rounded-lg"
              />
            )}
          </Card>
        )}

        {/* Raw Output for Debugging */}
        {process.env.NODE_ENV === "development" && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Debug Output</h3>
            <pre className="text-xs bg-muted p-4 rounded overflow-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
