import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isLoggedIn } from "../lib/auth";
import type { JSX } from "react";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { RequireRegistration } from "./RequireRegistration";

export const ProtectedRoute = ({
  children,
}: {
  children: JSX.Element;
}) => {
  const { loading } = useAuth();

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
     AUTH CHECK
  =========================== */
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  return <RequireRegistration>{children}</RequireRegistration>;
};
