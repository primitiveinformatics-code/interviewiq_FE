"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken } from "@/lib/api";

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    const email = params.get("email");
    const error = params.get("error");

    if (error || !token) {
      router.replace("/login?error=auth_failed");
      return;
    }

    setToken(token);
    if (email) localStorage.setItem("user_email", email);

    const refresh = params.get("refresh_token");
    if (refresh) localStorage.setItem("refresh_token", refresh);

    router.replace("/dashboard");
  }, [params, router]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <p className="text-gray-500 text-sm animate-pulse">Signing you in…</p>
    </div>
  );
}
