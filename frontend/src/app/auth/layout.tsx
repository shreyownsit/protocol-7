import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication | LexiClear",
  description: "Sign in or create an account with LexiClear contract intelligence platform",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}
