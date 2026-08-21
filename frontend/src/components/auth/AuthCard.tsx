"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
  Loader2
} from "lucide-react";

export type AuthMode = "sign-in" | "sign-up" | "password-reset" | "verification";

interface AuthCardProps {
  initialMode?: AuthMode;
}

export const AuthCard: React.FC<AuthCardProps> = ({ initialMode = "sign-in" }) => {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""]);
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Sync mode if initialMode prop changes
  useEffect(() => {
    setMode(initialMode);
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [initialMode]);

  // Password validation requirements for Sign Up
  const passwordRequirements = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "One uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "One number or symbol", valid: /[0-9!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];
  const isPasswordValid = passwordRequirements.every((req) => req.valid);

  const handleModeSwitch = (newMode: AuthMode) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setResetSent(false);
    setMode(newMode);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setErrorMessage("Please enter both your email address and password.");
      return;
    }

    setIsLoading(true);

    // Mock authentication with Supabase interface structure
    setTimeout(() => {
      setIsLoading(false);
      // For demo testing: simulate invalid credentials if password is "wrong"
      if (password === "wrong") {
        setErrorMessage("The email address or password entered does not match our records. Your account remains protected.");
        return;
      }

      setSuccessMessage("Authentication successful. Redirecting to workspace...");
      setTimeout(() => {
        router.push("/");
      }, 1000);
    }, 1200);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (!isPasswordValid) {
      setErrorMessage("Please ensure your password meets all security criteria.");
      return;
    }
    if (!agreedToTerms) {
      setErrorMessage("You must acknowledge the terms and privacy policy to continue.");
      return;
    }

    setIsLoading(true);

    // Mock signup request
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMessage("Account created successfully!");
      setResendCooldown(45);
      setMode("verification");
    }, 1200);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    // Mock password reset request
    setTimeout(() => {
      setIsLoading(false);
      setResetSent(true);
      setResendCooldown(60);
    }, 1200);
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = verificationCode.join("");
    if (code.length < 6) {
      setErrorMessage("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    setTimeout(() => {
      setIsLoading(false);
      setSuccessMessage("Email verified successfully. Welcome to LexiClear!");
      setTimeout(() => {
        router.push("/");
      }, 1000);
    }, 1200);
  };

  const handleResendVerification = () => {
    if (resendCooldown > 0) return;
    setResendCooldown(60);
    setSuccessMessage("A fresh verification link has been sent to your email.");
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`code-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <div className="w-full max-w-[440px] mx-auto">
      {/* Brand Header (Static & Trust-establishing as per Spec) */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-5 group">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-primary-dark)] text-white flex items-center justify-center font-bold text-base shadow-xs group-hover:scale-105 transition-transform">
            L
          </div>
          <span className="font-semibold text-xl tracking-tight text-[var(--color-text-primary)]">
            LexiClear
          </span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-secondary font-semibold text-[var(--color-text-primary)] tracking-tight">
          {mode === "sign-in" && "Understand what you're signing"}
          {mode === "sign-up" && "Create your LexiClear account"}
          {mode === "password-reset" && "Recover your account access"}
          {mode === "verification" && "Verify your email address"}
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[var(--color-text-secondary)]">
          {mode === "sign-in" && "Enter your credentials to access your contract workspace."}
          {mode === "sign-up" && "Join legal teams simplifying contract simulation & negotiation."}
          {mode === "password-reset" && "We'll send you secure instructions to reset your password."}
          {mode === "verification" && `We've sent a 6-digit confirmation code to ${email || "your email"}.`}
        </p>
      </div>

      {/* Auth Card Container */}
      <div className="bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-2xl shadow-sm p-6 sm:p-9 transition-all duration-200">
        {/* Error Banner following the 3-question rule: What happened, Is my data safe, What next */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 p-3.5 rounded-lg bg-[#C733330F] border border-[#C7333333] flex items-start gap-2.5 text-xs text-[#C73333] animate-in fade-in duration-200"
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold block">Authentication Notice</span>
              <p className="text-[var(--color-text-secondary)] leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div
            role="status"
            className="mb-6 p-3.5 rounded-lg bg-[#3F7D5C0F] border border-[#3F7D5C33] flex items-start gap-2.5 text-xs text-[var(--color-success)] animate-in fade-in duration-200"
          >
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Success</span>
              <p className="text-[var(--color-text-secondary)] leading-relaxed">{successMessage}</p>
            </div>
          </div>
        )}

        {/* MODE 1: SIGN IN */}
        {mode === "sign-in" && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label
                htmlFor="sign-in-email"
                className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5"
              >
                Work Email
              </label>
              <div className="relative">
                <input
                  id="sign-in-email"
                  type="email"
                  required
                  disabled={isLoading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2.5 pl-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-dark)] focus:border-transparent transition-all disabled:opacity-60"
                />
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="sign-in-password"
                  className="block text-xs font-semibold text-[var(--color-text-primary)]"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => handleModeSwitch("password-reset")}
                  className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors underline-offset-2 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="sign-in-password"
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 pl-9 pr-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-dark)] focus:border-transparent transition-all disabled:opacity-60"
                />
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-[var(--color-primary-dark)] text-white text-sm font-semibold hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            <div className="pt-4 border-t border-[var(--color-border)] text-center">
              <p className="text-xs text-[var(--color-text-secondary)]">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => handleModeSwitch("sign-up")}
                  className="font-semibold text-[var(--color-text-primary)] hover:underline"
                >
                  Sign up
                </button>
              </p>
            </div>
          </form>
        )}

        {/* MODE 2: SIGN UP */}
        {mode === "sign-up" && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label
                htmlFor="sign-up-name"
                className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5"
              >
                Full Name
              </label>
              <div className="relative">
                <input
                  id="sign-up-name"
                  type="text"
                  required
                  disabled={isLoading}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full px-3.5 py-2.5 pl-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-dark)] focus:border-transparent transition-all disabled:opacity-60"
                />
                <UserIcon
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="sign-up-email"
                className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5"
              >
                Work Email
              </label>
              <div className="relative">
                <input
                  id="sign-up-email"
                  type="email"
                  required
                  disabled={isLoading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2.5 pl-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-dark)] focus:border-transparent transition-all disabled:opacity-60"
                />
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="sign-up-password"
                className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="sign-up-password"
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full px-3.5 py-2.5 pl-9 pr-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-dark)] focus:border-transparent transition-all disabled:opacity-60"
                />
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Password Requirement Checklist */}
              <div className="mt-2.5 p-2.5 rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] space-y-1.5">
                <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] block">
                  Password requirements:
                </span>
                {passwordRequirements.map((req, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs">
                    <div
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${
                        req.valid
                          ? "bg-[#3F7D5C22] text-[var(--color-success)]"
                          : "bg-[var(--color-border)] text-[var(--color-text-muted)]"
                      }`}
                    >
                      {req.valid ? "✓" : "•"}
                    </div>
                    <span
                      className={
                        req.valid
                          ? "text-[var(--color-success)] font-medium"
                          : "text-[var(--color-text-secondary)]"
                      }
                    >
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Terms & Privacy checkbox */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                id="terms"
                type="checkbox"
                required
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 rounded border-[var(--color-border)] text-[var(--color-primary-dark)] focus:ring-[var(--color-primary-dark)]"
              />
              <label htmlFor="terms" className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                I agree to the{" "}
                <span className="text-[var(--color-text-primary)] font-medium underline cursor-pointer">
                  Terms of Service
                </span>{" "}
                and{" "}
                <span className="text-[var(--color-text-primary)] font-medium underline cursor-pointer">
                  Privacy Policy
                </span>
                .
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || !isPasswordValid || !agreedToTerms}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-[var(--color-primary-dark)] text-white text-sm font-semibold hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            <div className="pt-4 border-t border-[var(--color-border)] text-center">
              <p className="text-xs text-[var(--color-text-secondary)]">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => handleModeSwitch("sign-in")}
                  className="font-semibold text-[var(--color-text-primary)] hover:underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          </form>
        )}

        {/* MODE 3: PASSWORD RESET */}
        {mode === "password-reset" && (
          <div>
            {!resetSent ? (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div>
                  <label
                    htmlFor="reset-email"
                    className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5"
                  >
                    Account Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="reset-email"
                      type="email"
                      required
                      disabled={isLoading}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full px-3.5 py-2.5 pl-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-dark)] focus:border-transparent transition-all disabled:opacity-60"
                    />
                    <Mail
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-2.5 px-4 rounded-lg bg-[var(--color-primary-dark)] text-white text-sm font-semibold hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-70 shadow-xs"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Sending reset link...</span>
                    </>
                  ) : (
                    <span>Send Reset Link</span>
                  )}
                </button>

                <div className="pt-4 border-t border-[var(--color-border)] text-center">
                  <button
                    type="button"
                    onClick={() => handleModeSwitch("sign-in")}
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center space-y-4 py-2 animate-in fade-in duration-200">
                <div className="w-12 h-12 rounded-full bg-[#3F7D5C14] text-[var(--color-success)] flex items-center justify-center mx-auto border border-[#3F7D5C33]">
                  <CheckCircle2 size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                    Check your inbox
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed max-w-xs mx-auto">
                    We sent password reset instructions to{" "}
                    <strong className="text-[var(--color-text-primary)]">{email}</strong>.
                  </p>
                </div>

                <div className="pt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleModeSwitch("sign-in")}
                    className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-primary-dark)] text-white text-sm font-semibold hover:bg-black transition-colors shadow-xs"
                  >
                    Return to Sign In
                  </button>
                  <button
                    type="button"
                    disabled={resendCooldown > 0}
                    onClick={handlePasswordReset}
                    className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-50 transition-colors py-1"
                  >
                    {resendCooldown > 0
                      ? `Resend email in ${resendCooldown}s`
                      : "Didn't receive the email? Click to resend"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE 4: EMAIL VERIFICATION */}
        {mode === "verification" && (
          <form onSubmit={handleVerificationSubmit} className="space-y-5 animate-in fade-in duration-200">
            <div className="text-center space-y-1">
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Enter the 6-digit confirmation code sent to{" "}
                <strong className="text-[var(--color-text-primary)]">{email}</strong>.
              </p>
            </div>

            {/* 6-digit PIN Input */}
            <div className="flex items-center justify-between gap-2">
              {verificationCode.map((digit, idx) => (
                <input
                  key={idx}
                  id={`code-input-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(idx, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(idx, e)}
                  disabled={isLoading}
                  className="w-11 h-12 sm:w-12 sm:h-14 text-center font-mono text-lg font-bold rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-dark)] focus:border-transparent transition-all disabled:opacity-60"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isLoading || verificationCode.some((c) => !c)}
              className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-primary-dark)] text-white text-sm font-semibold hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verifying code...</span>
                </>
              ) : (
                <span>Confirm & Enter Workspace</span>
              )}
            </button>

            <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => handleModeSwitch("sign-in")}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                Change email
              </button>
              <button
                type="button"
                disabled={resendCooldown > 0}
                onClick={handleResendVerification}
                className="font-medium text-[var(--color-text-primary)] hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Security Reassurance Footer per Spec Section 12 & 18 */}
      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)]">
        <ShieldCheck size={14} className="text-[var(--color-success)]" />
        <span>Enterprise-grade 256-bit encryption for all legal data</span>
      </div>
    </div>
  );
};
