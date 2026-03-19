// src/components/RequireRegistration.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const RequireRegistration = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { loading, employee } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (employee && employee.registrationComplete === false) {
    return <Navigate to="/register" replace />;
  }

  return <>{children}</>;
};
