import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000'
  : 'https://gw.ecomkassa.ru';

interface RequestLog {
  id: number;
  created_at: string;
  method: string;
  url: string;
  path: string;
  source_ip: string;
  request_body: any;
  target_url: string;
  response_status?: number;
  response_body: any;
  client_response_status?: number;
  duration_ms?: number;
  error_message?: string;
  request_id: string;
}

interface RequestLogDetail extends RequestLog {
  user_agent: string;
  request_headers: any;
  target_method: string;
  target_headers: any;
  target_body: any;
  response_headers: any;
  client_response_body: any;
}

export default function RequestLogs() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<RequestLogDetail | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loginForm, setLoginForm] = useState({ login: '', password: '' });
  const [loggingIn, setLoggingIn] = useState(false);
  const [replaying, setReplaying] = useState(false);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/check`, {
        credentials: 'include'
      });
      const data = await response.json();
      setAuthenticated(data.authenticated);
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthenticated(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const response = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(loginForm)
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setAuthenticated(true);
        toast.success('Успешный вход');
      } else {
        toast.error(data.message || 'Неверные данные');
      }
    } catch (error) {
      toast.error('Ошибка авторизации');
      console.error(error);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/admin/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      setAuthenticated(false);
      toast.success('Вы вышли');
    } catch (error) {
      console.error(error);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/request-logs?limit=100`, {
        credentials: 'include'
      });
      if (response.status === 401) {
        setAuthenticated(false);
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch logs');
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      toast.error('Ошибка загрузки логов');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogDetail = async (logId: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/request-logs/${logId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch log detail');
      const data = await response.json();
      setSelectedLog(data);
    } catch (error) {
      toast.error('Ошибка загрузки деталей лога');
      console.error(error);
    }
  };

  const handleReplay = async (logId: number) => {
    setReplaying(true);
    try {
      const response = await fetch(`${API_BASE}/api/request-logs/${logId}/replay`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Запрос повторён: ${data.status} (${data.duration_ms}ms)`);
        await fetchLogs();
      } else {
        toast.error(`Ошибка: ${data.error}`);
      }
    } catch (error) {
      toast.error('Ошибка повтора запроса');
      console.error(error);
    } finally {
      setReplaying(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchLogs();
      
      if (autoRefresh) {
        const interval = setInterval(fetchLogs, 3000);
        return () => clearInterval(interval);
      }
    }
  }, [authenticated, autoRefresh]);

  const filteredLogs = logs.filter(log => {
    const matchesMethod = methodFilter === 'all' || log.method === methodFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === '2xx' && log.response_status && log.response_status >= 200 && log.response_status < 300) ||
      (statusFilter === '4xx' && log.response_status && log.response_status >= 400 && log.response_status < 500) ||
      (statusFilter === '5xx' && log.response_status && log.response_status >= 500);
    const matchesSearch = search === '' || 
      log.path.toLowerCase().includes(search.toLowerCase()) ||
      log.source_ip?.includes(search) ||
      log.request_id?.toLowerCase().includes(search.toLowerCase());
    return matchesMethod && matchesStatus && matchesSearch;
  });

  const getStatusColor = (status?: number) => {
    if (!status) return 'secondary';
    if (status >= 200 && status < 300) return 'default';
    if (status >= 400 && status < 500) return 'warning';
    if (status >= 500) return 'destructive';
    return 'secondary';
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'default';
      case 'POST': return 'secondary';
      case 'PUT': return 'outline';
      case 'DELETE': return 'destructive';
      default: return 'secondary';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <Icon name="Loader" className="animate-spin mx-auto mb-2" size={32} />
          <p className="text-gray-600">Проверка авторизации...</p>
        </Card>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="Lock" size={32} className="text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Вход в админку</h1>
            <p className="text-gray-600">Введите логин и пароль для доступа к логам</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Логин</label>
              <Input
                type="text"
                placeholder="admin"
                value={loginForm.login}
                onChange={(e) => setLoginForm({ ...loginForm, login: e.target.value })}
                required
                disabled={loggingIn}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                required
                disabled={loggingIn}
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={loggingIn}>
              {loggingIn ? (
                <>
                  <Icon name="Loader" className="animate-spin mr-2" size={16} />
                  Вход...
                </>
              ) : (
                <>
                  <Icon name="LogIn" className="mr-2" size={16} />
                  Войти
                </>
              )}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">HTTP-запросы Gateway</h1>
            <p className="text-gray-600">Полный журнал запросов через прокси</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="gap-2"
            >
              <Icon name={autoRefresh ? 'RefreshCw' : 'Pause'} className={autoRefresh ? 'animate-spin' : ''} size={16} />
              {autoRefresh ? 'Авто' : 'Пауза'}
            </Button>
            <Button onClick={fetchLogs} variant="outline" className="gap-2">
              <Icon name="RefreshCw" size={16} />
              Обновить
            </Button>
            <Button onClick={handleLogout} variant="outline" className="gap-2">
              <Icon name="LogOut" size={16} />
              Выйти
            </Button>
          </div>
        </div>

        <Card className="p-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Поиск по URL, IP, Request ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Метод" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все методы</SelectItem>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
                <SelectItem value="OPTIONS">OPTIONS</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="2xx">2xx (Успешно)</SelectItem>
                <SelectItem value="4xx">4xx (Ошибка клиента)</SelectItem>
                <SelectItem value="5xx">5xx (Ошибка сервера)</SelectItem>
              </SelectContent>
            </Select>

            {(methodFilter !== 'all' || statusFilter !== 'all' || search) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setMethodFilter('all');
                  setStatusFilter('all');
                  setSearch('');
                }}
                className="gap-2"
              >
                <Icon name="X" size={16} />
                Сбросить
              </Button>
            )}
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Найдено записей: <span className="font-semibold">{filteredLogs.length}</span> из {logs.length}
          </div>
        </Card>

        {loading ? (
          <Card className="p-12 text-center">
            <Icon name="Loader" className="animate-spin mx-auto mb-2" size={32} />
            <p className="text-gray-600">Загрузка логов...</p>
          </Card>
        ) : filteredLogs.length === 0 ? (
          <Card className="p-12 text-center">
            <Icon name="Search" className="mx-auto mb-2 text-gray-400" size={48} />
            <p className="text-gray-600">Логи не найдены</p>
            <p className="text-sm text-gray-500 mt-1">Попробуйте изменить фильтры или поисковый запрос</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Время</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Метод</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Путь</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Время</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={getMethodColor(log.method)}>
                          {log.method}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                        {log.path}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {log.source_ip}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.response_status ? (
                          <Badge variant={getStatusColor(log.response_status)}>
                            {log.response_status}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">N/A</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fetchLogDetail(log.id)}
                            className="gap-1"
                          >
                            <Icon name="Eye" size={14} />
                            Детали
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReplay(log.id)}
                            disabled={replaying}
                            className="gap-1"
                          >
                            <Icon name="Play" size={14} />
                            Повтор
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {selectedLog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" onClick={() => setSelectedLog(null)}>
            <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b bg-gray-50 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Детали запроса</h2>
                    <p className="text-sm text-gray-600 mt-1">Request ID: {selectedLog.request_id}</p>
                  </div>
                  <Button variant="ghost" onClick={() => setSelectedLog(null)}>
                    <Icon name="X" size={20} />
                  </Button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Информация о запросе</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Метод:</span>
                        <Badge variant={getMethodColor(selectedLog.method)}>{selectedLog.method}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Статус:</span>
                        <Badge variant={getStatusColor(selectedLog.response_status)}>{selectedLog.response_status || 'N/A'}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Время выполнения:</span>
                        <span className="font-mono">{selectedLog.duration_ms}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">IP клиента:</span>
                        <span className="font-mono">{selectedLog.source_ip}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Время:</span>
                        <span>{formatDate(selectedLog.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">User Agent</h3>
                    <p className="text-sm text-gray-600 break-words">{selectedLog.user_agent || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">URL запроса</h3>
                  <code className="block bg-gray-50 p-3 rounded text-xs break-all">{selectedLog.url}</code>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Целевой URL</h3>
                  <code className="block bg-gray-50 p-3 rounded text-xs break-all">{selectedLog.target_url}</code>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Заголовки запроса</h3>
                    <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.request_headers, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Заголовки ответа</h3>
                    <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.response_headers, null, 2)}
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Тело запроса</h3>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto max-h-64">
                    {typeof selectedLog.request_body === 'string' 
                      ? selectedLog.request_body 
                      : JSON.stringify(selectedLog.request_body, null, 2)}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Тело ответа</h3>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto max-h-64">
                    {typeof selectedLog.response_body === 'string' 
                      ? selectedLog.response_body 
                      : JSON.stringify(selectedLog.response_body, null, 2)}
                  </pre>
                </div>

                {selectedLog.error_message && (
                  <div>
                    <h3 className="font-semibold text-red-700 mb-2">Ошибка</h3>
                    <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-800">
                      {selectedLog.error_message}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => handleReplay(selectedLog.id)}
                    disabled={replaying}
                    className="gap-2"
                  >
                    <Icon name="Play" size={16} />
                    Повторить запрос
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
                      toast.success('Скопировано в буфер обмена');
                    }}
                    className="gap-2"
                  >
                    <Icon name="Copy" size={16} />
                    Копировать JSON
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedLog(null)} className="ml-auto">
                    Закрыть
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
