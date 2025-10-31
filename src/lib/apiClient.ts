import { getApiUrl } from './api';

interface AuthCredentials {
  login: string;
  password: string;
}

let authCredentials: AuthCredentials | null = null;
let currentToken: string | null = null;
let tokenRefreshCallback: ((token: string) => void) | null = null;

export const setAuthCredentials = (login: string, password: string) => {
  authCredentials = { login, password };
};

export const setCurrentToken = (token: string) => {
  currentToken = token;
};

export const setTokenRefreshCallback = (callback: (token: string) => void) => {
  tokenRefreshCallback = callback;
};

const refreshToken = async (): Promise<string | null> => {
  if (!authCredentials) {
    return null;
  }

  try {
    const response = await fetch(getApiUrl('AUTH'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        login: authCredentials.login,
        password: authCredentials.password
      })
    });

    const data = await response.json();

    if (response.ok && data.Status === 'Success' && data.Data?.AuthToken) {
      currentToken = data.Data.AuthToken;
      if (tokenRefreshCallback) {
        tokenRefreshCallback(currentToken);
      }
      return currentToken;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }

  return null;
};

export const apiCall = async (
  endpoint: keyof typeof import('./api').FUNCTION_URLS,
  options: RequestInit = {},
  requiresAuth: boolean = true
): Promise<Response> => {
  const makeRequest = async (token?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    };

    if (requiresAuth && token) {
      headers['X-Auth-Token'] = token;
    }

    return fetch(getApiUrl(endpoint), {
      ...options,
      headers
    });
  };

  let response = await makeRequest(currentToken || undefined);

  if (response.status === 401 && requiresAuth && authCredentials) {
    const newToken = await refreshToken();
    
    if (newToken) {
      response = await makeRequest(newToken);
    }
  }

  return response;
};
