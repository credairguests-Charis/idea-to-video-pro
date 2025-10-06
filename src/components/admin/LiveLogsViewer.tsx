import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  message: string;
  source: string;
}

interface LiveLogsViewerProps {
  logs: LogEntry[];
  maxHeight?: string;
}

export function LiveLogsViewer({ logs, maxHeight = "600px" }: LiveLogsViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLogs = logs.filter(log =>
    log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.source.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'destructive';
      case 'warning': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Live Logs</CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea style={{ height: maxHeight }}>
          {filteredLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No logs found</p>
          ) : (
            <div className="space-y-2 font-mono text-xs">
              {filteredLogs.map((log) => (
                <div key={log.id} className="border-l-2 border-muted pl-2 py-1">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className="text-muted-foreground whitespace-nowrap">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                    <Badge variant={getLevelColor(log.level)} className="text-xs">
                      {log.level.toUpperCase()}
                    </Badge>
                    <span className="text-muted-foreground">[{log.source}]</span>
                    <span className="flex-1 break-all">{log.message}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
