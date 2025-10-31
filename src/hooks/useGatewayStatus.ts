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
      
      const ekomkassaResponse = data.ekomkassa_response || data;
      setStatusResult(JSON.stringify(ekomkassaResponse, null, 2));
      
      const converterResponse: any = {
        Status: response.ok && ekomkassaResponse.status !== 'fail' ? 'Success' : 'Failed',
        Data: {} as any
      };
      
      if (response.ok && ekomkassaResponse.status !== 'fail') {
        const statusMapping: Record<string, { code: number; name: string; message: string }> = {
          'wait': { code: 0, name: 'NEW', message: 'Запрос на чек получен в Ferma' },
          'done': { code: 1, name: 'PROCESSED', message: 'Чек сформирован на кассе' },
          'fail': { code: -1, name: 'ERROR', message: 'Ошибка при создании чека' }
        };
        
        const statusInfo = statusMapping[ekomkassaResponse.status] || statusMapping['wait'];
        
        converterResponse.Data = {
          StatusCode: statusInfo.code,
          StatusName: statusInfo.name,
          StatusMessage: statusInfo.message,
          ModifiedDateUtc: ekomkassaResponse.timestamp || new Date().toISOString(),
          ReceiptDateUtc: ekomkassaResponse.status === 'done' ? (ekomkassaResponse.timestamp || new Date().toISOString()) : null,
          ModifiedDateTimeIso: ekomkassaResponse.timestamp || new Date().toISOString(),
          ReceiptDateTimeIso: ekomkassaResponse.status === 'done' ? (ekomkassaResponse.timestamp || new Date().toISOString()) : null,
          ReceiptId: ekomkassaResponse.uuid || ''
        };
        
        if (ekomkassaResponse.status === 'done' && ekomkassaResponse.payload) {
          converterResponse.Data.Device = {
            DeviceId: ekomkassaResponse.payload.device_sn || null,
            RNM: ekomkassaResponse.payload.device_rn || null,
            ZN: ekomkassaResponse.payload.zn || null,
            FN: ekomkassaResponse.payload.fn || null,
            FDN: ekomkassaResponse.payload.fiscal_document_number?.toString() || null,
            FPD: ekomkassaResponse.payload.fiscal_document_attribute?.toString() || null,
            ShiftNumber: ekomkassaResponse.payload.shift_number || null,
            ReceiptNumInShift: ekomkassaResponse.payload.receipt_number_in_shift || null,
            DeviceType: null,
            OfdReceiptUrl: ekomkassaResponse.payload.ofd_receipt_url || null
          };
        } else {
          converterResponse.Data.Device = null;
        }
      } else {
        converterResponse.Error = {
          Code: ekomkassaResponse.error?.code || 'UNKNOWN_ERROR',
          Message: ekomkassaResponse.error?.text || 'Ошибка проверки статуса'
        };
      }
      
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
