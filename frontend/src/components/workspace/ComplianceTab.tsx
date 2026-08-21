"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DocumentDetail, ComplianceRuleEvaluation, WorkspaceTab } from "@/types/workspace";
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Sliders,
  Scale,
  ArrowRight,
  Filter,
  Check,
} from "lucide-react";

interface ComplianceTabProps {
  document: DocumentDetail;
  onNavigateTab: (tab: WorkspaceTab, clauseId?: string) => void;
}

export const ComplianceTab: React.FC<ComplianceTabProps> = ({
  document: docDetail,
  onNavigateTab,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const violations = docDetail.complianceRules.filter((r) => r.status === "violation");
  const warnings = docDetail.complianceRules.filter((r) => r.status === "warning");
  const passed = docDetail.complianceRules.filter((r) => r.status === "passed");

  const filteredRules = docDetail.complianceRules.filter((rule) => {
    if (filterStatus === "violations" && rule.status !== "violation") return false;
    if (filterStatus === "warnings" && rule.status !== "warning") return false;
    if (filterStatus === "passed" && rule.status !== "passed") return false;
    if (filterCategory !== "all" && rule.category !== filterCategory) return false;
    return true;
  });

  const categories = Array.from(new Set(docDetail.complianceRules.map((r) => r.category)));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. COMPLIANCE STATUS HEADER */}
      <div className="bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
              <Scale size={14} className="text-[var(--color-primary-dark)]" />
              <span>Deterministic Statutory Engine</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] mt-1">
              Jurisdiction: {docDetail.jurisdiction}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs text-[var(--color-text-muted)] block">Evaluated Rules</span>
              <span className="text-lg font-bold font-mono text-[var(--color-text-primary)]">
                {docDetail.rulesEvaluated} Checks
              </span>
            </div>
            <div className="h-8 w-px bg-[var(--color-border)]" />
            <div className="text-right">
              <span className="text-xs text-[var(--color-text-muted)] block">Statutory Status</span>
              <span className="text-lg font-bold font-mono text-[#C73333]">
                {violations.length} Violations
              </span>
            </div>
          </div>
        </div>

        {/* Deterministic Explanation Notice */}
        <div className="flex items-start gap-2.5 text-xs text-[var(--color-text-secondary)]">
          <div className="p-1 rounded bg-[var(--color-surface-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] shrink-0">
            <ShieldCheck size={14} />
          </div>
          <p className="leading-relaxed">
            <strong className="text-[var(--color-text-primary)] font-semibold">Rule-Based Statutory Verification: </strong>
            Evaluations on this screen are computed deterministically against codex statutes and judicial precedents (solid border/verified icon), independent of generative language model interpretations.
          </p>
        </div>
      </div>

      {/* 2. FILTER CONTROLS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[var(--color-text-muted)]">Status Filter:</span>
          <button
            type="button"
            onClick={() => setFilterStatus("all")}
            className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              filterStatus === "all"
                ? "bg-[var(--color-primary-dark)] text-white border-[var(--color-primary-dark)] font-semibold"
                : "border-[var(--color-border)] bg-[var(--color-surface-primary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
            }`}
          >
            All ({docDetail.complianceRules.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("violations")}
            className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              filterStatus === "violations"
                ? "bg-[#C73333] text-white border-[#C73333] font-semibold"
                : "border-[var(--color-border)] bg-[var(--color-surface-primary)] text-[#C73333] hover:bg-[#C7333314]"
            }`}
          >
            Violations ({violations.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("warnings")}
            className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              filterStatus === "warnings"
                ? "bg-[#C68A2B] text-white border-[#C68A2B] font-semibold"
                : "border-[var(--color-border)] bg-[var(--color-surface-primary)] text-[#C68A2B] hover:bg-[#C68A2B14]"
            }`}
          >
            Warnings ({warnings.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("passed")}
            className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              filterStatus === "passed"
                ? "bg-[var(--color-success)] text-white border-[var(--color-success)] font-semibold"
                : "border-[var(--color-border)] bg-[var(--color-surface-primary)] text-[var(--color-success)] hover:bg-[#3F7D5C14]"
            }`}
          >
            Passed ({passed.length})
          </button>
        </div>

        {/* Category Dropdown Filter */}
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-[var(--color-text-muted)]" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-primary)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-dark)] cursor-pointer"
          >
            <option value="all">All Legal Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. COMPLIANCE RULE EVALUATION CARDS */}
      <div className="space-y-4">
        {filteredRules.length === 0 ? (
          <div className="p-8 text-center bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text-muted)]">
            No compliance rules match the selected filter criteria.
          </div>
        ) : (
          filteredRules.map((rule) => {
            const isViolation = rule.status === "violation";
            const isWarning = rule.status === "warning";
            const isPassed = rule.status === "passed";

            return (
              <div
                key={rule.id}
                className={`bg-[var(--color-surface-primary)] border rounded-xl p-5 sm:p-6 shadow-2xs space-y-3.5 transition-all ${
                  isViolation
                    ? "border-[#C7333340] hover:border-[#C7333380]"
                    : isWarning
                    ? "border-[#C68A2B40] hover:border-[#C68A2B80]"
                    : "border-[var(--color-border)]"
                }`}
              >
                {/* Header Row: Severity Badge + Verified Icon + Citation */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)]/60 pb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Status Pill */}
                    {isViolation && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-[#C7333314] text-[#C73333] border border-[#C7333340]">
                        <AlertTriangle size={12} />
                        Statutory Violation
                      </span>
                    )}
                    {isWarning && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-[#C68A2B14] text-[#C68A2B] border border-[#C68A2B40]">
                        Compliance Advisory
                      </span>
                    )}
                    {isPassed && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-[#3F7D5C14] text-[var(--color-success)] border border-[#3F7D5C40]">
                        <CheckCircle2 size={12} />
                        Statute Compliant
                      </span>
                    )}

                    {/* Deterministic Verified Marker */}
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                      aria-label="Deterministic rule evaluation"
                      title="Evaluated by statutory rule logic, not generative AI"
                    >
                      <ShieldCheck size={12} className="text-[var(--color-text-primary)]" />
                      <span>Deterministic Rule</span>
                    </span>

                    <span className="text-xs font-mono text-[var(--color-text-muted)]">
                      · {rule.category}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                    Target: {rule.clauseSection}
                  </span>
                </div>

                {/* Rule Title & Statutory Reference */}
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[var(--color-text-primary)]">
                    {rule.ruleName}
                  </h3>
                  <div className="font-mono text-xs text-[var(--color-information)] mt-1 font-semibold">
                    Citation: {rule.statutoryReference}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {rule.description}
                </p>

                {/* Evidence Quote Excerpt Block */}
                <div className="p-3.5 bg-[var(--color-surface-secondary)] rounded-lg border-l-3 border-[var(--color-border-strong)] font-mono text-xs text-[var(--color-text-primary)] leading-relaxed">
                  <span className="text-[10px] uppercase font-sans font-bold text-[var(--color-text-muted)] block mb-1">
                    Contract Evidence Excerpt ({rule.clauseSection}):
                  </span>
                  &ldquo;{rule.evidenceExcerpt}&rdquo;
                </div>

                {/* Action Links */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]/60 text-xs">
                  <button
                    type="button"
                    onClick={() => onNavigateTab("document", rule.clauseId)}
                    className="text-[var(--color-text-primary)] font-medium hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Inspect {rule.clauseSection} in Document Viewer</span>
                    <ArrowRight size={12} />
                  </button>

                  <Link
                    href={`/simulate-negotiate?docId=${encodeURIComponent(docDetail.id)}&clauseId=${encodeURIComponent(rule.clauseId)}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--color-primary-dark)] text-white font-medium hover:bg-black/85 transition-colors shadow-2xs"
                  >
                    <Sliders size={13} />
                    <span>Redline Remedy</span>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
