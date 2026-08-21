"use client";

import React, { useState } from "react";
import {
  User,
  Mail,
  Building,
  Briefcase,
  Globe,
  Lock,
  ShieldCheck,
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Key,
} from "lucide-react";

export const ProfileTab: React.FC = () => {
  const [fullName, setFullName] = useState("Sarah Jenkins");
  const [email, setEmail] = useState("s.jenkins@veritas-enterprises.com");
  const [jobTitle, setJobTitle] = useState("Senior Legal Counsel");
  const [organization, setOrganization] = useState("Veritas Enterprises Corp.");
  const [department, setDepartment] = useState("Corporate Legal & Compliance");
  const [timezone, setTimezone] = useState("America/Los_Angeles");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  // Status feedback
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess("Profile details updated successfully.");
      setTimeout(() => setSaveSuccess(null), 4000);
    }, 800);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setSaveError("Please enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setSaveError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSaveError("New passwords do not match.");
      return;
    }

    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    setTimeout(() => {
      setIsSaving(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSaveSuccess("Password successfully updated.");
      setTimeout(() => setSaveSuccess(null), 4000);
    }, 1000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-[#3F7D5C14] border border-[#3F7D5C40] flex items-center gap-2.5 text-xs text-[var(--color-success)] font-medium">
          <CheckCircle2 size={16} />
          <span>{saveSuccess}</span>
        </div>
      )}
      {saveError && (
        <div className="p-4 rounded-xl bg-[#C7333314] border border-[#C7333340] flex items-center gap-2.5 text-xs text-[#C73333] font-medium">
          <AlertCircle size={16} />
          <span>{saveError}</span>
        </div>
      )}

      {/* 1. PERSONAL & PROFESSIONAL DETAILS */}
      <div className="bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="border-b border-[var(--color-border)] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--color-text-primary)]">
              Personal & Professional Profile
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Manage your legal counsel profile and organization affiliation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--color-primary-dark)] text-white font-bold text-base flex items-center justify-center shadow-xs">
              SJ
            </div>
            <div>
              <span className="text-xs font-bold text-[var(--color-text-primary)] block">
                {fullName}
              </span>
              <span className="text-[11px] text-[var(--color-text-muted)] font-mono">
                Enterprise Counsel License
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 pl-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-dark)]"
                  required
                />
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 pl-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-dark)]"
                  required
                />
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">
                Job Title / Role
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-3.5 py-2 pl-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-dark)]"
                />
                <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">
                Organization / Firm
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full px-3.5 py-2 pl-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-dark)]"
                />
                <Building size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-dark)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">
                Default Timezone
              </label>
              <div className="relative">
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3.5 py-2 pl-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-dark)] cursor-pointer"
                >
                  <option value="America/Los_Angeles">Pacific Time (US & Canada) UTC-08:00</option>
                  <option value="America/New_York">Eastern Time (US & Canada) UTC-05:00</option>
                  <option value="Europe/London">London (GMT / BST) UTC+00:00</option>
                  <option value="Asia/Tokyo">Tokyo (JST) UTC+09:00</option>
                </select>
                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-lg bg-[var(--color-primary-dark)] text-white text-xs font-semibold hover:bg-black/85 transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
              <span>Save Profile Changes</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. SECURITY & AUTHENTICATION SETTINGS */}
      <div className="bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="border-b border-[var(--color-border)] pb-4">
          <h2 className="text-base sm:text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Lock size={16} />
            <span>Security & Credentials</span>
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            Manage your password, two-factor authentication, and active workspace sessions.
          </p>
        </div>

        {/* 2FA Toggle */}
        <div className="p-4 bg-[var(--color-surface-secondary)] rounded-xl border border-[var(--color-border)] flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#3F7D5C14] text-[var(--color-success)] flex items-center justify-center shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <span className="text-xs font-bold text-[var(--color-text-primary)] block">
                Two-Factor Authentication (2FA)
              </span>
              <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                Mandatory for accessing enterprise legal vaults and counter-draft pipelines.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setTwoFactorEnabled(!twoFactorEnabled);
              setSaveSuccess(twoFactorEnabled ? "2FA disabled" : "2FA enabled with authenticator app");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              twoFactorEnabled
                ? "bg-[#3F7D5C] text-white border-[#3F7D5C]"
                : "bg-[var(--color-surface-primary)] text-[var(--color-text-secondary)] border-[var(--color-border)]"
            }`}
          >
            {twoFactorEnabled ? "Enabled" : "Disabled"}
          </button>
        </div>

        {/* Password Update Form */}
        <form onSubmit={handleUpdatePassword} className="space-y-4 pt-2">
          <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
            Change Master Password
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-dark)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-dark)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-dark)]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSaving || !currentPassword || !newPassword}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-primary)] hover:bg-[var(--color-surface-secondary)] text-xs font-medium text-[var(--color-text-primary)] transition-colors disabled:opacity-40 cursor-pointer"
            >
              Update Password
            </button>
          </div>
        </form>

        {/* Active Sessions */}
        <div className="pt-4 border-t border-[var(--color-border)] space-y-3">
          <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
            Active Workspace Sessions
          </h3>

          <div className="space-y-2.5">
            <div className="p-3 bg-[var(--color-surface-secondary)] rounded-xl border border-[var(--color-border)] flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <Laptop size={16} className="text-[var(--color-text-muted)]" />
                <div>
                  <span className="font-semibold text-[var(--color-text-primary)] block">
                    Chrome on macOS (San Francisco, US)
                  </span>
                  <span className="text-[11px] text-[var(--color-success)] font-medium">
                    Current active session · IP: 198.51.100.24
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-mono text-[var(--color-text-muted)]">Active now</span>
            </div>

            <div className="p-3 bg-[var(--color-surface-secondary)] rounded-xl border border-[var(--color-border)] flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <Smartphone size={16} className="text-[var(--color-text-muted)]" />
                <div>
                  <span className="font-semibold text-[var(--color-text-primary)] block">
                    Protocol-7 Mobile on iOS (San Francisco, US)
                  </span>
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    Last active 3 hours ago
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSaveSuccess("Revoked remote mobile session.")}
                className="text-[11px] text-[#C73333] hover:underline cursor-pointer"
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
