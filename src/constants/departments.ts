// src/constants/departments.ts

export const DEPARTMENTS = [
  "HR",
  "Sales",
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
