import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

const AnalyticsTab = () => {
  const operationStats = [
    { type: 'sell', count: 847, percent: 68 },
    { type: 'refund', count: 248, percent: 20 },
    { type: 'sell_correction', count: 98, percent: 8 },
    { type: 'refund_correction', count: 54, percent: 4 },
  ];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="TrendingUp" size={20} />
            Статистика по операциям
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {operationStats.map((item) => (
              <div key={item.type}>
                <div className="flex justify-between mb-1 text-sm">
                  <span className="font-medium">{item.type}</span>
                  <span className="text-muted-foreground">{item.count}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="Gauge" size={20} />
            Производительность
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Успешность</span>
                <span className="text-sm text-muted-foreground">96.1%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div className="bg-green-500 h-3 rounded-full" style={{ width: '96.1%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Avg Response Time</span>
                <span className="text-sm text-muted-foreground">124ms</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div className="bg-primary h-3 rounded-full" style={{ width: '75%' }} />
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">99.7%</div>
                  <div className="text-xs text-muted-foreground">Uptime</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">2.4s</div>
                  <div className="text-xs text-muted-foreground">P95 Latency</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsTab;
