import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

const Index = () => {
  const [fermaInput, setFermaInput] = useState('');
  const [atolOutput, setAtolOutput] = useState('');
  const [isConverting, setIsConverting] = useState(false);

  const exampleFermaRequest = {
    "operation": "sell",
    "items": [
      {
        "name": "Товар 1",
        "price": 100.50,
        "quantity": 2,
        "tax": "vat20"
      }
    ],
    "payments": [
      {
        "type": "card",
        "sum": 201.00
      }
    ]
  };

  const handleConvert = async () => {
    setIsConverting(true);
    
    setTimeout(() => {
      const mockAtolResponse = {
        "external_id": "order_12345",
        "receipt": {
          "client": {
            "email": "customer@example.com"
          },
          "company": {
            "email": "shop@example.com",
            "sno": "osn",
            "inn": "1234567890",
            "payment_address": "https://example.com"
          },
          "items": [
            {
              "name": "Товар 1",
              "price": 100.50,
              "quantity": 2,
              "sum": 201.00,
              "payment_method": "full_payment",
              "payment_object": "commodity",
              "vat": {
                "type": "vat20",
                "sum": 33.50
              }
            }
          ],
          "payments": [
            {
              "type": 1,
              "sum": 201.00
            }
          ],
          "total": 201.00
        },
        "timestamp": new Date().toISOString()
      };
      
      setAtolOutput(JSON.stringify(mockAtolResponse, null, 2));
      setIsConverting(false);
      toast.success('Конвертация успешно выполнена');
    }, 800);
  };

  const loadExample = () => {
    setFermaInput(JSON.stringify(exampleFermaRequest, null, 2));
    toast.info('Загружен пример запроса');
  };

  const statsData = [
    { label: 'Всего запросов', value: '1,247', icon: 'Activity', trend: '+12%' },
    { label: 'Успешных', value: '1,198', icon: 'CheckCircle2', trend: '+8%' },
    { label: 'Ошибок', value: '49', icon: 'AlertCircle', trend: '-3%' },
    { label: 'Средн. время', value: '124ms', icon: 'Clock', trend: '-15%' },
  ];

  const recentLogs = [
    { id: 1, status: 'success', method: 'sell', time: '14:32:15', duration: '98ms' },
    { id: 2, status: 'success', method: 'refund', time: '14:31:42', duration: '112ms' },
    { id: 3, status: 'error', method: 'sell', time: '14:30:18', duration: '245ms' },
    { id: 4, status: 'success', method: 'sell_correction', time: '14:28:55', duration: '87ms' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <header className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary rounded-lg">
              <Icon name="Zap" className="text-white" size={24} />
            </div>
            <h1 className="text-3xl font-bold text-secondary">API Gateway</h1>
          </div>
          <p className="text-muted-foreground">Конвертация протокола Ferma в Атол Онлайн</p>
        </header>

        <div className="grid gap-6 md:grid-cols-4 mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {statsData.map((stat, idx) => (
            <Card key={idx} className="hover-scale">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs font-medium">{stat.label}</CardDescription>
                <Icon name={stat.icon as any} className="text-muted-foreground" size={16} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-primary mt-1">{stat.trend}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="sandbox" className="space-y-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="sandbox" className="gap-2">
              <Icon name="PlayCircle" size={16} />
              Песочница
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-2">
              <Icon name="BookOpen" size={16} />
              Документация
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <Icon name="Terminal" size={16} />
              Логи
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <Icon name="BarChart3" size={16} />
              Аналитика
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sandbox" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Icon name="FileJson" size={20} />
                        Ferma Input
                      </CardTitle>
                      <CardDescription>Введите запрос в формате Ferma</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadExample}>
                      <Icon name="Sparkles" size={14} className="mr-1" />
                      Пример
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={fermaInput}
                    onChange={(e) => setFermaInput(e.target.value)}
                    placeholder='{"operation": "sell", "items": [...]}'
                    className="font-mono text-sm min-h-[400px]"
                  />
                  <Button 
                    onClick={handleConvert} 
                    disabled={!fermaInput || isConverting}
                    className="w-full mt-4"
                  >
                    {isConverting ? (
                      <>
                        <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                        Конвертация...
                      </>
                    ) : (
                      <>
                        <Icon name="ArrowRight" size={16} className="mr-2" />
                        Конвертировать
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="Code2" size={20} />
                    Атол Output
                  </CardTitle>
                  <CardDescription>Результат конвертации в формат Атол</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={atolOutput}
                    readOnly
                    placeholder="Результат появится здесь..."
                    className="font-mono text-sm min-h-[400px] bg-muted"
                  />
                  {atolOutput && (
                    <Button variant="outline" className="w-full mt-4">
                      <Icon name="Copy" size={16} className="mr-2" />
                      Копировать
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="docs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Book" size={20} />
                  API Документация
                </CardTitle>
                <CardDescription>Полное описание эндпоинтов и параметров конвертации</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="default">POST</Badge>
                    <code className="text-sm">/api/convert/ferma-to-atol</code>
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Конвертирует запрос из формата Ferma в формат Атол Онлайн
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Поддерживаемые операции:</h4>
                      <div className="grid gap-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">sell</Badge>
                          <span className="text-muted-foreground">Продажа товаров/услуг</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">refund</Badge>
                          <span className="text-muted-foreground">Возврат средств</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">sell_correction</Badge>
                          <span className="text-muted-foreground">Коррекция прихода</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">refund_correction</Badge>
                          <span className="text-muted-foreground">Коррекция расхода</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold mb-2">Типы НДС:</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">vat20 → НДС 20%</span>
                        <span className="text-muted-foreground">vat10 → НДС 10%</span>
                        <span className="text-muted-foreground">vat0 → НДС 0%</span>
                        <span className="text-muted-foreground">none → Без НДС</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold mb-2">Способы оплаты:</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">cash → Наличные (0)</span>
                        <span className="text-muted-foreground">card → Электронные (1)</span>
                        <span className="text-muted-foreground">prepaid → Предоплата (2)</span>
                        <span className="text-muted-foreground">credit → Постоплата (3)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
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
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
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
                    {[
                      { type: 'sell', count: 847, percent: 68 },
                      { type: 'refund', count: 248, percent: 20 },
                      { type: 'sell_correction', count: 98, percent: 8 },
                      { type: 'refund_correction', count: 54, percent: 4 },
                    ].map((item) => (
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
