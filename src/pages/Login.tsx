// src/pages/Login.tsx
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Login() {
  const CLIENT_ID = "5ee6nujtrapp818mchsmpj4248";
  const DOMAIN = "v4-hrms-auth-new.auth.us-east-1.amazoncognito.com";
  const REDIRECT = window.location.origin;

  const loginUrl = `https://${DOMAIN}/login?client_id=${CLIENT_ID}&response_type=token&scope=email+openid+profile&redirect_uri=${encodeURIComponent(
    REDIRECT
  )}`;

  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = loginUrl;
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardContent className="pt-8 pb-10 flex flex-col items-center text-center gap-6">
          <img
            src="/image.png"
            alt="HRMS Logo"
            className="h-14 w-14 object-contain"
          />

          <div className="space-y-1">
            <h1 className="text-xl font-semibold">HRMS Portal</h1>
            <p className="text-sm text-muted-foreground">
              Secure employee management system
            </p>
          </div>

          <div className="flex items-center gap-2 text-emerald-700">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">
              Signing you in securely…
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
