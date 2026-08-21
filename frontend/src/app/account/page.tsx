"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileTab } from "@/components/account/ProfileTab";
import { PreferencesTab } from "@/components/account/PreferencesTab";
import { User, Settings, ShieldCheck } from "lucide-react";

export type AccountTab = "profile" | "preferences";

function AccountContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = (searchParams.get("tab") as AccountTab) || "profile";

  const [activeTab, setActiveTab] = useState<AccountTab>(tabParam);

  useEffect(() => {
    if (tabParam && (tabParam === "profile" || tabParam === "preferences")) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabSwitch = (tab: AccountTab) => {
    setActiveTab(tab);
    router.replace(`/account?tab=${tab}`);
  };

  return (
    <AppShell>
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Header */}
        <div className="border-b border-[var(--color-border)] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
              <ShieldCheck size={14} className="text-[var(--color-primary-dark)]" />
              <span>Workspace Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-primary)]">
              Account & Workspace Preferences
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1">
              Manage your legal counsel profile, credentials, intelligence tuning, and API keys.
            </p>
          </div>

          {/* Account Sub-Tabs */}
          <div className="flex items-center gap-1 bg-[var(--color-surface-secondary)] p-1 rounded-xl border border-[var(--color-border)] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleTabSwitch("profile")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "profile"
                  ? "bg-[var(--color-surface-primary)] text-[var(--color-text-primary)] shadow-xs"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <User size={14} />
              <span>Counsel Profile</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabSwitch("preferences")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "preferences"
                  ? "bg-[var(--color-surface-primary)] text-[var(--color-text-primary)] shadow-xs"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <Settings size={14} />
              <span>AI Preferences</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "profile" ? <ProfileTab /> : <PreferencesTab />}
        </div>
      </div>
    </AppShell>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-[var(--color-text-muted)]">Loading Account Settings...</div>}>
      <AccountContent />
    </Suspense>
  );
}
