// src/lib/api.ts
import axios from "axios";
import { getToken, logout } from "./auth";

export const api = axios.create({
  baseURL: "https://wa2zqd8e7f.execute-api.us-east-1.amazonaws.com/prod",
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      alert("Your session expired. Please sign in again.");
      logout();
    }
    return Promise.reject(err);
  }
);
