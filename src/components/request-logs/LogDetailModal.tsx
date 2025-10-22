import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface RequestLogDetail {
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
  user_agent: string;
  request_headers: any;
  target_method: string;
  target_headers: any;
  target_body: any;
  response_headers: any;
  client_response_body: any;
}

interface LogDetailModalProps {
  log: RequestLogDetail | null;
  onClose: () => void;
  onReplay: (logId: number) => void;
  replaying: boolean;
}

export default function LogDetailModal({
  log,
  onClose,
  onReplay,
  replaying
}: LogDetailModalProps) {
  if (!log) return null;

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

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    toast.success('Скопировано в буфер обмена');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" onClick={onClose}>
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b bg-gray-50 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Детали запроса</h2>
              <p className="text-sm text-gray-600 mt-1">Request ID: {log.request_id}</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
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
                  <Badge variant={getMethodColor(log.method)}>{log.method}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Статус:</span>
                  <Badge variant={getStatusColor(log.response_status)}>{log.response_status || 'N/A'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Время выполнения:</span>
                  <span className="font-mono">{log.duration_ms}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">IP клиента:</span>
                  <span className="font-mono">{log.source_ip}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Время:</span>
                  <span>{formatDate(log.created_at)}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">User Agent</h3>
              <p className="text-sm text-gray-600 break-words">{log.user_agent || 'N/A'}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-2">URL запроса</h3>
            <code className="block bg-gray-50 p-3 rounded text-xs break-all">{log.url}</code>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Целевой URL</h3>
            <code className="block bg-gray-50 p-3 rounded text-xs break-all">{log.target_url}</code>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Заголовки запроса</h3>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                {JSON.stringify(log.request_headers, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Заголовки ответа</h3>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                {JSON.stringify(log.response_headers, null, 2)}
              </pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Тело запроса</h3>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto max-h-64">
              {typeof log.request_body === 'string' 
                ? log.request_body 
                : JSON.stringify(log.request_body, null, 2)}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Тело ответа</h3>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto max-h-64">
              {typeof log.response_body === 'string' 
                ? log.response_body 
                : JSON.stringify(log.response_body, null, 2)}
            </pre>
          </div>

          {log.error_message && (
            <div>
              <h3 className="font-semibold text-red-700 mb-2">Ошибка</h3>
              <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-800">
                {log.error_message}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={() => onReplay(log.id)}
              disabled={replaying}
              className="gap-2"
            >
              <Icon name="Play" size={16} />
              Повторить запрос
            </Button>
            <Button
              variant="outline"
              onClick={handleCopy}
              className="gap-2"
            >
              <Icon name="Copy" size={16} />
              Копировать JSON
            </Button>
            <Button variant="outline" onClick={onClose} className="ml-auto">
              Закрыть
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
