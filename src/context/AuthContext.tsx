// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { decodeToken, getToken, saveToken, logout } from "@/lib/auth";
import { isTokenExpired, getTokenExpiryTime } from "@/lib/tokenUtils";
import { useLocation, useNavigate } from "react-router-dom";

interface AuthContextType {
  loading: boolean;
  isAuthenticated: boolean;
  roles: string[];
  employee: any | null;
  setEmployee: React.Dispatch<React.SetStateAction<any | null>>;
}

const AuthContext = createContext<AuthContextType>({
  loading: true,
  isAuthenticated: false,
  roles: [],
  employee: null,
  setEmployee: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [employee, setEmployee] = useState<any | null>(null);
  const location = useLocation();

  // 🔹 PHASE 1: Read token from Cognito redirect
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("id_token")) return;

    const params = new URLSearchParams(hash.replace("#", ""));
    const token = params.get("id_token");

    if (token) {
      saveToken(token);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // 🔹 PHASE 2: Validate token + roles
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    if (isTokenExpired(token)) {
      alert("Your session expired. Please sign in again.");
      logout();
      return;
    }

    const decoded: any = decodeToken();
    setRoles(decoded?.["cognito:groups"] || []);
    setIsAuthenticated(true);
  }, []);

  // 🔹 PHASE 3: Pre-expiry warning (10 mins)
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const expiry = getTokenExpiryTime(token);
    if (!expiry) return;

    const TEN_MIN = 10 * 60 * 1000;
    const timeout = expiry - Date.now() - TEN_MIN;

    if (timeout > 0) {
      setTimeout(() => {
        alert("Your session will expire in 10 minutes. Please save your work.");
      }, timeout);
    }
  }, []);

  // 🔹 PHASE 4: Fetch profile
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadProfile = async () => {
      try {
        const res = await api.get("/profile/me");

        if (
          res.data?.registrationComplete === false &&
          location.pathname !== "/register"
        ) {
          navigate("/register", { replace: true });
          return;
        }

        setEmployee(res.data);
      } catch {
        if (location.pathname !== "/register") {
          navigate("/register", { replace: true });
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isAuthenticated, location.pathname, navigate]);

  return (
    <AuthContext.Provider value={{ loading, isAuthenticated, roles, employee, setEmployee }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
