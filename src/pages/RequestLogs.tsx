import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import AuthScreen from '@/components/request-logs/AuthScreen';
import LogFilters from '@/components/request-logs/LogFilters';
import LogsTable from '@/components/request-logs/LogsTable';
import LogDetailModal from '@/components/request-logs/LogDetailModal';

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
  const [dateFilter, setDateFilter] = useState<string>('all');
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
    
    const matchesDate = () => {
      if (dateFilter === 'all') return true;
      const logDate = new Date(log.created_at);
      const now = new Date();
      const diffMs = now.getTime() - logDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      if (dateFilter === '1h') return diffHours <= 1;
      if (dateFilter === '6h') return diffHours <= 6;
      if (dateFilter === '24h') return diffHours <= 24;
      if (dateFilter === '7d') return diffHours <= 24 * 7;
      return true;
    };
    
    const matchesSearch = search === '' || 
      log.path.toLowerCase().includes(search.toLowerCase()) ||
      log.source_ip?.includes(search) ||
      log.request_id?.toLowerCase().includes(search.toLowerCase());
    return matchesMethod && matchesStatus && matchesDate() && matchesSearch;
  });

  if (checkingAuth || !authenticated) {
    return (
      <AuthScreen
        checkingAuth={checkingAuth}
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        loggingIn={loggingIn}
        onLogin={handleLogin}
      />
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

        <LogFilters
          search={search}
          setSearch={setSearch}
          methodFilter={methodFilter}
          setMethodFilter={setMethodFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          filteredCount={filteredLogs.length}
          totalCount={logs.length}
        />

        <LogsTable
          logs={filteredLogs}
          loading={loading}
          onViewDetails={fetchLogDetail}
          onReplay={handleReplay}
          replaying={replaying}
        />

        <LogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
          onReplay={handleReplay}
          replaying={replaying}
        />
      </div>
    </div>
  );
}