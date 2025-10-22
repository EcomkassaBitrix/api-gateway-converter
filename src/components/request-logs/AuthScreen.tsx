import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';

interface AuthScreenProps {
  checkingAuth: boolean;
  loginForm: { login: string; password: string };
  setLoginForm: (form: { login: string; password: string }) => void;
  loggingIn: boolean;
  onLogin: (e: React.FormEvent) => void;
}

export default function AuthScreen({ 
  checkingAuth, 
  loginForm, 
  setLoginForm, 
  loggingIn, 
  onLogin 
}: AuthScreenProps) {
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <Icon name="Loader" className="animate-spin mx-auto mb-2" size={32} />
          <p className="text-gray-600">Проверка авторизации...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="Lock" size={32} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Вход в админку</h1>
          <p className="text-gray-600">Введите логин и пароль для доступа к логам</p>
        </div>
        
        <form onSubmit={onLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Логин</label>
            <Input
              type="text"
              placeholder="admin"
              value={loginForm.login}
              onChange={(e) => setLoginForm({ ...loginForm, login: e.target.value })}
              required
              disabled={loggingIn}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              required
              disabled={loggingIn}
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={loggingIn}>
            {loggingIn ? (
              <>
                <Icon name="Loader" className="animate-spin mr-2" size={16} />
                Вход...
              </>
            ) : (
              <>
                <Icon name="LogIn" className="mr-2" size={16} />
                Войти
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
