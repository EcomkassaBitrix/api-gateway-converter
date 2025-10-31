export const FUNCTION_URLS = {
  AUTH: 'https://functions.poehali.dev/4f591135-3b64-4faf-b0b5-32c626cc7175',
  RECEIPT: 'https://functions.poehali.dev/280868cd-939a-438a-8138-b54195ce8005',
  STATUS: 'https://functions.poehali.dev/cff405b3-8d3a-49e0-bc99-cbd9ade0eb5a',
  LOGS: 'https://functions.poehali.dev/ed40a7a0-1c4e-47c5-b69a-bbe27853e591',
  STATS: 'https://functions.poehali.dev/761b5564-12a0-455d-9773-a0b11c201d2a'
} as const;

export const getApiUrl = (endpoint: keyof typeof FUNCTION_URLS): string => {
  return FUNCTION_URLS[endpoint];
};