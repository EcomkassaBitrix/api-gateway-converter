import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';

interface SandboxTabProps {
  fermaInput: string;
  setFermaInput: (value: string) => void;
  atolOutput: string;
  fermaOutput: string;
  isConverting: boolean;
  handleConvert: () => void;
  loadExample: () => void;
  loadCorrectionExample: () => void;
}

const SandboxTab = ({ 
  fermaInput, 
  setFermaInput, 
  atolOutput,
  fermaOutput, 
  isConverting, 
  handleConvert, 
  loadExample,
  loadCorrectionExample 
}: SandboxTabProps) => {
  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Icon name="FileJson" size={20} />
                Ferma Input
              </CardTitle>
              <CardDescription>Введите запрос в формате Ferma</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadExample}>
                <Icon name="Sparkles" size={14} className="mr-1" />
                Продажа
              </Button>
              <Button variant="outline" size="sm" onClick={loadCorrectionExample}>
                <Icon name="FileEdit" size={14} className="mr-1" />
                Коррекция
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={fermaInput}
            onChange={(e) => setFermaInput(e.target.value)}
            placeholder='{"operation": "sell", "items": [...]}'
            className="font-mono text-sm min-h-[400px]"
          />
          <Button 
            onClick={handleConvert} 
            disabled={!fermaInput || isConverting}
            className="w-full mt-4"
          >
            {isConverting ? (
              <>
                <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                Конвертация...
              </>
            ) : (
              <>
                <Icon name="ArrowRight" size={16} className="mr-2" />
                Конвертировать
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="Zap" size={20} />
            Результат
          </CardTitle>
          <CardDescription>Ответ появится ниже после конвертации</CardDescription>
        </CardHeader>
        <CardContent>
          {!atolOutput ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
              <Icon name="ArrowDown" size={48} className="mb-4 opacity-20" />
              <p>Нажмите "Конвертировать" для получения результата</p>
            </div>
          ) : (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Icon name="CheckCircle2" size={64} className="text-green-500 mx-auto mb-4" />
                <p className="text-lg font-semibold">Результаты готовы</p>
                <p className="text-sm text-muted-foreground">Смотрите ответы ниже</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {fermaOutput && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="Code2" size={20} />
                eKomKassa Response
              </CardTitle>
              <CardDescription>Сырой ответ от API eKomKassa</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={atolOutput}
                readOnly
                placeholder="Ответ от eKomKassa..."
                className="font-mono text-sm min-h-[300px] bg-muted"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="FileJson" size={20} />
                Ferma Response
              </CardTitle>
              <CardDescription>Сконвертированный ответ в формате Ferma</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={fermaOutput}
                readOnly
                placeholder="Ответ в формате Ferma..."
                className="font-mono text-sm min-h-[300px] bg-muted"
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SandboxTab;