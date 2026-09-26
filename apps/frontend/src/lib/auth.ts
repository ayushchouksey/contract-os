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
export const USER_KEY = 'contract_os_user';

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null');
  } catch {
    return null;
  }
}

export function setUserData(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUserData() {
  localStorage.removeItem(USER_KEY);
}

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