import { useState } from 'react';
import { toast } from 'sonner';
import { getApiUrl } from '@/lib/api';

interface UseGatewaySandboxProps {
  authToken: string;
  authForm: { login: string; password: string };
}

export const exampleFermaRequest = {
  "Request": {
    "Inn": "0123456789",
    "Type": "Income",
    "InvoiceId": "6f000fee-bbac-4444-bda1-e9ce9999fcc7",
    "CallbackUrl": "https://webhook.site/0c01f3ef-597e-43d8-8463-4c1b942d3ea2",
    "CustomerReceipt": {
      "TaxationSystem": "Common",
      "CashlessPayments": [
        {
          "PaymentSum": 5328.53,
          "PaymentMethodFlag": "1",
          "PaymentIdentifiers": "132",
          "AdditionalInformation": "Полная оплата безналичными"
        }
      ],
      "Email": "example@ya.ru",
      "Phone": "+79000000001",
      "PaymentType": 4,
      "Items": [
        {
          "Label": "Оплата услуг по страхованию.",
          "Price": 5328.53,
          "Quantity": 1.0,
          "Amount": 5328.53,
          "Vat": "VatNo",
          "MarkingCode": null,
          "PaymentMethod": 4,
          "Measure": "PIECE"
        }
      ],
      "PaymentItems": null,
      "CustomUserProperty": null
    }
  },
  "group_code": "700"
};

export const exampleCorrectionRequest = {
  "Request": {
    "Inn": "0123456789",
    "Type": "IncomeCorrection",
    "InvoiceId": "test2_8744273567_u12",
    "CallbackUrl": "https://webhook.site/0c01f3ef-597e-43d8-8463-4c1b942d3ea2",
    "CustomerReceipt": {
      "TaxationSystem": "Common",
      "CashlessPayments": [
        {
          "PaymentSum": 1,
          "PaymentMethodFlag": "1",
          "PaymentIdentifiers": "132",
          "AdditionalInformation": "Полная оплата безналичными"
        }
      ],
      "Email": "example@mail.ru",
      "Phone": null,
      "CorrectionInfo": {
        "Type": "SELF",
        "Description": "Самостоятельная операция",
        "ReceiptDate": "15.08.2019",
        "ReceiptId": "1"
      },
      "Items": [
        {
          "Label": "Расходы",
          "Price": 1,
          "Quantity": 1,
          "Amount": 1,
          "Vat": "CalculatedVat20120",
          "PaymentMethod": 4,
          "Measure": "PIECE",
          "PaymentType": 4
        }
      ]
    }
  },
  "group_code": "700"
};

export const useGatewaySandbox = ({ authToken, authForm }: UseGatewaySandboxProps) => {
  const [fermaInput, setFermaInput] = useState('');
  const [atolOutput, setAtolOutput] = useState('');
  const [fermaOutput, setFermaOutput] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [usedInvoiceIds, setUsedInvoiceIds] = useState<Record<string, Set<string>>>({});

  const generateInvoiceId = (groupCode: string): string => {
    const prefix = 'APIGW';
    const datePart = new Date().getTime();
    const randomPart = Math.floor(Math.random() * 1000000);
    
    let invoiceId = `${prefix}_${datePart}_${randomPart}`;
    
    if (!usedInvoiceIds[groupCode]) {
      usedInvoiceIds[groupCode] = new Set();
    }
    
    while (usedInvoiceIds[groupCode].has(invoiceId)) {
      const newRandomPart = Math.floor(Math.random() * 1000000);
      invoiceId = `${prefix}_${datePart}_${newRandomPart}`;
    }
    
    const newUsedIds = { ...usedInvoiceIds };
    if (!newUsedIds[groupCode]) {
      newUsedIds[groupCode] = new Set();
    }
    newUsedIds[groupCode].add(invoiceId);
    setUsedInvoiceIds(newUsedIds);
    
    return invoiceId;
  };

  const loadExample = () => {
    const example = JSON.parse(JSON.stringify(exampleFermaRequest));
    const groupCode = example.group_code || '700';
    example.Request.InvoiceId = generateInvoiceId(groupCode);
    
    setFermaInput(JSON.stringify(example, null, 2));
    toast.info('Загружен пример продажи');
  };

  const loadCorrectionExample = () => {
    const example = JSON.parse(JSON.stringify(exampleCorrectionRequest));
    const groupCode = example.group_code || '700';
    example.Request.InvoiceId = generateInvoiceId(groupCode);
    
    setFermaInput(JSON.stringify(example, null, 2));
    toast.info('Загружен пример коррекции');
  };

  const handleConvert = async () => {
    setIsConverting(true);
    
    try {
      const fermaData = JSON.parse(fermaInput);
      
      const response = await fetch(getApiUrl('RECEIPT'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...fermaData,
          token: authToken,
          login: authForm.login,
          password: authForm.password
        })
      });
      
      const data = await response.json();
      
      const ekomkassaResponse = data.ekomkassa_response || data;
      setAtolOutput(JSON.stringify(ekomkassaResponse, null, 2));
      
      const fermaResponse: any = {
        Status: response.ok ? 'Success' : 'Failed',
        Data: {
          ReceiptId: ekomkassaResponse.uuid || ''
        }
      };
      
      if (!response.ok || ekomkassaResponse.error) {
        fermaResponse.Status = 'Failed';
        fermaResponse.Error = {
          Code: ekomkassaResponse.error?.code || ekomkassaResponse.error || 'UNKNOWN_ERROR',
          Message: ekomkassaResponse.error?.text || ekomkassaResponse.error || 'Неизвестная ошибка'
        };
      }
      
      setFermaOutput(JSON.stringify(fermaResponse, null, 2));
      
      if (response.ok) {
        toast.success('Чек успешно создан');
      } else {
        const errorMsg = data.error?.text || data.error || 'Ошибка создания чека';
        toast.error(errorMsg);
      }
    } catch (error) {
      toast.error('Ошибка парсинга или связи');
      console.error('Convert error:', error);
    } finally {
      setIsConverting(false);
    }
  };

  return {
    fermaInput,
    setFermaInput,
    atolOutput,
    fermaOutput,
    isConverting,
    handleConvert,
    loadExample,
    loadCorrectionExample
  };
};
