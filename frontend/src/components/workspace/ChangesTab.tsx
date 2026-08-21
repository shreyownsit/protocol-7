"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DocumentDetail, RedlineChange, WorkspaceTab } from "@/types/workspace";
import {
  GitCompare,
  Plus,
  Minus,
  Sliders,
  AlertTriangle,
  ArrowRight,
  Filter,
  CheckCircle2,
  FileText,
} from "lucide-react";

interface ChangesTabProps {
  document: DocumentDetail;
  onNavigateTab: (tab: WorkspaceTab, clauseId?: string) => void;
}

export const ChangesTab: React.FC<ChangesTabProps> = ({
  document: docDetail,
  onNavigateTab,
}) => {
  const [selectedChange, setSelectedChange] = useState<RedlineChange>(
    docDetail.redlineChanges[0]
  );
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [syncScroll, setSyncScroll] = useState<boolean>(true);

  const additions = docDetail.redlineChanges.filter((c) => c.type === "addition").length;
  const deletions = docDetail.redlineChanges.filter((c) => c.type === "deletion").length;
  const modifications = docDetail.redlineChanges.filter((c) => c.type === "modification").length;

  const filteredChanges = docDetail.redlineChanges.filter((c) => {
    if (filterSeverity === "all") return true;
    return c.severity === filterSeverity;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. CHANGE SUMMARY BAR */}
      <div className="bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <GitCompare size={18} className="text-[var(--color-primary-dark)]" />
            <span className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)]">
              Redline Audit: Original v1.0 ↔ Counterparty Revised v2.0
            </span>
          </div>

          {/* Counts with Non-Color Markers */}
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#3F7D5C14] text-[var(--color-success)] border border-[#3F7D5C40] font-semibold">
              <span>+</span>
              <span>{additions} Addition</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#C7333314] text-[#C73333] border border-[#C7333340] font-semibold">
              <span>−</span>
              <span>{deletions} Deletion</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#C68A2B14] text-[#C68A2B] border border-[#C68A2B40] font-semibold">
              <span>±</span>
              <span>{modifications} Modifications</span>
            </span>
          </div>
        </div>

        {/* Filters & Controls */}
        <div className="flex items-center gap-3 self-start md:self-auto text-xs">
          <label className="flex items-center gap-1.5 text-[var(--color-text-secondary)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={syncScroll}
              onChange={(e) => setSyncScroll(e.target.checked)}
              className="rounded border-[var(--color-border)] text-[var(--color-primary-dark)] focus:ring-[var(--color-primary-dark)]"
            />
            <span>Synchronized scroll</span>
          </label>

          <div className="flex items-center gap-1.5 bg-[var(--color-surface-primary)] p-1 rounded-lg border border-[var(--color-border)]">
            <Filter size={13} className="text-[var(--color-text-muted)] ml-1" />
            <button
              type="button"
              onClick={() => setFilterSeverity("all")}
              className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                filterSeverity === "all"
                  ? "bg-[var(--color-primary-dark)] text-white font-medium"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              All ({docDetail.redlineChanges.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterSeverity("critical")}
              className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                filterSeverity === "critical"
                  ? "bg-[#C73333] text-white font-medium"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              Critical Only
            </button>
          </div>
        </div>
      </div>

      {/* 2. TWO-COLUMN COMPARISON PANES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Prior Baseline Version (v1.0) */}
        <div className="bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-2xs flex flex-col">
          <div className="p-3.5 bg-[var(--color-surface-secondary)] border-b border-[var(--color-border)] flex items-center justify-between text-xs">
            <span className="font-bold text-[var(--color-text-primary)]">
              Prior Approved Draft (v1.0 Baseline)
            </span>
            <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
              Aug 10, 2026
            </span>
          </div>

          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[500px]">
            {filteredChanges.map((change) => {
              const isSelected = selectedChange.id === change.id;
              return (
                <div
                  key={change.id}
                  onClick={() => setSelectedChange(change)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[var(--color-surface-elevated)] border-[var(--color-primary-dark)] ring-1 ring-[var(--color-primary-dark)] shadow-xs"
                      : "bg-[var(--color-surface-primary)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-[var(--color-text-primary)] font-mono">
                      {change.sectionNumber} — {change.sectionTitle}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                      Line {change.lineNumber}
                    </span>
                  </div>

                  <div className="p-3 bg-[var(--color-surface-secondary)] rounded-lg font-serif text-xs text-[var(--color-text-primary)] leading-relaxed">
                    {change.oldText ? (
                      <span className={change.type === "deletion" ? "line-through text-[#C73333]" : ""}>
                        {change.oldText}
                      </span>
                    ) : (
                      <span className="text-[var(--color-text-muted)] italic font-sans text-[11px]">
                        [No prior text — newly introduced clause]
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Counterparty Revised Version (v2.0) */}
        <div className="bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-2xs flex flex-col">
          <div className="p-3.5 bg-[var(--color-surface-secondary)] border-b border-[var(--color-border)] flex items-center justify-between text-xs">
            <span className="font-bold text-[var(--color-text-primary)]">
              Counterparty Redline Draft (v2.0 Revised)
            </span>
            <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
              Aug 18, 2026 · Latest
            </span>
          </div>

          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[500px]">
            {filteredChanges.map((change) => {
              const isSelected = selectedChange.id === change.id;
              const isAddition = change.type === "addition";
              const isDeletion = change.type === "deletion";
              const isModification = change.type === "modification";

              return (
                <div
                  key={change.id}
                  onClick={() => setSelectedChange(change)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[var(--color-surface-elevated)] border-[var(--color-primary-dark)] ring-1 ring-[var(--color-primary-dark)] shadow-xs"
                      : "bg-[var(--color-surface-primary)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--color-text-primary)] font-mono">
                        {change.sectionNumber} — {change.sectionTitle}
                      </span>
                      {change.severity === "critical" && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#C7333314] text-[#C73333] border border-[#C7333340]">
                          Critical
                        </span>
                      )}
                      {change.severity === "high" && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#D65A3A14] text-[#D65A3A] border border-[#D65A3A40]">
                          High
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-mono font-bold">
                      {isAddition && <span className="text-[var(--color-success)]">+ Added</span>}
                      {isDeletion && <span className="text-[#C73333]">− Struck</span>}
                      {isModification && <span className="text-[#C68A2B]">± Modified</span>}
                    </span>
                  </div>

                  <div
                    className={`p-3 rounded-lg font-serif text-xs leading-relaxed border ${
                      isAddition
                        ? "bg-[#3F7D5C0D] border-[#3F7D5C33] text-[var(--color-text-primary)]"
                        : isDeletion
                        ? "bg-[#C733330D] border-[#C7333333] text-[#C73333] line-through"
                        : "bg-[#C68A2B0D] border-[#C68A2B33] text-[var(--color-text-primary)]"
                    }`}
                  >
                    {change.newText}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. DOCKED SELECTED CHANGE DETAIL PANEL */}
      {selectedChange && (
        <div className="bg-[var(--color-surface-elevated)] border-2 border-[var(--color-border-strong)] rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
            <div>
              <span className="text-[11px] font-bold tracking-wider text-[var(--color-text-muted)] uppercase">
                Selected Redline Modification
              </span>
              <h3 className="text-base font-bold text-[var(--color-text-primary)] mt-0.5">
                {selectedChange.sectionNumber} — {selectedChange.sectionTitle}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {selectedChange.severity === "critical" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-[#C7333314] text-[#C73333] border border-[#C7333340]">
                  <AlertTriangle size={13} />
                  Critical Severity Impact
                </span>
              )}
              {selectedChange.severity === "high" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-[#D65A3A14] text-[#D65A3A] border border-[#D65A3A40]">
                  <AlertTriangle size={13} />
                  High Severity Impact
                </span>
              )}
              {selectedChange.severity === "moderate" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-[#C68A2B14] text-[#C68A2B] border border-[#C68A2B40]">
                  Moderate Severity Impact
                </span>
              )}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
            <span className="font-semibold text-[var(--color-text-primary)]">Legal Impact Analysis: </span>
            {selectedChange.description}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigateTab("document", selectedChange.clauseId)}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-primary)] font-medium hover:underline cursor-pointer"
            >
              <FileText size={14} />
              <span>Inspect {selectedChange.sectionNumber} in Full Document Viewer →</span>
            </button>

            <Link
              href={`/simulate-negotiate?docId=${encodeURIComponent(docDetail.id)}&clauseId=${encodeURIComponent(selectedChange.clauseId)}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary-dark)] text-white text-xs font-semibold hover:bg-black/85 transition-colors shadow-xs"
            >
              <Sliders size={14} />
              <span>Draft Counter-Clause for {selectedChange.sectionNumber}</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
