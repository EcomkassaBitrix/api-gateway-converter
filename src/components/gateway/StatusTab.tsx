import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';

interface StatusTabProps {
  statusForm: {
    uuid: string;
    group_code: string;
  };
  setStatusForm: (form: { uuid: string; group_code: string }) => void;
  authToken: string;
  statusResult: string;
  statusConverterResult: string;
  isCheckingStatus: boolean;
  handleCheckStatus: () => void;
}

const StatusTab = ({
  statusForm,
  setStatusForm,
  authToken,
  statusResult,
  statusConverterResult,
  isCheckingStatus,
  handleCheckStatus
}: StatusTabProps) => {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="Search" size={20} />
            Проверка статуса
          </CardTitle>
          <CardDescription>Получение информации о чеке по UUID</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!authToken && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <Icon name="AlertTriangle" size={16} className="text-amber-500 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Сначала получите токен на вкладке "Авторизация"
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="uuid">UUID чека</Label>
            <Input
              id="uuid"
              placeholder="550e8400-e29b-41d4-a716-446655440000"
              value={statusForm.uuid}
              onChange={(e) => setStatusForm({ ...statusForm, uuid: e.target.value })}
              disabled={!authToken}
            />
            <p className="text-xs text-muted-foreground">
              UUID получается из ответа при создании чека
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="group_code">Код группы ККТ</Label>
            <Input
              id="group_code"
              placeholder="700"
              value={statusForm.group_code}
              onChange={(e) => setStatusForm({ ...statusForm, group_code: e.target.value })}
              disabled={!authToken}
            />
            <p className="text-xs text-muted-foreground">
              Тот же group_code, который использовался при создании чека
            </p>
          </div>

          <Button
            onClick={handleCheckStatus}
            disabled={!authToken || !statusForm.uuid || isCheckingStatus}
            className="w-full"
          >
            {isCheckingStatus ? (
              <>
                <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                Проверка...
              </>
            ) : (
              <>
                <Icon name="Search" size={16} className="mr-2" />
                Проверить статус
              </>
            )}
          </Button>

          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <Icon name="Info" size={12} className="inline mr-1" />
              Статусы: <strong>wait</strong> (в очереди), <strong>done</strong> (пробит), <strong>fail</strong> (ошибка)
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Server" size={20} />
              Ответ от eKomKassa
            </CardTitle>
            <CardDescription>Исходный ответ от сервиса eKomKassa</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={statusResult}
              readOnly
              placeholder="Ответ от eKomKassa появится здесь..."
              className="font-mono text-sm min-h-[300px]"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="FileText" size={20} />
              Ответ API-конвертера
            </CardTitle>
            <CardDescription>Преобразованный ответ в формате Ferma</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={statusConverterResult}
              readOnly
              placeholder="Ответ API-конвертера появится здесь..."
              className="font-mono text-sm min-h-[300px]"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StatusTab;