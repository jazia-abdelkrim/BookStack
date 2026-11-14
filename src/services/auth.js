import { API_URL } from './api.js';

async function authRequest(endpoint, body) {
  const response = await fetch(`${API_URL}/auth${endpoint}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Authentication failed.');
  if (data.token && data.user) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  }
  return data;
}
export const register = (name, email, password) => authRequest('/register', { name, email, password });
export const login = (email, password) => authRequest('/login', { email, password });
export async function logout() {
  const token = localStorage.getItem('token');
  try {
    if (token) await fetch(`${API_URL}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  } finally { localStorage.removeItem('token'); localStorage.removeItem('user'); }
}
export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); }
  catch { localStorage.removeItem('user'); return null; }
}

export async function validateSession() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const response = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.user) throw new Error('Session expired');
    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  } catch {
    localStorage.removeItem('token'); localStorage.removeItem('user');
    return null;
  }
}
