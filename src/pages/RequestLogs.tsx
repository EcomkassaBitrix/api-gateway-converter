import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
    const matchesSearch = search === '' || 
      log.path.toLowerCase().includes(search.toLowerCase()) ||
      log.source_ip?.includes(search) ||
      log.request_id?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (status?: number) => {
    if (!status) return 'secondary';
    if (status >= 200 && status < 300) return 'default';
    if (status >= 400 && status < 500) return 'warning';
    if (status >= 500) return 'destructive';
    return 'secondary';
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Логи запросов</h1>
            <p className="text-gray-600">Полная история всех API-запросов с возможностью повтора</p>
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

        {/* Filters */}
        <Card className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Поиск по пути, IP или request_id..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </Card>

        {/* Logs Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Время</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Метод</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Путь</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Время</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center">
                      <Icon name="Loader" className="animate-spin mx-auto mb-2" size={32} />
                      <p className="text-gray-500">Загрузка логов...</p>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      Логи не найдены
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => fetchLogDetail(log.id)}>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{log.method}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">
                        {log.path}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.source_ip}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusColor(log.client_response_status)}>
                          {log.client_response_status || 'N/A'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.duration_ms ? `${log.duration_ms}ms` : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReplay(log.id);
                          }}
                          disabled={replaying || !log.target_url}
                        >
                          <Icon name="RotateCw" size={14} className="mr-1" />
                          Повторить
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Log Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" onClick={() => setSelectedLog(null)}>
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Детали запроса #{selectedLog.id}</h2>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedLog(null)}>
                    <Icon name="X" size={20} />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Время</label>
                    <p className="text-sm">{formatDate(selectedLog.created_at)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Request ID</label>
                    <p className="text-sm font-mono">{selectedLog.request_id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">IP адрес</label>
                    <p className="text-sm">{selectedLog.source_ip}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">User Agent</label>
                    <p className="text-sm truncate">{selectedLog.user_agent}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Входящий запрос</label>
                  <p className="text-sm font-mono mb-2">{selectedLog.method} {selectedLog.path}</p>
                  <pre className="bg-gray-50 p-4 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.request_body, null, 2)}
                  </pre>
                </div>

                {selectedLog.target_url && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Целевой URL</label>
                      <p className="text-sm font-mono">{selectedLog.target_method} {selectedLog.target_url}</p>
                      <pre className="bg-gray-50 p-4 rounded text-xs overflow-x-auto mt-2">
                        {JSON.stringify(selectedLog.target_body, null, 2)}
                      </pre>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600">Ответ от целевого API</label>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getStatusColor(selectedLog.response_status)}>
                          {selectedLog.response_status}
                        </Badge>
                        <span className="text-sm text-gray-600">{selectedLog.duration_ms}ms</span>
                      </div>
                      <pre className="bg-gray-50 p-4 rounded text-xs overflow-x-auto">
                        {JSON.stringify(selectedLog.response_body, null, 2)}
                      </pre>
                    </div>
                  </>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-600">Ответ клиенту</label>
                  <Badge variant={getStatusColor(selectedLog.client_response_status)} className="mb-2">
                    {selectedLog.client_response_status}
                  </Badge>
                  <pre className="bg-gray-50 p-4 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.client_response_body, null, 2)}
                  </pre>
                </div>

                {selectedLog.error_message && (
                  <div>
                    <label className="text-sm font-medium text-red-600">Ошибка</label>
                    <p className="text-sm text-red-600">{selectedLog.error_message}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedLog(null)}>
                    Закрыть
                  </Button>
                  {selectedLog.target_url && (
                    <Button
                      onClick={() => {
                        handleReplay(selectedLog.id);
                        setSelectedLog(null);
                      }}
                      disabled={replaying}
                    >
                      <Icon name="RotateCw" size={16} className="mr-2" />
                      Повторить запрос
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
