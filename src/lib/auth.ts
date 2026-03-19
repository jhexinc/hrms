// src/lib/auth.ts
import { jwtDecode } from "jwt-decode";

const TOKEN_KEY = "v4_id_token";

export const saveToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const decodeToken = () => {
  const token = getToken();
  if (!token) return null;
  return jwtDecode<any>(token);
};

export const isLoggedIn = () => !!getToken();

export const logout = () => {
  clearToken();

  const CLIENT_ID = "5ee6nujtrapp818mchsmpj4248";
  const DOMAIN = "v4-hrms-auth-new.auth.us-east-1.amazoncognito.com";
  const REDIRECT = window.location.origin;

  const url = `https://${DOMAIN}/logout?client_id=${CLIENT_ID}&logout_uri=${encodeURIComponent(
    REDIRECT
  )}`;

  window.location.href = url;
};
