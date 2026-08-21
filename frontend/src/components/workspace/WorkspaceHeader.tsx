"use client";

import React from "react";
import Link from "next/link";
import { WorkspaceTab, DocumentDetail } from "@/types/workspace";
import {
  FileText,
  FileCheck,
  GitCompare,
  ShieldCheck,
  Network,
  Sliders,
  Download,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

interface WorkspaceHeaderProps {
  document: DocumentDetail;
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  onExportClick: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  document,
  activeTab,
  onTabChange,
  onExportClick,
}) => {
  const criticalCount = document.sections.filter((s) => s.riskLevel === "critical").length;
  const changesCount = document.redlineChanges.length;
  const violationsCount = document.complianceRules.filter((r) => r.status === "violation").length;

  const tabs: { id: WorkspaceTab; label: string; icon: React.ReactNode; badge?: number; badgeSeverity?: "critical" | "neutral" }[] = [
    { id: "overview", label: "Overview", icon: <FileText size={15} /> },
    { id: "document", label: "Document", icon: <FileCheck size={15} /> },
    {
      id: "changes",
      label: "Changes",
      icon: <GitCompare size={15} />,
      badge: changesCount > 0 ? changesCount : undefined,
      badgeSeverity: "neutral",
    },
    {
      id: "compliance",
      label: "Compliance",
      icon: <ShieldCheck size={15} />,
      badge: violationsCount > 0 ? violationsCount : undefined,
      badgeSeverity: violationsCount > 0 ? "critical" : "neutral",
    },
    { id: "relationships", label: "Relationships", icon: <Network size={15} /> },
  ];

  return (
    <div className="bg-[var(--color-surface-primary)] border-b border-[var(--color-border)] sticky top-0 z-20 shadow-2xs">
      {/* Top Bar: Title, Risk Pill, Quick Actions */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[var(--color-text-muted)] bg-[var(--color-surface-secondary)] px-2 py-0.5 rounded border border-[var(--color-border)]">
              {document.type}
            </span>
            <h1 className="text-base sm:text-lg font-bold text-[var(--color-text-primary)] truncate max-w-lg">
              {document.name}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {document.riskLevel === "critical" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C7333314] text-[#C73333] border border-[#C7333340]">
                <AlertTriangle size={12} />
                Critical Risk (Score: {document.riskScore})
              </span>
            )}
            {document.riskLevel === "high" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#D65A3A14] text-[#D65A3A] border border-[#D65A3A40]">
                <AlertTriangle size={12} />
                High Risk (Score: {document.riskScore})
              </span>
            )}
            {document.riskLevel === "moderate" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C68A2B14] text-[#C68A2B] border border-[#C68A2B40]">
                Moderate Risk (Score: {document.riskScore})
              </span>
            )}
            {document.riskLevel === "low" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#4B8F6814] text-[#4B8F68] border border-[#4B8F6840]">
                Low Risk (Score: {document.riskScore})
              </span>
            )}
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={onExportClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-primary)] hover:bg-[var(--color-surface-secondary)] text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            <Download size={14} />
            <span>Export Audit</span>
          </button>

          <Link
            href={`/simulate-negotiate?docId=${encodeURIComponent(document.id)}&docName=${encodeURIComponent(document.name)}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--color-primary-dark)] text-white text-xs font-semibold hover:bg-black/85 transition-colors shadow-xs"
          >
            <Sliders size={14} />
            <span>Simulate & Negotiate</span>
            <ChevronRight size={13} className="text-white/70" />
          </Link>
        </div>
      </div>

      {/* Horizontal Workspace Tab Bar */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-6 overflow-x-auto border-t border-[var(--color-border)]/60 scrollbar-none" role="tablist">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 py-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors relative cursor-pointer ${
                isActive
                  ? "border-[var(--color-primary-dark)] text-[var(--color-text-primary)] font-semibold"
                  : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <span className={isActive ? "text-[var(--color-primary-dark)]" : "text-[var(--color-text-muted)]"}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    tab.badgeSeverity === "critical"
                      ? "bg-[#C7333318] text-[#C73333] border border-[#C7333340]"
                      : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
