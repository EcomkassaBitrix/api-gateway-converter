import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

interface LogEntry {
  id: number;
  status: string;
  method: string;
  time: string;
  duration: string;
}

interface LogsTabProps {
  recentLogs: LogEntry[];
}

const LogsTab = ({ recentLogs }: LogsTabProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="FileText" size={20} />
          Последние запросы
        </CardTitle>
        <CardDescription>История конвертации в реальном времени</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                  {log.status === 'success' ? (
                    <Icon name="Check" size={12} className="mr-1" />
                  ) : (
                    <Icon name="X" size={12} className="mr-1" />
                  )}
                  {log.status}
                </Badge>
                <span className="font-mono text-sm">{log.method}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Icon name="Clock" size={12} />
                  {log.time}
                </span>
                <Badge variant="outline">{log.duration}</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default LogsTab;
