import React, { Suspense } from "react";
import { AuthCard, AuthMode } from "@/components/auth/AuthCard";

function AuthContent() {
  return <AuthCard initialMode="sign-in" />;
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-[var(--color-text-muted)]">Loading authentication...</div>}>
      <AuthContent />
    </Suspense>
  );
}
