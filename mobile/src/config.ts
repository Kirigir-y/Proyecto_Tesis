import * as SecureStore from 'expo-secure-store';

const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.10:3000/api';

const DEFAULT_PORT = 3000;
const SERVER_URL_KEY = 'server_url';

let apiUrl = DEFAULT_API_URL;

export const getApiUrl = () => apiUrl;

export const getSocketUrl = () => apiUrl.replace(/\/api\/?$/, '');

export const normalizeServerAddress = (input: string): string => {
  let value = input.trim().replace(/\/+$/, '');
  if (!value) return '';
  if (!/^https?:\/\//i.test(value)) {
    const hasPort = /:\d+$/.test(value);
    value = `http://${value}${hasPort ? '' : `:${DEFAULT_PORT}`}`;
  }
  if (!/\/api$/i.test(value)) value = `${value}/api`;
  return value;
};

export const loadApiUrl = async () => {
  try {
    const stored = await SecureStore.getItemAsync(SERVER_URL_KEY);
    if (stored) apiUrl = stored;
  } catch {
  }
};

export const saveApiUrl = async (url: string) => {
  apiUrl = url;
  await SecureStore.setItemAsync(SERVER_URL_KEY, url);
};
