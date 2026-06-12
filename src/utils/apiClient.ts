import { auth } from '../firebase';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://smarthomemombe.onrender.com/api';

function toISO(date: any): string | undefined {
  if (!date) return undefined;
  if (date instanceof Date) return date.toISOString();
  if (typeof date.toDate === 'function') return date.toDate().toISOString();
  return String(date);
}

export function serializeDates<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = { ...obj };
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (val instanceof Date || (val && typeof val.toDate === 'function')) {
      result[key] = toISO(val);
    }
  }
  return result as T;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err?.message || `API error ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
};
