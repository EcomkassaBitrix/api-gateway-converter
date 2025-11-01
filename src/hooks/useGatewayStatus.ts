import { useState } from 'react';
import { toast } from 'sonner';
import { getApiUrl } from '@/lib/api';

interface StatusForm {
  uuid: string;
  group_code: string;
}

interface UseGatewayStatusProps {
  authToken: string;
  authForm: { login: string; password: string };
  handleAuth: () => Promise<void>;
}

export const useGatewayStatus = ({ authToken, authForm, handleAuth }: UseGatewayStatusProps) => {
  const [statusForm, setStatusForm] = useState<StatusForm>({
    uuid: '',
    group_code: '700'
  });
  const [statusResult, setStatusResult] = useState('');
  const [statusConverterResult, setStatusConverterResult] = useState('');
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const handleCheckStatus = async () => {
    setIsCheckingStatus(true);
    
    const makeStatusRequest = async (token: string) => {
      const params = new URLSearchParams({
        AuthToken: token,
        uuid: statusForm.uuid,
        group_code: statusForm.group_code,
        ...(authForm.login && { login: authForm.login }),
        ...(authForm.password && { password: authForm.password })
      });

      return fetch(`${getApiUrl('STATUS')}?${params}`, {
        method: 'GET'
      });
    };
    
    try {
      let response = await makeStatusRequest(authToken);
      let data = await response.json();
      
      const isTokenExpired = response.status === 401 || 
                             data.error === 'ExpiredToken' || 
                             data.Error?.Code === 'ExpiredToken';
      
      if (isTokenExpired && authForm.login && authForm.password) {
        toast.info('Токен истёк, переавторизация...');
        await handleAuth();
        response = await makeStatusRequest(authToken);
        data = await response.json();
      }
      
      // Оригинальный ответ от eKomKassa находится в data.Data (внутри API-конвертера)
      const ekomkassaRawResponse = data.Data || {};
      setStatusResult(JSON.stringify(ekomkassaRawResponse, null, 2));
      
      // Полный ответ API-конвертера (Status + Data в формате Ferma)
      const converterResponse = data.Status && data.Data ? data : {
        Status: 'Failed',
        Error: { Code: 'UNEXPECTED_RESPONSE', Message: 'Unexpected backend response format' }
      };
      
      setStatusConverterResult(JSON.stringify(converterResponse, null, 2));
      
      if (response.ok) {
        if (ekomkassaResponse.status === 'done') {
          toast.success('Чек успешно пробит');
        } else if (ekomkassaResponse.status === 'wait') {
          toast.info('Чек в очереди на обработку');
        } else if (ekomkassaResponse.status === 'fail') {
          toast.error('Ошибка при создании чека');
        }
      } else {
        const errorMsg = ekomkassaResponse.error?.text || ekomkassaResponse.error || 'Ошибка проверки статуса';
        toast.error(errorMsg);
      }
    } catch (error) {
      toast.error('Ошибка связи с сервером');
      console.error('Status check error:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  return {
    statusForm,
    setStatusForm,
    statusResult,
    statusConverterResult,
    isCheckingStatus,
    handleCheckStatus
  };
};