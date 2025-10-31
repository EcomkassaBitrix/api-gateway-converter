import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import StatsCards from '@/components/gateway/StatsCards';
import AuthTab from '@/components/gateway/AuthTab';
import SandboxTab from '@/components/gateway/SandboxTab';
import StatusTab from '@/components/gateway/StatusTab';
import DocsTab from '@/components/gateway/DocsTab';
import LogsTab from '@/components/gateway/LogsTab';
import AnalyticsTab from '@/components/gateway/AnalyticsTab';
import { useGatewayAuth } from '@/hooks/useGatewayAuth';
import { useGatewaySandbox } from '@/hooks/useGatewaySandbox';
import { useGatewayStatus } from '@/hooks/useGatewayStatus';
import { useGatewayStats } from '@/hooks/useGatewayStats';
import { useGatewayLogs } from '@/hooks/useGatewayLogs';

const Index = () => {
  const {
    authForm,
    setAuthForm,
    authToken,
    authResponse,
    isAuthenticating,
    handleAuth
  } = useGatewayAuth();

  const {
    fermaInput,
    setFermaInput,
    atolOutput,
    fermaOutput,
    isConverting,
    handleConvert,
    loadExample,
    loadCorrectionExample
  } = useGatewaySandbox({ authToken, authForm });

  const {
    statusForm,
    setStatusForm,
    statusResult,
    statusConverterResult,
    isCheckingStatus,
    handleCheckStatus
  } = useGatewayStatus({ authToken, authForm, handleAuth });

  const stats = useGatewayStats();
  const recentLogs = useGatewayLogs();

  const statsData = [
    {
      title: 'Всего запросов',
      value: stats.total_requests.toString(),
      icon: 'Activity' as const,
      trend: '+12.5%',
      description: 'За последние 24 часа'
    },
    {
      title: 'Успешных',
      value: stats.successful_requests.toString(),
      icon: 'CheckCircle2' as const,
      trend: '+8.2%',
      description: 'Без ошибок',
      positive: true
    },
    {
      title: 'С ошибками',
      value: stats.error_requests.toString(),
      icon: 'XCircle' as const,
      trend: '-3.1%',
      description: 'Требуют внимания',
      positive: false
    },
    {
      title: 'Среднее время',
      value: `${stats.avg_duration_ms.toFixed(0)}ms`,
      icon: 'Clock' as const,
      trend: '-15.3%',
      description: 'Время обработки',
      positive: true
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <header className="text-center space-y-2 animate-fade-in">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
              <Icon name="Zap" className="text-white" size={24} />
            </div>
            <h1 className="text-3xl font-bold text-secondary">API Gateway</h1>
          </div>
          <p className="text-muted-foreground">Конвертация протокола Ferma в eKomKassa (Атол v5)</p>
        </header>

        <StatsCards statsData={statsData} />

        <Tabs defaultValue="auth" className="space-y-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="auth" className="gap-2">
              <Icon name="KeyRound" size={16} />
              Авторизация
            </TabsTrigger>
            <TabsTrigger value="sandbox" className="gap-2">
              <Icon name="PlayCircle" size={16} />
              Песочница
            </TabsTrigger>
            <TabsTrigger value="status" className="gap-2">
              <Icon name="Search" size={16} />
              Статус
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
              authResponse={authResponse}
              isAuthenticating={isAuthenticating}
              handleAuth={handleAuth}
            />
          </TabsContent>

          <TabsContent value="sandbox" className="space-y-6">
            <SandboxTab
              fermaInput={fermaInput}
              setFermaInput={setFermaInput}
              atolOutput={atolOutput}
              fermaOutput={fermaOutput}
              isConverting={isConverting}
              handleConvert={handleConvert}
              loadExample={loadExample}
              loadCorrectionExample={loadCorrectionExample}
              authToken={authToken}
            />
          </TabsContent>

          <TabsContent value="status" className="space-y-6">
            <StatusTab
              statusForm={statusForm}
              setStatusForm={setStatusForm}
              authToken={authToken}
              statusResult={statusResult}
              statusConverterResult={statusConverterResult}
              isCheckingStatus={isCheckingStatus}
              handleCheckStatus={handleCheckStatus}
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
