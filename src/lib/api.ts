export const API_URLS = {
  AUTH: '/api/Authorization/CreateAuthToken',
  RECEIPT: '/api/kkt/cloud/receipt',
  STATUS: '/api/kkt/cloud/status',
  LOGS: '/api/gateway/logs'
} as const;

export const FUNCTION_URLS = {
  AUTH: 'https://functions.poehali.dev/b9da35cd-e700-4dba-bd0a-275e029345e0',
  RECEIPT: 'https://functions.poehali.dev/280868cd-939a-438a-8138-b54195ce8005',
  STATUS: 'https://functions.poehali.dev/cff405b3-8d3a-49e0-bc99-cbd9ade0eb5a',
  LOGS: 'https://functions.poehali.dev/ed40a7a0-1c4e-47c5-b69a-bbe27853e591'
} as const;

const isProduction = import.meta.env.PROD;

export const getApiUrl = (endpoint: keyof typeof API_URLS): string => {
  if (isProduction) {
    return API_URLS[endpoint];
  }
  return FUNCTION_URLS[endpoint];
};
