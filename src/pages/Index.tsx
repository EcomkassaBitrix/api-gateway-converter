import { useState } from 'react';
import funcUrls from '../../backend/func2url.json';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import StatsCards from '@/components/gateway/StatsCards';
import AuthTab from '@/components/gateway/AuthTab';
import SandboxTab from '@/components/gateway/SandboxTab';
import StatusTab from '@/components/gateway/StatusTab';
import DocsTab from '@/components/gateway/DocsTab';
import LogsTab from '@/components/gateway/LogsTab';
import AnalyticsTab from '@/components/gateway/AnalyticsTab';

const Index = () => {
  const [fermaInput, setFermaInput] = useState('');
  const [atolOutput, setAtolOutput] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [usedInvoiceIds, setUsedInvoiceIds] = useState<Record<string, Set<string>>>({});
  
  const [authForm, setAuthForm] = useState({
    login: '',
    password: ''
  });
  const [authToken, setAuthToken] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [statusForm, setStatusForm] = useState({
    uuid: '',
    group_code: '700'
  });
  const [statusResult, setStatusResult] = useState('');
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const exampleFermaRequest = {
    "Request": {
      "Inn": "0123456789",
      "Type": "Income",
      "InvoiceId": "6f000fee-bbac-4444-bda1-e9ce9999fcc7",
      "CallbackUrl": "https://webhook.site/0c01f3ef-597e-43d8-8463-4c1b942d3ea2",
      "CustomerReceipt": {
        "TaxationSystem": "Common",
        "CashlessPayments": [
          {
            "PaymentSum": 5328.53,
            "PaymentMethodFlag": "1",
            "PaymentIdentifiers": "132",
            "AdditionalInformation": "Полная оплата безналичными"
          }
        ],
        "Email": "example@ya.ru",
        "Phone": "+79000000001",
        "PaymentType": 4,
        "Items": [
          {
            "Label": "Оплата услуг по страхованию.",
            "Price": 5328.53,
            "Quantity": 1.0,
            "Amount": 5328.53,
            "Vat": "VatNo",
            "MarkingCode": null,
            "PaymentMethod": 4,
            "Measure": "PIECE"
          }
        ],
        "PaymentItems": null,
        "CustomUserProperty": null
      }
    },
    "group_code": "700"
  };

  const handleConvert = async () => {
    setIsConverting(true);
    
    try {
      const fermaData = JSON.parse(fermaInput);
      
      const response = await fetch(funcUrls['ekomkassa-receipt'], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...fermaData,
          token: authToken
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setAtolOutput(JSON.stringify(data, null, 2));
        toast.success('Чек успешно создан');
      } else {
        setAtolOutput(JSON.stringify(data, null, 2));
        const errorMsg = data.error?.text || data.error || 'Ошибка создания чека';
        toast.error(errorMsg);
      }
    } catch (error) {
      toast.error('Ошибка парсинга или связи');
      console.error('Convert error:', error);
    } finally {
      setIsConverting(false);
    }
  };

  const exampleCorrectionRequest = {
    "Request": {
      "Inn": "0123456789",
      "Type": "IncomeCorrection",
      "InvoiceId": "test2_8744273567_u12",
      "CallbackUrl": "https://webhook.site/0c01f3ef-597e-43d8-8463-4c1b942d3ea2",
      "CustomerReceipt": {
        "TaxationSystem": "Common",
        "CashlessPayments": [
          {
            "PaymentSum": 1,
            "PaymentMethodFlag": "1",
            "PaymentIdentifiers": "132",
            "AdditionalInformation": "Полная оплата безналичными"
          }
        ],
        "Email": "example@mail.ru",
        "Phone": null,
        "CorrectionInfo": {
          "Type": "SELF",
          "Description": "Самостоятельная операция",
          "ReceiptDate": "15.08.2019",
          "ReceiptId": "1"
        },
        "Items": [
          {
            "Label": "Расходы",
            "Price": 1,
            "Quantity": 1,
            "Amount": 1,
            "Vat": "CalculatedVat20120",
            "PaymentMethod": 4,
            "Measure": "PIECE",
            "PaymentType": 4
          }
        ]
      }
    },
    "group_code": "700"
  };

  const generateInvoiceId = (groupCode: string): string => {
    const prefix = 'APIGW';
    const datePart = new Date().getTime();
    const randomPart = Math.floor(Math.random() * 1000000);
    
    let invoiceId = `${prefix}_${datePart}_${randomPart}`;
    
    if (!usedInvoiceIds[groupCode]) {
      usedInvoiceIds[groupCode] = new Set();
    }
    
    while (usedInvoiceIds[groupCode].has(invoiceId)) {
      const newRandomPart = Math.floor(Math.random() * 1000000);
      invoiceId = `${prefix}_${datePart}_${newRandomPart}`;
    }
    
    const newUsedIds = { ...usedInvoiceIds };
    if (!newUsedIds[groupCode]) {
      newUsedIds[groupCode] = new Set();
    }
    newUsedIds[groupCode].add(invoiceId);
    setUsedInvoiceIds(newUsedIds);
    
    return invoiceId;
  };

  const loadExample = () => {
    const example = { ...exampleFermaRequest };
    const groupCode = example.group_code || '700';
    example.Request.InvoiceId = generateInvoiceId(groupCode);
    
    setFermaInput(JSON.stringify(example, null, 2));
    toast.info('Загружен пример продажи');
  };

  const loadCorrectionExample = () => {
    const example = { ...exampleCorrectionRequest };
    const groupCode = example.group_code || '700';
    example.Request.InvoiceId = generateInvoiceId(groupCode);
    
    setFermaInput(JSON.stringify(example, null, 2));
    toast.info('Загружен пример коррекции');
  };

  const handleAuth = async () => {
    setIsAuthenticating(true);
    
    try {
      const response = await fetch(funcUrls['ekomkassa-auth'], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: authForm.login,
          password: authForm.password
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.token) {
        setAuthToken(data.token);
        toast.success('Токен успешно получен');
      } else {
        const errorMsg = data.error?.text || data.error || 'Ошибка авторизации';
        toast.error(errorMsg);
      }
    } catch (error) {
      toast.error('Ошибка связи с сервером');
      console.error('Auth error:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleCheckStatus = async () => {
    setIsCheckingStatus(true);
    
    try {
      const params = new URLSearchParams({
        AuthToken: authToken,
        uuid: statusForm.uuid,
        group_code: statusForm.group_code
      });

      const response = await fetch(`${funcUrls['ekomkassa-status']}?${params}`, {
        method: 'GET'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStatusResult(JSON.stringify(data, null, 2));
        
        if (data.status === 'done') {
          toast.success('Чек успешно пробит');
        } else if (data.status === 'wait') {
          toast.info('Чек в очереди на обработку');
        } else if (data.status === 'fail') {
          toast.error('Ошибка при создании чека');
        }
      } else {
        setStatusResult(JSON.stringify(data, null, 2));
        const errorMsg = data.error?.text || data.error || 'Ошибка проверки статуса';
        toast.error(errorMsg);
      }
    } catch (error) {
      toast.error('Ошибка связи с сервером');
      console.error('Status check error:', error);
    } finally {
      setIsCheckingStatus(false);
    }
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
              loadCorrectionExample={loadCorrectionExample}
            />
          </TabsContent>

          <TabsContent value="status" className="space-y-6">
            <StatusTab
              statusForm={statusForm}
              setStatusForm={setStatusForm}
              authToken={authToken}
              statusResult={statusResult}
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