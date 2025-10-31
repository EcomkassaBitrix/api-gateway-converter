import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface AuthTabProps {
  authForm: {
    login: string;
    password: string;
  };
  setAuthForm: (form: any) => void;
  authToken: string;
  authResponse: any;
  isAuthenticating: boolean;
  handleAuth: () => void;
}

const AuthTab = ({ authForm, setAuthForm, authToken, authResponse, isAuthenticating, handleAuth }: AuthTabProps) => {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="Lock" size={20} />
            Ferma AuthToken
          </CardTitle>
          <CardDescription>Запрос токена авторизации в формате Ferma</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login">Логин</Label>
            <Input
              id="login"
              type="text"
              placeholder="your_login"
              value={authForm.login}
              onChange={(e) => setAuthForm({ ...authForm, login: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
            />
          </div>

          <Button 
            onClick={handleAuth}
            disabled={!authForm.login || !authForm.password || isAuthenticating}
            className="w-full mt-4"
          >
            {isAuthenticating ? (
              <>
                <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                Получение токена...
              </>
            ) : (
              <>
                <Icon name="Key" size={16} className="mr-2" />
                Получить токен
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="Shield" size={20} />
            Ответы API
          </CardTitle>
          <CardDescription>Ferma (слева) и eKomKassa (справа)</CardDescription>
        </CardHeader>
        <CardContent>
          {authResponse ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs mb-2 block">Ferma Response</Label>
                  <Textarea
                    value={JSON.stringify({
                      Status: authResponse.Status,
                      Data: authResponse.Data,
                      Error: authResponse.Error
                    }, null, 2)}
                    readOnly
                    className="font-mono text-xs min-h-[200px] bg-background"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-2 block">eKomKassa Response</Label>
                  <Textarea
                    value={JSON.stringify(authResponse.ekomkassa_response || {}, null, 2)}
                    readOnly
                    className="font-mono text-xs min-h-[200px] bg-background"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Access Token</Label>
                <div className="flex gap-2">
                  <Input
                    value={authToken}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(authToken);
                      toast.success('Токен скопирован');
                    }}
                  >
                    <Icon name="Copy" size={16} />
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <Icon name="Info" size={16} className="text-blue-500 mt-0.5" />
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    <p className="font-medium mb-1">Использование токена:</p>
                    <p className="mb-2">Токен действителен 24 часа. Используйте его в заголовке <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 rounded">Token: {'{token}'}</code></p>
                    <p className="text-xs opacity-75">
                      API: <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 rounded text-[10px]">https://app.ecomkassa.ru/fiscalorder/v5/</code>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <div className="p-4 bg-muted rounded-full mb-4">
                <Icon name="KeyRound" size={32} className="text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Токен не получен</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Введите учетные данные слева и нажмите "Получить токен" для авторизации
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthTab;