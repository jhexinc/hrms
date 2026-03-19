// src/lib/tokenUtils.ts
import { jwtDecode } from "jwt-decode";

export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded: any = jwtDecode(token);
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

export const getTokenExpiryTime = (token: string): number | null => {
  try {
    const decoded: any = jwtDecode(token);
    return decoded.exp * 1000;
  } catch {
    return null;
  }
};
