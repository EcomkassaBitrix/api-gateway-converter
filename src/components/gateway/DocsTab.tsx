import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

const DocsTab = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="Book" size={20} />
          API Документация
        </CardTitle>
        <CardDescription>Полное описание эндпоинтов и параметров конвертации</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Badge variant="default">POST</Badge>
            <code className="text-sm">/api/auth/token</code>
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Получение токена авторизации (Ferma AuthToken → Атол getToken)
          </p>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">Параметры Ferma:</h4>
              <div className="bg-muted p-3 rounded-lg font-mono text-xs">
                <div className="space-y-1">
                  <div><span className="text-primary">login</span>: string <span className="text-muted-foreground">// Обязательно</span></div>
                  <div><span className="text-primary">password</span>: string <span className="text-muted-foreground">// Обязательно</span></div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Параметры Атол (конвертация):</h4>
              <div className="bg-muted p-3 rounded-lg font-mono text-xs">
                <div className="space-y-1">
                  <div><span className="text-primary">login</span>: string <span className="text-muted-foreground">// Из Ferma</span></div>
                  <div><span className="text-primary">pass</span>: string <span className="text-muted-foreground">// password из Ferma</span></div>
                  <div><span className="text-primary">group_code</span>: string <span className="text-muted-foreground">// Опционально, из ЛК Атол</span></div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Ответ Атол:</h4>
              <div className="bg-muted p-3 rounded-lg font-mono text-xs">
                {'{'}<br />
                &nbsp;&nbsp;<span className="text-primary">"code"</span>: 0,<br />
                &nbsp;&nbsp;<span className="text-primary">"text"</span>: "",<br />
                &nbsp;&nbsp;<span className="text-primary">"token"</span>: "eyJhbGc..."<br />
                {'}'}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Badge variant="default">POST</Badge>
            <code className="text-sm">/api/convert/ferma-to-atol</code>
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Конвертирует запрос из формата Ferma в формат Атол Онлайн
          </p>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">Поддерживаемые операции:</h4>
              <div className="grid gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">sell</Badge>
                  <span className="text-muted-foreground">Продажа товаров/услуг</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">refund</Badge>
                  <span className="text-muted-foreground">Возврат средств</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">sell_correction</Badge>
                  <span className="text-muted-foreground">Коррекция прихода</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">refund_correction</Badge>
                  <span className="text-muted-foreground">Коррекция расхода</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Типы НДС:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">vat20 → НДС 20%</span>
                <span className="text-muted-foreground">vat10 → НДС 10%</span>
                <span className="text-muted-foreground">vat0 → НДС 0%</span>
                <span className="text-muted-foreground">none → Без НДС</span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Способы оплаты:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">cash → Наличные (0)</span>
                <span className="text-muted-foreground">card → Электронные (1)</span>
                <span className="text-muted-foreground">prepaid → Предоплата (2)</span>
                <span className="text-muted-foreground">credit → Постоплата (3)</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocsTab;
