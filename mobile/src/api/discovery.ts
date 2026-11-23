import { NativeModules } from 'react-native';
import { getApiUrl, saveApiUrl } from '../config';

let Network: typeof import('expo-network') | null = null;
try {
  Network = require('expo-network');
} catch {
  Network = null;
}

const PORT = 3000;
const SERVICE_ID = 'eleam-backend';
const PROBE_TIMEOUT_MS = 1500;
const BATCH_SIZE = 40;

const isOurServer = async (apiUrl: string, timeoutMs = PROBE_TIMEOUT_MS): Promise<boolean> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${apiUrl}/health`, { signal: controller.signal });
    if (!res.ok) return false;
    const body = await res.json();
    return body?.service === SERVICE_ID;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

const isPrivateIPv4 = (ip: string) =>
  /^10\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip);

export const discoverServer = async (): Promise<string | null> => {
  if (!Network) return null;
  let myIp: string;
  try {
    myIp = await Network.getIpAddressAsync();
  } catch {
    return null;
  }
  if (!isPrivateIPv4(myIp)) return null;

  const prefix = myIp.split('.').slice(0, 3).join('.');
  const candidates = Array.from({ length: 254 }, (_, i) => `${prefix}.${i + 1}`).filter((ip) => ip !== myIp);

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE).map((ip) => `http://${ip}:${PORT}/api`);
    const results = await Promise.all(batch.map(async (url) => ((await isOurServer(url)) ? url : null)));
    const found = results.find(Boolean);
    if (found) return found;
  }
  return null;
};

const devServerApiUrl = (): string | null => {
  try {
    const sourceCode = NativeModules?.SourceCode;
    const scriptURL: string | undefined = sourceCode?.getConstants?.().scriptURL ?? sourceCode?.scriptURL;
    const host = scriptURL?.match(/^https?:\/\/([^/:]+)/)?.[1];
    if (!host || !isPrivateIPv4(host)) return null;
    return `http://${host}:${PORT}/api`;
  } catch {
    return null;
  }
};

export const ensureServer = async (): Promise<boolean> => {
  if (await isOurServer(getApiUrl(), 2500)) return true;
  const devUrl = devServerApiUrl();
  if (devUrl && (await isOurServer(devUrl, 2500))) {
    await saveApiUrl(devUrl);
    return true;
  }
  const found = await discoverServer();
  if (!found) return false;
  await saveApiUrl(found);
  return true;
};
