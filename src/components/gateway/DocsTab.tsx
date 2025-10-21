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
            Получение токена авторизации (Ferma AuthToken → eKomKassa getToken)
          </p>
          <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800 mb-4">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <Icon name="ExternalLink" size={12} className="inline mr-1" />
              Endpoint: <code className="px-1 bg-blue-100 dark:bg-blue-900 rounded">https://app.ecomkassa.ru/fiscalorder/v5/getToken</code>
            </p>
          </div>
          
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
              <h4 className="text-sm font-semibold mb-2">Параметры eKomKassa (конвертация):</h4>
              <div className="bg-muted p-3 rounded-lg font-mono text-xs">
                <div className="space-y-1">
                  <div><span className="text-primary">login</span>: string <span className="text-muted-foreground">// Из Ferma</span></div>
                  <div><span className="text-primary">pass</span>: string <span className="text-muted-foreground">// password из Ferma</span></div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Ответ eKomKassa:</h4>
              <div className="bg-muted p-3 rounded-lg font-mono text-xs">
                {'{'}<br />
                &nbsp;&nbsp;<span className="text-primary">"code"</span>: 0,<br />
                &nbsp;&nbsp;<span className="text-primary">"text"</span>: "",<br />
                &nbsp;&nbsp;<span className="text-primary">"token"</span>: "eyJhbGc..."<br />
                {'}'}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Токен действителен 24 часа</p>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Badge variant="default">POST</Badge>
            <code className="text-sm">/api/convert/ferma-to-atol</code>
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Конвертирует запрос из формата Ferma в формат eKomKassa (Атол v5)
          </p>
          <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800 mb-4">
            <p className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <span className="block">
                <Icon name="ExternalLink" size={12} className="inline mr-1" />
                Продажа (sell): <code className="px-1 bg-blue-100 dark:bg-blue-900 rounded">https://app.ecomkassa.ru/fiscalorder/v5/{'{group_code}'}/sell</code>
              </span>
              <span className="block">
                <Icon name="ExternalLink" size={12} className="inline mr-1" />
                Возврат (refund): <code className="px-1 bg-blue-100 dark:bg-blue-900 rounded">https://app.ecomkassa.ru/fiscalorder/v5/{'{group_code}'}/refund</code>
              </span>
              <span className="block">
                <Icon name="Info" size={12} className="inline mr-1" />
                Код группы ККТ (например: 700) указывается в URL
              </span>
            </p>
          </div>
          
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

            <div>
              <h4 className="text-sm font-semibold mb-2">Дополнительные параметры:</h4>
              <div className="bg-muted p-3 rounded-lg font-mono text-xs">
                <div className="space-y-1">
                  <div><span className="text-primary">group_code</span>: string <span className="text-muted-foreground">// Код группы ККТ (например: "700")</span></div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <Icon name="BookOpen" size={16} className="text-amber-500 mt-0.5" />
                <div className="text-xs text-amber-700 dark:text-amber-300">
                  <p className="font-medium mb-1">Полная документация:</p>
                  <a 
                    href="https://ecomkassa.ru/dokumentacija_cheki_12" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                  >
                    https://ecomkassa.ru/dokumentacija_cheki_12
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocsTab;