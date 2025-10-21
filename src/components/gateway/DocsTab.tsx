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
                Возврат (sell_refund): <code className="px-1 bg-blue-100 dark:bg-blue-900 rounded">https://app.ecomkassa.ru/fiscalorder/v5/{'{group_code}'}/sell_refund</code>
              </span>
              <span className="block">
                <Icon name="ExternalLink" size={12} className="inline mr-1" />
                Коррекция прихода (sell_correction): <code className="px-1 bg-blue-100 dark:bg-blue-900 rounded">https://app.ecomkassa.ru/fiscalorder/v5/{'{group_code}'}/sell_correction</code>
              </span>
              <span className="block">
                <Icon name="ExternalLink" size={12} className="inline mr-1" />
                Коррекция расхода (buy_correction): <code className="px-1 bg-blue-100 dark:bg-blue-900 rounded">https://app.ecomkassa.ru/fiscalorder/v5/{'{group_code}'}/buy_correction</code>
              </span>
              <span className="block">
                <Icon name="Info" size={12} className="inline mr-1" />
                Код группы ККТ (например: 700) указывается в URL
              </span>
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">Параметры Ferma (Receipt):</h4>
              <div className="bg-muted p-3 rounded-lg font-mono text-xs mb-4">
                <div className="space-y-1">
                  <div><span className="text-primary">operation</span>: string <span className="text-muted-foreground">// "sell" | "refund" | "sell_correction" | "refund_correction"</span></div>
                  <div><span className="text-primary">group_code</span>: string <span className="text-muted-foreground">// Обязательно, код группы ККТ (например: "700")</span></div>
                  <div><span className="text-primary">items</span>: array <span className="text-muted-foreground">// Массив товаров</span></div>
                  <div><span className="text-primary">payments</span>: array <span className="text-muted-foreground">// Массив платежей</span></div>
                </div>
              </div>
            </div>

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
              <h4 className="text-sm font-semibold mb-2">Типы НДС (Ferma → eKomKassa):</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">VatNo → none (Без НДС)</span>
                <span className="text-muted-foreground">Vat0 → vat0 (НДС 0%)</span>
                <span className="text-muted-foreground">Vat10 → vat10 (НДС 10%)</span>
                <span className="text-muted-foreground">Vat20 → vat20 (НДС 20%)</span>
                <span className="text-muted-foreground">CalculatedVat10110 → vat10</span>
                <span className="text-muted-foreground">CalculatedVat20120 → vat20</span>
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
              <h4 className="text-sm font-semibold mb-2">Маппинг типов операций (Ferma → eKomKassa):</h4>
              <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                <span className="text-muted-foreground">Income → sell</span>
                <span className="text-muted-foreground">IncomeReturn → sell_refund</span>
                <span className="text-muted-foreground">IncomeCorrection → sell_correction</span>
                <span className="text-muted-foreground">OutcomeCorrection → buy_correction</span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Чеки коррекции (CorrectionInfo):</h4>
              <div className="bg-muted p-3 rounded-lg font-mono text-xs mb-2">
                <div className="space-y-1">
                  <div><span className="text-primary">Type</span>: "SELF" | "INSTRUCTION" <span className="text-muted-foreground">// Тип коррекции</span></div>
                  <div><span className="text-primary">Description</span>: string <span className="text-muted-foreground">// Описание коррекции</span></div>
                  <div><span className="text-primary">ReceiptDate</span>: string <span className="text-muted-foreground">// Дата документа (dd.MM.yyyy)</span></div>
                  <div><span className="text-primary">ReceiptId</span>: string <span className="text-muted-foreground">// Номер документа</span></div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Используется только для операций IncomeCorrection и OutcomeCorrection</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Единицы измерения (Measure → код):</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">PIECE → 0 (штука)</span>
                <span className="text-muted-foreground">KILOGRAM → 11 (кг)</span>
                <span className="text-muted-foreground">METER → 22 (метр)</span>
                <span className="text-muted-foreground">LITER → 41 (литр)</span>
                <span className="text-muted-foreground">HOUR → 71 (час)</span>
                <span className="text-muted-foreground">OTHER → 255 (другое)</span>
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

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Badge variant="default">GET</Badge>
            <code className="text-sm">/api/convert/ferma-status</code>
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Получение статуса чека из eKomKassa (аналог Ferma Status API)
          </p>
          <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800 mb-4">
            <p className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <span className="block">
                <Icon name="ExternalLink" size={12} className="inline mr-1" />
                Статус чека: <code className="px-1 bg-blue-100 dark:bg-blue-900 rounded">https://app.ecomkassa.ru/fiscalorder/v5/{'{group_code}'}/report/{'{uuid}'}</code>
              </span>
              <span className="block">
                <Icon name="Info" size={12} className="inline mr-1" />
                UUID чека получается из ответа при создании чека
              </span>
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">Query параметры:</h4>
              <div className="bg-muted p-3 rounded-lg font-mono text-xs mb-4">
                <div className="space-y-1">
                  <div><span className="text-primary">AuthToken</span>: string <span className="text-muted-foreground">// Обязательно, токен из /api/convert/ferma-auth</span></div>
                  <div><span className="text-primary">uuid</span>: string <span className="text-muted-foreground">// Обязательно, UUID чека</span></div>
                  <div><span className="text-primary">group_code</span>: string <span className="text-muted-foreground">// Опционально, код группы ККТ (по умолчанию "700")</span></div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Пример запроса:</h4>
              <div className="bg-muted p-3 rounded-lg font-mono text-xs overflow-x-auto">
                <code>GET /api/convert/ferma-status?AuthToken=ваш_токен&uuid=550e8400-e29b-41d4-a716-446655440000&group_code=700</code>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Возможные статусы:</h4>
              <div className="grid gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">wait</Badge>
                  <span className="text-muted-foreground">Чек в очереди на обработку</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">done</Badge>
                  <span className="text-muted-foreground">Чек успешно пробит</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">fail</Badge>
                  <span className="text-muted-foreground">Ошибка при создании чека</span>
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