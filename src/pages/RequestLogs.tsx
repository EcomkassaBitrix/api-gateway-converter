import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { getApiUrl } from '@/lib/api';
const ADMIN_LOGIN = 'admin';
const ADMIN_PASSWORD = 'GatewayEcomkassa';

interface RequestLog {
  id: number;
  created_at: string;
  function_name: string;
  log_level: string;
  message: string;
  request_data: any;
  response_data: any;
  request_id: string;
  duration_ms?: number;
  status_code?: number;
}

export default function RequestLogs() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ login: '', password: '' });
  const [loggingIn, setLoggingIn] = useState(false);
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [functionFilter, setFunctionFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const savedAuth = sessionStorage.getItem('logs_auth');
    if (savedAuth === 'true') {
      setAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    
    if (loginForm.login === ADMIN_LOGIN && loginForm.password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      sessionStorage.setItem('logs_auth', 'true');
      toast.success('Успешный вход');
    } else {
      toast.error('Неверный логин или пароль');
    }
    setLoggingIn(false);
  };

  const handleLogout = () => {
    setAuthenticated(false);
    sessionStorage.removeItem('logs_auth');
    toast.success('Вы вышли');
  };

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (functionFilter !== 'all') params.append('function_name', functionFilter);
      if (levelFilter !== 'all') params.append('log_level', levelFilter);

      const response = await fetch(`${getApiUrl('LOGS')}?${params}`);
      if (!response.ok) throw new Error('Failed to fetch logs');
      const data = await response.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Ошибка загрузки логов');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchLogs();
    }
  }, [authenticated, functionFilter, levelFilter, sourceFilter]);

  useEffect(() => {
    if (!authenticated || !autoRefresh) return;
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [authenticated, autoRefresh, functionFilter, levelFilter, sourceFilter]);

  const getLogSource = (log: RequestLog): 'API' | 'Gateway' | 'Ecomkassa' | 'Unknown' => {
    const msg = log.message.toLowerCase();
    const funcName = log.function_name.toLowerCase();
    
    if (msg.includes('incoming') || msg.includes('входящий')) {
      return 'API';
    }
    if (msg.includes('request to ekomkassa') || msg.includes('converting') || msg.includes('конвертация')) {
      return 'Gateway';
    }
    if (msg.includes('response received') || msg.includes('response from') || 
        msg.includes('ecomkassa response') || msg.includes('ekomkassa response')) {
      return 'Ecomkassa';
    }
    return 'Unknown';
  };

  const filteredLogs = logs.filter(log => {
    if (sourceFilter !== 'all' && getLogSource(log) !== sourceFilter) {
      return false;
    }
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        log.message.toLowerCase().includes(searchLower) ||
        log.function_name.toLowerCase().includes(searchLower) ||
        log.request_id?.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.request_data || {}).toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const uniqueFunctions = Array.from(new Set(logs.map(log => log.function_name)));

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Lock" size={24} />
              Вход в систему логов
            </CardTitle>
            <CardDescription>Введите учетные данные для доступа</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Логин</label>
                <Input
                  type="text"
                  value={loginForm.login}
                  onChange={(e) => setLoginForm({ ...loginForm, login: e.target.value })}
                  placeholder="admin"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Пароль</label>
                <Input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loggingIn}>
                {loggingIn ? (
                  <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                ) : (
                  <Icon name="LogIn" size={16} className="mr-2" />
                )}
                Войти
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Icon name="Activity" size={32} />
              Логи запросов
            </h1>
            <p className="text-muted-foreground mt-1">
              Детальная информация о всех запросах к API Gateway
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleLogout}>
              <Icon name="LogOut" size={16} className="mr-2" />
              Выйти
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              <Icon name="ArrowLeft" size={16} className="mr-2" />
              На главную
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Filter" size={20} />
                  Фильтры
                </CardTitle>
                <CardDescription>Поиск и фильтрация логов</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  <Icon name={autoRefresh ? "Pause" : "Play"} size={16} className="mr-2" />
                  {autoRefresh ? 'Остановить' : 'Запустить'}
                </Button>
                <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
                  <Icon name="RefreshCw" size={16} className={loading ? 'animate-spin' : ''} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Источник</label>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все источники</SelectItem>
                    <SelectItem value="API">API</SelectItem>
                    <SelectItem value="Gateway">Gateway</SelectItem>
                    <SelectItem value="Ecomkassa">Ecomkassa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Функция</label>
                <Select value={functionFilter} onValueChange={setFunctionFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все функции</SelectItem>
                    {uniqueFunctions.map(fn => (
                      <SelectItem key={fn} value={fn}>{fn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Уровень</label>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все уровни</SelectItem>
                    <SelectItem value="INFO">INFO</SelectItem>
                    <SelectItem value="ERROR">ERROR</SelectItem>
                    <SelectItem value="WARNING">WARNING</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Поиск</label>
                <Input 
                  placeholder="ID, сообщение, данные..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="List" size={20} />
              Логи ({filteredLogs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <Icon name="Loader2" size={32} className="animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground mt-4">Загрузка логов...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="FileX" size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Логи не найдены</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={log.log_level === 'ERROR' ? 'destructive' : 'default'}>
                            {log.log_level}
                          </Badge>
                          <Badge 
                            variant="outline"
                            className={
                              getLogSource(log) === 'API' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              getLogSource(log) === 'Gateway' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                              getLogSource(log) === 'Ecomkassa' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              ''
                            }
                          >
                            {getLogSource(log)}
                          </Badge>
                          <Badge variant="outline">{log.function_name}</Badge>
                          {log.status_code && (
                            <Badge variant={log.status_code >= 400 ? 'destructive' : 'secondary'}>
                              {log.status_code}
                            </Badge>
                          )}
                          {log.duration_ms && (
                            <span className="text-xs text-muted-foreground">{log.duration_ms}ms</span>
                          )}
                        </div>
                        <p className="text-sm mb-1">{log.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString('ru-RU')} • ID: {log.request_id || log.id}
                        </p>
                      </div>
                      <Icon name="ChevronRight" size={20} className="text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedLog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedLog(null)}>
            <Card className="max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="FileText" size={20} />
                    Детали лога #{selectedLog.id}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedLog(null)}>
                    <Icon name="X" size={20} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Функция</h4>
                    <Badge variant="outline">{selectedLog.function_name}</Badge>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Уровень</h4>
                    <Badge variant={selectedLog.log_level === 'ERROR' ? 'destructive' : 'default'}>
                      {selectedLog.log_level}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Время</h4>
                    <p className="text-sm">{new Date(selectedLog.created_at).toLocaleString('ru-RU')}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Длительность</h4>
                    <p className="text-sm">{selectedLog.duration_ms ? `${selectedLog.duration_ms}ms` : '—'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Сообщение</h4>
                  <p className="text-sm bg-muted p-3 rounded">{selectedLog.message}</p>
                </div>

                {selectedLog.request_data && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Данные запроса</h4>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
                      {JSON.stringify(selectedLog.request_data, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.response_data && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Данные ответа</h4>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
                      {JSON.stringify(selectedLog.response_data, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}