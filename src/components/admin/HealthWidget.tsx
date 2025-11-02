import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface HealthWidgetProps {
  serviceName: string;
  status: 'online' | 'warning' | 'down';
  latency?: number;
  lastChecked?: Date;
  details?: string;
}

export function HealthWidget({ serviceName, status, latency, lastChecked, details }: HealthWidgetProps) {
  const statusConfig = {
    online: {
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      label: 'Online'
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      label: 'Warning'
    },
    down: {
      icon: XCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      label: 'Down'
    }
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{serviceName}</CardTitle>
          <Badge variant="outline" className={`${config.bgColor} ${config.color}`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {latency && (
          <div className="text-xs">
            <span className="text-muted-foreground">Latency:</span>
            <span className="ml-2 font-medium">{latency}ms</span>
          </div>
        )}
        {lastChecked && (
          <div className="text-xs text-muted-foreground">
            Last checked: {lastChecked.toLocaleTimeString()}
          </div>
        )}
        {details && (
          <div className="text-xs text-muted-foreground mt-2">{details}</div>
        )}
      </CardContent>
    </Card>
  );
}
