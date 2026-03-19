import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { JSX } from "react";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { RequireRegistration } from "./RequireRegistration";

export const AdminRoute = ({
  children,
}: {
  children: JSX.Element;
}) => {
  const { loading, roles } = useAuth();

  /* ===========================
     LOADING STATE
  =========================== */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="space-y-4 py-6">
            <Skeleton className="h-5 w-1/2 mx-auto" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4 mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ===========================
     ROLE CHECK
  =========================== */
  const isAdmin =
    roles.includes("v4-admin") ||
    roles.includes("v4-hr");

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <RequireRegistration>{children}</RequireRegistration>;
};
