import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface LogEntry {
  id: number;
  created_at: string;
  function_name: string;
  log_level: string;
  message: string;
  request_data?: any;
  response_data?: any;
  request_id?: string;
  duration_ms?: number;
  status_code?: number;
}

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = async () => {
    try {
      const response = await fetch('https://functions.poehali.dev/ed40a7a0-1c4e-47c5-b69a-bbe27853e591?limit=100');
      if (!response.ok) throw new Error('Failed to fetch logs');
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      toast.error('Ошибка загрузки логов');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.function_name === filter;
    const matchesSearch = search === '' || 
      log.message.toLowerCase().includes(search.toLowerCase()) ||
      log.request_id?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'destructive';
      case 'WARNING': return 'warning';
      default: return 'secondary';
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Логи конвертера</h1>
            <p className="text-gray-600">Мониторинг API-запросов к eKomKassa</p>
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
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Поиск по сообщению или request_id..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Все функции" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все функции</SelectItem>
                <SelectItem value="ekomkassa-auth">Auth</SelectItem>
                <SelectItem value="ekomkassa-status">Status</SelectItem>
                <SelectItem value="ekomkassa-receipt">Receipt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Logs Table */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Logs List */}
          <div className="space-y-3">
            {loading ? (
              <Card className="p-8 text-center">
                <Icon name="Loader" className="animate-spin mx-auto mb-2" size={32} />
                <p className="text-gray-600">Загрузка логов...</p>
              </Card>
            ) : filteredLogs.length === 0 ? (
              <Card className="p-8 text-center">
                <Icon name="FileX" className="mx-auto mb-2 text-gray-400" size={48} />
                <p className="text-gray-600">Логи не найдены</p>
              </Card>
            ) : (
              filteredLogs.map((log) => (
                <Card
                  key={log.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedLog?.id === log.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getLevelColor(log.log_level)}>
                          {log.log_level}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {log.function_name.replace('ekomkassa-', '')}
                        </Badge>
                        {log.status_code && (
                          <Badge variant={getStatusColor(log.status_code)}>
                            {log.status_code}
                          </Badge>
                        )}
                        {log.duration_ms && (
                          <span className="text-xs text-gray-500">
                            {log.duration_ms}ms
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {log.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(log.created_at)}
                      </p>
                    </div>
                    <Icon name="ChevronRight" size={20} className="text-gray-400 flex-shrink-0" />
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Log Details */}
          <div className="lg:sticky lg:top-6 lg:h-fit">
            {selectedLog ? (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Детали лога</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedLog(null)}
                  >
                    <Icon name="X" size={16} />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Функция</label>
                    <p className="text-sm mt-1">{selectedLog.function_name}</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500">Сообщение</label>
                    <p className="text-sm mt-1">{selectedLog.message}</p>
                  </div>

                  {selectedLog.request_id && (
                    <div>
                      <label className="text-xs font-medium text-gray-500">Request ID</label>
                      <p className="text-xs mt-1 font-mono bg-gray-100 p-2 rounded">
                        {selectedLog.request_id}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500">Статус</label>
                      <p className="text-sm mt-1">{selectedLog.status_code || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Время</label>
                      <p className="text-sm mt-1">{selectedLog.duration_ms ? `${selectedLog.duration_ms}ms` : '-'}</p>
                    </div>
                  </div>

                  {selectedLog.request_data && (
                    <div>
                      <label className="text-xs font-medium text-gray-500">Request Data</label>
                      <pre className="text-xs mt-1 bg-gray-100 p-3 rounded overflow-auto max-h-[200px]">
                        {JSON.stringify(selectedLog.request_data, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.response_data && (
                    <div>
                      <label className="text-xs font-medium text-gray-500">Response Data</label>
                      <pre className="text-xs mt-1 bg-gray-100 p-3 rounded overflow-auto max-h-[200px]">
                        {JSON.stringify(selectedLog.response_data, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-gray-500">Время создания</label>
                    <p className="text-sm mt-1">{formatDate(selectedLog.created_at)}</p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-12 text-center">
                <Icon name="MousePointerClick" className="mx-auto mb-3 text-gray-300" size={48} />
                <p className="text-gray-500">Выберите лог для просмотра деталей</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}