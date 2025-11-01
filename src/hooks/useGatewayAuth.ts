import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { getApiUrl } from '@/lib/api';
import { setAuthCredentials, setCurrentToken, setTokenRefreshCallback } from '@/lib/apiClient';

export const useGatewayAuth = () => {
  const [authForm, setAuthForm] = useState({
    login: '',
    password: ''
  });
  const [authToken, setAuthToken] = useState('');
  const [authResponse, setAuthResponse] = useState<any>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    setTokenRefreshCallback((newToken: string) => {
      setAuthToken(newToken);
      toast.info('Токен автоматически обновлён');
    });
  }, []);

  const handleAuth = async () => {
    setIsAuthenticating(true);
    
    try {
      const response = await fetch(getApiUrl('AUTH'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: authForm.login,
          password: authForm.password
        })
      });
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = { error: 'Некорректный ответ от сервера' };
      }
      
      const token = data.token || data.Data?.AuthToken;
      
      if (response.ok && token) {
        setAuthToken(token);
        setCurrentToken(token);
        setAuthCredentials(authForm.login, authForm.password);
        
        const fermaFormat = {
          Status: 'Success',
          Data: {
            AuthToken: token,
            ExpirationDateUtc: data.exp 
              ? new Date(data.exp * 1000).toISOString()
              : new Date(Date.now() + 86400000).toISOString()
          }
        };
        
        setAuthResponse(fermaFormat);
        toast.success('Авторизация успешна');
      } else {
        const errorMsg = data.text || data.Error?.Message || data.error || `Ошибка авторизации (HTTP ${response.status})`;
        toast.error(errorMsg);
        setAuthResponse(data);
      }
    } catch (error) {
      toast.error('Ошибка связи с сервером');
      console.error('Auth error:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return {
    authForm,
    setAuthForm,
    authToken,
    setAuthToken,
    authResponse,
    isAuthenticating,
    handleAuth
  };
};