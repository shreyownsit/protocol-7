"use client";

import React from "react";
import Link from "next/link";
import { DocumentDetail, WorkspaceTab } from "@/types/workspace";
import {
  AlertTriangle,
  DollarSign,
  TrendingDown,
  ShieldAlert,
  FileCheck2,
  Sliders,
  ArrowRight,
  Sparkles,
  Building,
  Calendar,
  Scale,
  GitCompare,
  FileText,
  Network,
} from "lucide-react";

interface OverviewTabProps {
  document: DocumentDetail;
  onNavigateTab: (tab: WorkspaceTab, targetClauseId?: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  document,
  onNavigateTab,
}) => {
  const criticalFindings = document.sections.filter(
    (s) => s.riskLevel === "critical" || s.riskLevel === "high"
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. KEY METRIC STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Financial Exposure */}
        <div className="bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-[var(--color-text-muted)] text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">Uncapped Exposure</span>
            <div className="w-7 h-7 rounded-lg bg-[#C7333314] text-[#C73333] flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#C73333] font-mono">
            {document.financialExposure}
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Section 8.2 termination & Section 5.4 penalty model
          </p>
        </div>

        {/* Metric 2: Potential Target Savings */}
        <div className="bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-[var(--color-text-muted)] text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">Target Redline Cap</span>
            <div className="w-7 h-7 rounded-lg bg-[#3F7D5C14] text-[var(--color-success)] flex items-center justify-center">
              <TrendingDown size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[var(--color-success)] font-mono">
            {document.potentialSavings}
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Estimated reduction via counter-clause caps
          </p>
        </div>

        {/* Metric 3: Overall Risk Score */}
        <div className="bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-[var(--color-text-muted)] text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">Risk Index</span>
            <div className="w-7 h-7 rounded-lg bg-[#D65A3A14] text-[#D65A3A] flex items-center justify-center">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-primary)] font-mono">
              {document.riskScore}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">/ 100</span>
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-[#D65A3A14] text-[#D65A3A]">
              High Risk
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            {document.issueCount} total actionable clause findings
          </p>
        </div>

        {/* Metric 4: Statutory Compliance */}
        <div className="bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-[var(--color-text-muted)] text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">Statutory Rules</span>
            <div className="w-7 h-7 rounded-lg bg-[#C7333314] text-[#C73333] flex items-center justify-center">
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#C73333] font-mono">
            {document.violationsCount} Violations
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Across {document.rulesEvaluated} deterministic statute checks
          </p>
        </div>
      </div>

      {/* 2. EXECUTIVE SYNTHESIS PANEL (AI-Assisted Calm Design) */}
      <div className="ai-generated-panel p-6 sm:p-7 rounded-r-xl border-y border-r border-[var(--color-border)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
            <Sparkles size={14} className="text-[var(--color-primary-dark)]" />
            <span>AI Risk Synthesis & Executive Counsel</span>
          </div>
          <span className="text-[11px] text-[var(--color-text-muted)] font-mono">
            Analyzed via Neural Parser v1.4
          </span>
        </div>
        <p className="text-sm sm:text-base text-[var(--color-text-primary)] leading-relaxed font-sans">
          {document.executiveSummary}
        </p>
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <Link
            href={`/simulate-negotiate?docId=${encodeURIComponent(document.id)}&docName=${encodeURIComponent(document.name)}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary-dark)] text-white text-xs font-semibold hover:bg-black/85 transition-colors shadow-xs"
          >
            <Sliders size={14} />
            <span>Launch Negotiation Pipeline</span>
            <ArrowRight size={13} />
          </Link>
          <button
            type="button"
            onClick={() => onNavigateTab("compliance")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-primary)] hover:bg-[var(--color-surface-secondary)] text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            <ShieldAlert size={14} />
            <span>View 2 Statutory Violations</span>
          </button>
        </div>
      </div>

      {/* 3. MAIN TWO-COLUMN SPLIT: CRITICAL FINDINGS (65%) + METADATA & QUICK LINKS (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Top Actionable Findings */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                Priority Action Findings
              </h2>
              <span className="text-xs text-[var(--color-text-muted)] font-mono">
                ({criticalFindings.length} requiring immediate redline)
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("document")}
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>View all sections</span>
              <ArrowRight size={12} />
            </button>
          </div>

          <div className="space-y-3.5">
            {criticalFindings.map((finding) => (
              <div
                key={finding.id}
                className="bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-xl p-5 hover:border-[var(--color-border-strong)] transition-all shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold font-mono text-[var(--color-text-primary)] bg-[var(--color-surface-secondary)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                        {finding.number}
                      </span>
                      <h3 className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)]">
                        {finding.title}
                      </h3>
                      {finding.riskLevel === "critical" && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#C7333314] text-[#C73333] border border-[#C7333340]">
                          Critical
                        </span>
                      )}
                      {finding.riskLevel === "high" && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#D65A3A14] text-[#D65A3A] border border-[#D65A3A40]">
                          High
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1.5 leading-relaxed">
                      {finding.findingSummary}
                    </p>
                  </div>
                </div>

                {/* Quoted Excerpt Block */}
                <div className="p-3 bg-[var(--color-surface-secondary)] rounded-lg border-l-3 border-[var(--color-border-strong)] font-mono text-xs text-[var(--color-text-primary)] leading-relaxed line-clamp-2">
                  &ldquo;{finding.content.split("\n")[0]}&rdquo;
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[var(--color-text-muted)]">
                    Page {finding.pageNumber} · Category: <span className="capitalize">{finding.category.replace("_", " ")}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigateTab("document", finding.id)}
                      className="px-3 py-1.5 rounded-md border border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] font-medium transition-colors cursor-pointer"
                    >
                      Inspect Clause
                    </button>
                    <Link
                      href={`/simulate-negotiate?docId=${encodeURIComponent(document.id)}&clauseId=${encodeURIComponent(finding.id)}`}
                      className="px-3 py-1.5 rounded-md bg-[var(--color-primary-dark)] text-white font-medium hover:bg-black/85 transition-colors shadow-2xs"
                    >
                      Simulate & Redline
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Contract Metadata + Workspace Module Switchers */}
        <div className="lg:col-span-4 space-y-6">
          {/* Metadata Card */}
          <div className="bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-xl p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider border-b border-[var(--color-border)] pb-2.5">
              Contract Metadata
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[var(--color-text-muted)] block">Contracting Parties</span>
                <div className="font-semibold text-[var(--color-text-primary)] mt-0.5 flex items-center gap-1.5">
                  <Building size={13} className="text-[var(--color-text-muted)] shrink-0" />
                  <span>{document.parties.firstParty}</span>
                </div>
                <div className="font-semibold text-[var(--color-text-primary)] mt-0.5 ml-4 text-[11px] text-[var(--color-text-secondary)]">
                  ↔ {document.parties.secondParty}
                </div>
              </div>

              <div>
                <span className="text-[var(--color-text-muted)] block">Governing Law & Venue</span>
                <div className="font-medium text-[var(--color-text-primary)] mt-0.5 flex items-center gap-1.5">
                  <Scale size={13} className="text-[var(--color-text-muted)] shrink-0" />
                  <span>{document.governingLaw}</span>
                </div>
              </div>

              <div>
                <span className="text-[var(--color-text-muted)] block">Term Duration</span>
                <div className="font-medium text-[var(--color-text-primary)] mt-0.5 flex items-center gap-1.5">
                  <Calendar size={13} className="text-[var(--color-text-muted)] shrink-0" />
                  <span>{document.effectiveDate} — {document.expirationDate}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                <span>File Size: {document.fileSize}</span>
                <span>Uploaded: {document.uploadedDate}</span>
              </div>
            </div>
          </div>

          {/* Quick Workspace Deep Links */}
          <div className="bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-xl p-5 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
              Workspace Workflows
            </h3>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onNavigateTab("document")}
                className="w-full p-3 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] text-left flex items-center justify-between group transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <FileText size={16} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]" />
                  <div>
                    <span className="text-xs font-semibold text-[var(--color-text-primary)] block">
                      Document Viewer
                    </span>
                    <span className="text-[11px] text-[var(--color-text-secondary)]">
                      Annotated source text & audio reader
                    </span>
                  </div>
                </div>
                <ArrowRight size={14} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab("changes")}
                className="w-full p-3 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] text-left flex items-center justify-between group transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <GitCompare size={16} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]" />
                  <div>
                    <span className="text-xs font-semibold text-[var(--color-text-primary)] block">
                      Redline Changes (v1 vs v2)
                    </span>
                    <span className="text-[11px] text-[var(--color-text-secondary)]">
                      {document.redlineChanges.length} modifications tracked
                    </span>
                  </div>
                </div>
                <ArrowRight size={14} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab("compliance")}
                className="w-full p-3 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] text-left flex items-center justify-between group transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <FileCheck2 size={16} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]" />
                  <div>
                    <span className="text-xs font-semibold text-[var(--color-text-primary)] block">
                      Deterministic Compliance
                    </span>
                    <span className="text-[11px] text-[var(--color-text-secondary)]">
                      {document.rulesEvaluated} statutory evaluations
                    </span>
                  </div>
                </div>
                <ArrowRight size={14} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab("relationships")}
                className="w-full p-3 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] text-left flex items-center justify-between group transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Network size={16} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]" />
                  <div>
                    <span className="text-xs font-semibold text-[var(--color-text-primary)] block">
                      Clause Knowledge Graph
                    </span>
                    <span className="text-[11px] text-[var(--color-text-secondary)]">
                      Contradictions & dependencies
                    </span>
                  </div>
                </div>
                <ArrowRight size={14} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
