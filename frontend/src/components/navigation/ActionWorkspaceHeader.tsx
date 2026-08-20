"use client";

import React, { useState } from "react";
import { useClauseContext } from "../../context/ClauseContext";
import { Sliders, Scale, ChevronDown, ChevronUp, AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import { SeverityLevel } from "../../types/contract";

export const ActionWorkspaceHeader: React.FC = () => {
  const { activeClause, setActiveClause, clauses, activeTab, setActiveTab } = useClauseContext();
  const [isExcerptExpanded, setIsExcerptExpanded] = useState(false);

  const getSeverityBadge = (severity: SeverityLevel) => {
    switch (severity) {
      case "critical":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#C7333314] text-[#C73333] border border-[#C7333340]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C73333]"></span>
            Critical Risk
          </span>
        );
      case "high":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#D65A3A14] text-[#D65A3A] border border-[#D65A3A40]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D65A3A]"></span>
            High Risk
          </span>
        );
      case "moderate":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#C68A2B14] text-[#C68A2B] border border-[#C68A2B40]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C68A2B]"></span>
            Moderate Risk
          </span>
        );
      case "low":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#4B8F6814] text-[#4B8F68] border border-[#4B8F6840]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4B8F68]"></span>
            Low Risk
          </span>
        );
    }
  };

  return (
    <div className="bg-[var(--color-surface-primary)] border-b border-[var(--color-border)] sticky top-0 z-20">
      {/* Header Top: Active Clause Context + Tab Bar */}
      <div className="px-4 sm:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Clause Context */}
        {activeClause ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsExcerptExpanded(!isExcerptExpanded)}
                className="group flex items-center gap-1.5 text-sm sm:text-base font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-primary-dark)] text-left"
                aria-expanded={isExcerptExpanded}
              >
                <span>{activeClause.section} — {activeClause.title}</span>
                {isExcerptExpanded ? (
                  <ChevronUp size={16} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]" />
                ) : (
                  <ChevronDown size={16} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]" />
                )}
              </button>
              {getSeverityBadge(activeClause.severity)}
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] line-clamp-1 max-w-xl">
              {activeClause.summary}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <AlertCircle size={16} className="text-[var(--color-warning)]" />
            <span className="font-medium">No clause pre-selected. Choose a finding below to begin action workspace.</span>
          </div>
        )}

        {/* Right: Action Tab Bar */}
        <div className="flex items-center gap-1 bg-[var(--color-surface-secondary)] p-1 rounded-lg border border-[var(--color-border)] self-start md:self-auto">
          <button
            onClick={() => setActiveTab("simulate")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
              activeTab === "simulate"
                ? "bg-[var(--color-surface-primary)] text-[var(--color-text-primary)] shadow-xs font-semibold"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
            role="tab"
            aria-selected={activeTab === "simulate"}
          >
            <Sliders size={15} />
            <span>Simulate</span>
          </button>
          <button
            onClick={() => setActiveTab("negotiate")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
              activeTab === "negotiate"
                ? "bg-[var(--color-surface-primary)] text-[var(--color-text-primary)] shadow-xs font-semibold"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
            role="tab"
            aria-selected={activeTab === "negotiate"}
          >
            <Scale size={15} />
            <span>Negotiate</span>
          </button>
        </div>
      </div>

      {/* Inline Scoped Document Viewer Excerpt */}
      {activeClause && isExcerptExpanded && (
        <div className="px-4 sm:px-8 py-3 bg-[var(--color-surface-secondary)] border-t border-[var(--color-border)] animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase flex items-center gap-1.5">
              <FileText size={12} />
              Original Contract Excerpt ({activeClause.section})
            </span>
            <button
              onClick={() => setIsExcerptExpanded(false)}
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              Collapse
            </button>
          </div>
          <div className="p-3 bg-[var(--color-surface-primary)] rounded border border-[var(--color-border)] font-mono text-xs text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
            {activeClause.originalText}
          </div>
        </div>
      )}

      {/* Quick Select Clause Dropdown / Selector Bar when active */}
      <div className="px-4 sm:px-8 py-2 bg-[var(--color-bg)] border-t border-[var(--color-border)] flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-[var(--color-text-muted)] font-medium shrink-0">Switch Finding:</span>
        <div className="flex items-center gap-2">
          {clauses.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveClause(c)}
              className={`px-2.5 py-1 rounded border transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeClause?.id === c.id
                  ? "bg-[var(--color-surface-primary)] border-[var(--color-border-strong)] text-[var(--color-text-primary)] font-semibold shadow-2xs"
                  : "bg-[var(--color-surface-primary)]/70 border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-primary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <span>{c.section}: {c.title.split(" ")[0]}</span>
              {activeClause?.id === c.id && <CheckCircle2 size={12} className="text-[var(--color-success)]" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};