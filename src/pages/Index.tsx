import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import StatsCards from '@/components/gateway/StatsCards';
import AuthTab from '@/components/gateway/AuthTab';
import SandboxTab from '@/components/gateway/SandboxTab';
import DocsTab from '@/components/gateway/DocsTab';
import LogsTab from '@/components/gateway/LogsTab';
import AnalyticsTab from '@/components/gateway/AnalyticsTab';

const Index = () => {
  const [fermaInput, setFermaInput] = useState('');
  const [atolOutput, setAtolOutput] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  
  const [authForm, setAuthForm] = useState({
    login: '',
    password: ''
  });
  const [authToken, setAuthToken] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

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

  const handleAuth = async () => {
    setIsAuthenticating(true);
    
    setTimeout(() => {
      const mockAtolToken = {
        "code": 0,
        "text": "",
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkF0b2wgVG9rZW4iLCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
        "timestamp": new Date().toISOString()
      };
      
      setAuthToken(mockAtolToken.token);
      setIsAuthenticating(false);
      toast.success('Токен успешно получен');
    }, 600);
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

        <StatsCards statsData={statsData} />

        <Tabs defaultValue="auth" className="space-y-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="auth" className="gap-2">
              <Icon name="KeyRound" size={16} />
              Авторизация
            </TabsTrigger>
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

          <TabsContent value="auth" className="space-y-6">
            <AuthTab
              authForm={authForm}
              setAuthForm={setAuthForm}
              authToken={authToken}
              isAuthenticating={isAuthenticating}
              handleAuth={handleAuth}
            />
          </TabsContent>

          <TabsContent value="sandbox" className="space-y-6">
            <SandboxTab
              fermaInput={fermaInput}
              setFermaInput={setFermaInput}
              atolOutput={atolOutput}
              isConverting={isConverting}
              handleConvert={handleConvert}
              loadExample={loadExample}
            />
          </TabsContent>

          <TabsContent value="docs" className="space-y-6">
            <DocsTab />
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <LogsTab recentLogs={recentLogs} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;