import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

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

interface LogsTableProps {
  logs: RequestLog[];
  loading: boolean;
  onViewDetails: (logId: number) => void;
  onReplay: (logId: number) => void;
  replaying: boolean;
}

export default function LogsTable({
  logs,
  loading,
  onViewDetails,
  onReplay,
  replaying
}: LogsTableProps) {
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

  if (loading) {
    return (
      <Card className="p-12 text-center">
        <Icon name="Loader" className="animate-spin mx-auto mb-2" size={32} />
        <p className="text-gray-600">Загрузка логов...</p>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Icon name="Search" className="mx-auto mb-2 text-gray-400" size={48} />
        <p className="text-gray-600">Логи не найдены</p>
        <p className="text-sm text-gray-500 mt-1">Попробуйте изменить фильтры или поисковый запрос</p>
      </Card>
    );
  }

  return (
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
            {logs.map((log) => (
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
                      onClick={() => onViewDetails(log.id)}
                      className="gap-1"
                    >
                      <Icon name="Eye" size={14} />
                      Детали
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReplay(log.id)}
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
  );
}
