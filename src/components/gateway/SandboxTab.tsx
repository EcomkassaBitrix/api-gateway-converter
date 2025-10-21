import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';

interface SandboxTabProps {
  fermaInput: string;
  setFermaInput: (value: string) => void;
  atolOutput: string;
  isConverting: boolean;
  handleConvert: () => void;
  loadExample: () => void;
}

const SandboxTab = ({ 
  fermaInput, 
  setFermaInput, 
  atolOutput, 
  isConverting, 
  handleConvert, 
  loadExample 
}: SandboxTabProps) => {
  return (
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
            <Button variant="outline" size="sm" onClick={loadExample}>
              <Icon name="Sparkles" size={14} className="mr-1" />
              Пример
            </Button>
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
            <Icon name="Code2" size={20} />
            Атол Output
          </CardTitle>
          <CardDescription>Результат конвертации в формат Атол</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={atolOutput}
            readOnly
            placeholder="Результат появится здесь..."
            className="font-mono text-sm min-h-[400px] bg-muted"
          />
          {atolOutput && (
            <Button variant="outline" className="w-full mt-4">
              <Icon name="Copy" size={16} className="mr-2" />
              Копировать
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SandboxTab;
