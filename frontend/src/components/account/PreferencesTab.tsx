"use client";

import React, { useState } from "react";
import {
  Sliders,
  Bell,
  Scale,
  Download,
  Key,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Sparkles,
  Layers,
} from "lucide-react";

export const PreferencesTab: React.FC = () => {
  const [sensitivity, setSensitivity] = useState<"conservative" | "balanced" | "commercial">("balanced");
  const [jurisdiction, setJurisdiction] = useState("Delaware / US Commercial");
  const [riskThreshold, setRiskThreshold] = useState<"critical" | "high" | "all">("high");

  // Notifications
  const [emailDigest, setEmailDigest] = useState(true);
  const [criticalAlerts, setCriticalAlerts] = useState(true);
  const [exportAlerts, setExportAlerts] = useState(false);

  // Display & Export
  const [displayDensity, setDisplayDensity] = useState<"editorial" | "compact">("editorial");
  const [defaultExportFormat, setDefaultExportFormat] = useState<"pdf" | "docx" | "md" | "json">("pdf");
  const [includeCitations, setIncludeCitations] = useState(true);

  // API Key state
  const [apiKey, setApiKey] = useState("p7_live_8f7b2c9a1e4d6a8b9c0d2e4f6a8b0c2d");
  const [copiedKey, setCopiedKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRegenerateKey = () => {
    const randomHex = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
    const newKey = `p7_live_${randomHex}`;
    setApiKey(newKey);
    setSaveSuccess("Generated new enterprise API key.");
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  const handleSaveAll = () => {
    setSaveSuccess("Preferences successfully saved.");
    setTimeout(() => setSaveSuccess(null), 3000);
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

      {/* 1. AI ANALYSIS TUNING & JURISDICTION */}
      <div className="bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="border-b border-[var(--color-border)] pb-4">
          <h2 className="text-base sm:text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Sliders size={16} />
            <span>AI Risk Model & Diligence Tuning</span>
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            Configure how aggressively Protocol-7 flags ambiguities, liabilities, and statutory conflicts.
          </p>
        </div>

        {/* Sensitivity Option Cards */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-[var(--color-text-primary)]">
            Analysis Sensitivity Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => setSensitivity("conservative")}
              className={`p-4 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                sensitivity === "conservative"
                  ? "bg-[var(--color-surface-elevated)] border-[var(--color-primary-dark)] ring-1 ring-[var(--color-primary-dark)] shadow-xs"
                  : "bg-[var(--color-surface-secondary)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--color-text-primary)]">
                  Conservative
                </span>
                {sensitivity === "conservative" && (
                  <CheckCircle2 size={14} className="text-[var(--color-primary-dark)]" />
                )}
              </div>
              <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                Flags all potential ambiguities, strict unamortized capex recapture, and minor statutory misalignments.
              </p>
            </div>

            <div
              onClick={() => setSensitivity("balanced")}
              className={`p-4 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                sensitivity === "balanced"
                  ? "bg-[var(--color-surface-elevated)] border-[var(--color-primary-dark)] ring-1 ring-[var(--color-primary-dark)] shadow-xs"
                  : "bg-[var(--color-surface-secondary)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--color-text-primary)]">
                  Balanced (Standard)
                </span>
                {sensitivity === "balanced" && (
                  <CheckCircle2 size={14} className="text-[var(--color-primary-dark)]" />
                )}
              </div>
              <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                Standard corporate diligence. Focuses on material financial exposure and enforceable counter-proposals.
              </p>
            </div>

            <div
              onClick={() => setSensitivity("commercial")}
              className={`p-4 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                sensitivity === "commercial"
                  ? "bg-[var(--color-surface-elevated)] border-[var(--color-primary-dark)] ring-1 ring-[var(--color-primary-dark)] shadow-xs"
                  : "bg-[var(--color-surface-secondary)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--color-text-primary)]">
                  Commercial Closing
                </span>
                {sensitivity === "commercial" && (
                  <CheckCircle2 size={14} className="text-[var(--color-primary-dark)]" />
                )}
              </div>
              <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                Optimized for deal speed. Highlights only critical show-stopper indemnification and uncapped liabilities.
              </p>
            </div>
          </div>
        </div>

        {/* Default Jurisdiction & Alert Threshold */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">
              Default Statutory Jurisdiction
            </label>
            <select
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-dark)] cursor-pointer"
            >
              <option value="Delaware / US Commercial">Delaware / US Commercial Code</option>
              <option value="California, United States">California (Cal. Civ. Code & CCPA)</option>
              <option value="New York, United States">New York Commercial Division</option>
              <option value="United Kingdom / English Law">United Kingdom / English Law</option>
              <option value="European Union (GDPR / Civil Law)">European Union (GDPR / Civil Law)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">
              Alert Trigger Threshold
            </label>
            <select
              value={riskThreshold}
              onChange={(e) => setRiskThreshold(e.target.value as "critical" | "high" | "all")}
              className="w-full px-3.5 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-dark)] cursor-pointer"
            >
              <option value="critical">Critical Severity Only (Score 80+)</option>
              <option value="high">High & Critical Severity (Score 50+)</option>
              <option value="all">All Findings (Including Moderate & Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. NOTIFICATIONS & WORKSPACE ALERTS */}
      <div className="bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-2xl p-6 sm:p-8 shadow-2xs space-y-5">
        <div className="border-b border-[var(--color-border)] pb-4">
          <h2 className="text-base sm:text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Bell size={16} />
            <span>Notifications & Intelligence Delivery</span>
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            Control when and how you receive risk alerts and redline export notices.
          </p>
        </div>

        <div className="space-y-3">
          <div className="p-4 bg-[var(--color-surface-secondary)] rounded-xl border border-[var(--color-border)] flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-[var(--color-text-primary)] block">
                Daily Contract Intelligence Digest
              </span>
              <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                Morning summary of newly analyzed agreements and pending counter-proposals.
              </p>
            </div>
            <input
              type="checkbox"
              checked={emailDigest}
              onChange={(e) => setEmailDigest(e.target.checked)}
              className="rounded border-[var(--color-border)] text-[var(--color-primary-dark)] focus:ring-[var(--color-primary-dark)] cursor-pointer"
            />
          </div>

          <div className="p-4 bg-[var(--color-surface-secondary)] rounded-xl border border-[var(--color-border)] flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-[var(--color-text-primary)] block">
                Real-Time Critical Risk Alerts
              </span>
              <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                Immediate email notifications when a contract upload contains critical statutory violations.
              </p>
            </div>
            <input
              type="checkbox"
              checked={criticalAlerts}
              onChange={(e) => setCriticalAlerts(e.target.checked)}
              className="rounded border-[var(--color-border)] text-[var(--color-primary-dark)] focus:ring-[var(--color-primary-dark)] cursor-pointer"
            />
          </div>

          <div className="p-4 bg-[var(--color-surface-secondary)] rounded-xl border border-[var(--color-border)] flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-[var(--color-text-primary)] block">
                Export Package Readiness
              </span>
              <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                Notify when asynchronous audit export packages and redlines finish compiling.
              </p>
            </div>
            <input
              type="checkbox"
              checked={exportAlerts}
              onChange={(e) => setExportAlerts(e.target.checked)}
              className="rounded border-[var(--color-border)] text-[var(--color-primary-dark)] focus:ring-[var(--color-primary-dark)] cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 3. EXPORT DEFAULTS & DEVELOPER API KEY */}
      <div className="bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="border-b border-[var(--color-border)] pb-4">
          <h2 className="text-base sm:text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Download size={16} />
            <span>Export & API Integrations</span>
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            Configure default export package deliverables and enterprise API keys.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">
              Default Export Package Format
            </label>
            <select
              value={defaultExportFormat}
              onChange={(e) => setDefaultExportFormat(e.target.value as "pdf" | "docx" | "md" | "json")}
              className="w-full px-3.5 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-dark)] cursor-pointer"
            >
              <option value="pdf">Complete PDF Audit Package (With Executive Counsel Memo)</option>
              <option value="docx">Microsoft Word Redline (.docx with Track Changes)</option>
              <option value="md">Markdown Redline & Counter-Clause Summary</option>
              <option value="json">Structured JSON (API Data Export)</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-[var(--color-surface-secondary)] rounded-xl border border-[var(--color-border)]">
            <div>
              <span className="text-xs font-bold text-[var(--color-text-primary)] block">
                Include Auditor Citations
              </span>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                Attach statutory references to counter-drafts.
              </p>
            </div>
            <input
              type="checkbox"
              checked={includeCitations}
              onChange={(e) => setIncludeCitations(e.target.checked)}
              className="rounded border-[var(--color-border)] text-[var(--color-primary-dark)] focus:ring-[var(--color-primary-dark)] cursor-pointer"
            />
          </div>
        </div>

        {/* API Key Box */}
        <div className="pt-2 space-y-2">
          <label className="block text-xs font-semibold text-[var(--color-text-primary)]">
            Enterprise REST API Secret Key
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 p-2.5 bg-[var(--color-surface-secondary)] rounded-lg border border-[var(--color-border)] font-mono text-xs text-[var(--color-text-primary)] select-all truncate">
              {apiKey}
            </div>

            <button
              type="button"
              onClick={handleCopyKey}
              className="px-3.5 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-primary)] hover:bg-[var(--color-surface-secondary)] text-xs font-medium text-[var(--color-text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedKey ? <Check size={14} className="text-[var(--color-success)]" /> : <Copy size={14} />}
              <span>{copiedKey ? "Copied" : "Copy"}</span>
            </button>

            <button
              type="button"
              onClick={handleRegenerateKey}
              className="px-3.5 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-primary)] hover:bg-[var(--color-surface-secondary)] text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Generate fresh API key"
            >
              <RotateCw size={14} />
              <span>Roll Key</span>
            </button>
          </div>
        </div>

        {/* Save CTA */}
        <div className="flex justify-end pt-4 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-5 py-2 rounded-lg bg-[var(--color-primary-dark)] text-white text-xs font-semibold hover:bg-black/85 transition-colors shadow-xs cursor-pointer"
          >
            Save All Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
