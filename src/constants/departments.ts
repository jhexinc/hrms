// src/constants/departments.ts

export const DEPARTMENTS = [
  "HR",
  "Sales - Visnagar",
  "Sales - Pune",
  "Sales - Ahmedabad",
  "Marketing",
  "Technical",
  "Admin",
  "Utility",
  "Lead",
  "Onboarding",
  "Accounts",
  "Customer Service Representative",
  "CV Expert",
] as const;

export type Department = (typeof DEPARTMENTS)[number];
