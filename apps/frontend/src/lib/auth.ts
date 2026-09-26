'use client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  orgId: string | null;
  org?: { id: string; name: string } | null;
  lastLoginAt?: string;
}

export const TOKEN_KEY = 'contract_os_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}