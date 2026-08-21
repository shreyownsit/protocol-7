"use client";

import React, { useState } from "react";
import { useClauseContext } from "../../context/ClauseContext";
import {
  Search,
  FileCheck2,
  ShieldCheck,
  RotateCw,
  Edit3,
  Check,
  Download,
  CheckCircle,
  AlertTriangle,
  History,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Copy,
  FileText
} from "lucide-react";

export const NegotiateTab: React.FC = () => {
  const {
    activeClause,
    revealedStages,
    isGenerating,
    userEditedClause,
    setUserEditedClause,
    isEditingClause,
    setIsEditingClause,
    regeneratePipeline,
    setIsExportOpen,
  } = useClauseContext();

  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isOriginalClauseExpanded, setIsOriginalClauseExpanded] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  if (!activeClause) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <div className="p-8 bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-xl">
          <FileText size={32} className="mx-auto text-[var(--color-text-muted)] mb-3" />
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
            No Clause Selected
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Please choose a finding from the header selector to begin structured counter-drafting.
          </p>
        </div>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(userEditedClause || activeClause.finalCounterClause);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleAccept = () => {
    setIsAccepted(true);
    setTimeout(() => setIsAccepted(false), 3000);
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6 pb-24 animate-in fade-in duration-200">
      {/* 1. SELECTED CLAUSE (Scoped Document Viewer Excerpt) */}
      <div className="bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div
          onClick={() => setIsOriginalClauseExpanded(!isOriginalClauseExpanded)}
          className="p-4 bg-[var(--color-surface-secondary)] flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
              Selected Target Clause
            </span>
            <span className="text-xs font-semibold text-[var(--color-text-primary)]">
              {activeClause.section} — {activeClause.title}
            </span>
          </div>
          <button className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
            {isOriginalClauseExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span>{isOriginalClauseExpanded ? "Collapse" : "Expand"}</span>
          </button>
        </div>

        {isOriginalClauseExpanded && (
          <div className="p-4 font-mono text-xs text-[var(--color-text-primary)] leading-relaxed bg-[var(--color-surface-primary)] border-t border-[var(--color-border)]">
            {activeClause.originalText}
          </div>
        )}
      </div>

      {/* 2. ISSUE SUMMARY */}
      <div className="p-4 bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-xl flex items-start gap-3">
        <AlertTriangle size={18} className="text-[var(--color-high)] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
              Risk Diagnosis
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">· Category: {activeClause.category}</span>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {activeClause.summary}
          </p>
        </div>
      </div>

      {/* 3. PROCEDURAL SEQUENTIAL PIPELINE: PROSECUTOR -> DEFENSE -> AUDITOR */}
      <div className="space-y-4">
        {/* STAGE 1: PROSECUTOR */}
        {revealedStages.prosecutor && (
          <div className="bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-xl p-5 sm:p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                  <Search size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Prosecutor Analysis
                  </h4>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Identified Loopholes & Unenforceable Conditions
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono text-[var(--color-text-muted)] bg-[var(--color-surface-secondary)] px-2 py-0.5 rounded">
                Stage 1 of 3
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {activeClause.prosecutorFindings.map((finding) => (
                <div
                  key={finding.id}
                  className="ai-generated-box p-3.5 rounded-lg space-y-1.5 flex flex-col justify-between"
                >
                  <div>
                    <span className="text-xs font-semibold text-[var(--color-text-primary)] block">
                      {finding.title}
                    </span>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">
                      {finding.description}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)] pt-2 block border-t border-[var(--color-border)]/50">
                    Ref: {finding.citation}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STAGE 2: DEFENSE COUNSEL */}
        {revealedStages.defense && (
          <div className="bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-xl p-5 sm:p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                  <FileCheck2 size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Defense Counsel Redline Draft
                  </h4>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Proposed Commercial Replacement Language
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono text-[var(--color-text-muted)] bg-[var(--color-surface-secondary)] px-2 py-0.5 rounded">
                Stage 2 of 3
              </span>
            </div>

            <div className="ai-generated-panel p-4 rounded-r-lg border-y border-r border-[var(--color-border)]">
              <div className="flex items-center justify-between pb-2 text-xs text-[var(--color-text-muted)]">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={12} />
                  Generated Replacement Draft
                </span>
              </div>
              <div className="font-serif text-sm text-[var(--color-text-primary)] leading-relaxed bg-[var(--color-surface-primary)] p-3.5 rounded border border-[var(--color-border)]">
                {activeClause.defenseDraft}
              </div>
            </div>
          </div>
        )}

        {/* STAGE 3: AUDITOR */}
        {revealedStages.auditor && (
          <div className="bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-xl p-5 sm:p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                  <ShieldCheck size={16} className="text-[var(--color-success)]" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Auditor Validation
                  </h4>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Objective Risk & Enforceability Assessment
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-[#3F7D5C14] text-[var(--color-success)] border border-[#3F7D5C40]">
                  <CheckCircle size={13} />
                  <span>Validation Passed ({activeClause.auditorEvaluation.score}%)</span>
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {activeClause.auditorEvaluation.reasoning}
              </p>

              {activeClause.auditorEvaluation.recommendations && (
                <div className="pt-2">
                  <span className="text-xs font-semibold text-[var(--color-text-primary)] block mb-1.5">
                    Auditor Certified Safeguards Applied:
                  </span>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[var(--color-text-secondary)]">
                    {activeClause.auditorEvaluation.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 bg-[var(--color-surface-secondary)] p-2 rounded border border-[var(--color-border)]">
                        <Check size={14} className="text-[var(--color-success)] shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Revision Loop History Trigger */}
            {activeClause.revisionHistory.length > 0 && (
              <div className="pt-3 border-t border-[var(--color-border)]">
                <button
                  onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                  className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                >
                  <History size={13} />
                  <span>{isHistoryExpanded ? "Hide prior revision passes" : `View revision history (${activeClause.revisionHistory.length} prior pass)`}</span>
                </button>

                {isHistoryExpanded && (
                  <div className="mt-3 p-3 bg-[var(--color-surface-secondary)] rounded-lg space-y-2 text-xs border border-[var(--color-border)]">
                    {activeClause.revisionHistory.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="font-semibold text-[var(--color-text-primary)]">
                          {item.timestamp}
                        </div>
                        <p className="font-mono text-[11px] text-[var(--color-text-secondary)] bg-white p-2 rounded border border-[var(--color-border)]">
                          {item.defenseDraft}
                        </p>
                        <p className="text-[var(--color-warning)] text-[11px] font-medium">
                          {item.auditorFeedback}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. FINAL COUNTER-CLAUSE (Elevated Deliverable Panel) */}
      {revealedStages.final && (
        <div className="bg-[var(--color-surface-elevated)] border-2 border-[var(--color-border-strong)] shadow-sm rounded-xl p-5 sm:p-8 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)] pb-4">
            <div>
              <span className="text-[11px] font-bold tracking-wider text-[var(--color-success)] uppercase flex items-center gap-1.5">
                <ShieldCheck size={14} />
                Auditor-Validated Counter-Proposal
              </span>
              <h3 className="text-base sm:text-lg font-bold text-[var(--color-text-primary)] mt-0.5">
                Final Proposed Counter-Clause Language
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-white text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors"
              >
                {isCopied ? <Check size={13} className="text-[var(--color-success)]" /> : <Copy size={13} />}
                <span>{isCopied ? "Copied!" : "Copy Clause"}</span>
              </button>
            </div>
          </div>

          {/* Editable vs Display Clause Body */}
          {isEditingClause ? (
            <div className="space-y-3">
              <textarea
                value={userEditedClause}
                onChange={(e) => setUserEditedClause(e.target.value)}
                rows={6}
                className="w-full p-4 font-serif text-sm text-[var(--color-text-primary)] bg-white border-2 border-[var(--color-primary-dark)] rounded-lg focus:outline-none leading-relaxed"
                placeholder="Edit counter-clause wording..."
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setUserEditedClause(activeClause.finalCounterClause);
                    setIsEditingClause(false);
                  }}
                  className="px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setIsEditingClause(false)}
                  className="px-4 py-1.5 text-xs font-medium bg-[var(--color-primary-dark)] text-white rounded-md"
                >
                  Save Modifications
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-5 bg-white border border-[var(--color-border)] rounded-lg font-serif text-sm sm:text-base text-[var(--color-text-primary)] leading-relaxed shadow-2xs whitespace-pre-wrap">
              {userEditedClause || activeClause.finalCounterClause}
            </div>
          )}

          {/* Action Row Inside Final Card */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditingClause(!isEditingClause)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--color-border)] bg-white text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors"
              >
                <Edit3 size={14} />
                <span>{isEditingClause ? "View Mode" : "Edit Inline"}</span>
              </button>

              <button
                onClick={regeneratePipeline}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--color-border)] bg-white text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors disabled:opacity-50"
              >
                <RotateCw size={14} className={isGenerating ? "animate-spin" : ""} />
                <span>{isGenerating ? "Re-evaluating..." : "Regenerate Pipeline"}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExportOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--color-border)] bg-white text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors"
              >
                <Download size={14} />
                <span>Export Counter-Clause</span>
              </button>

              <button
                onClick={handleAccept}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[var(--color-primary-dark)] text-white text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs"
              >
                {isAccepted ? <CheckCircle size={14} /> : <Check size={14} />}
                <span>{isAccepted ? "Accepted Position!" : "Accept Position"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};