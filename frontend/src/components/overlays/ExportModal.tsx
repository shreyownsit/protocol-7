"use client";

import React, { useState } from "react";
import { useOptionalClauseContext } from "../../context/ClauseContext";
import { X, Copy, Download, Check, FileText } from "lucide-react";

interface ExportModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  documentName?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  documentName: propDocName,
}) => {
  const context = useOptionalClauseContext();
  const isExportOpen = propIsOpen !== undefined ? propIsOpen : context?.isExportOpen;
  const setIsExportOpen = (open: boolean) => {
    if (propOnClose && !open) propOnClose();
    if (context?.setIsExportOpen) context.setIsExportOpen(open);
  };
  const activeClause = context?.activeClause;
  const userEditedClause = context?.userEditedClause;
  const simulationResult = context?.simulationResult;

  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<"clause-only" | "full-brief">("full-brief");

  if (!isExportOpen) return null;

  const finalClauseText = userEditedClause || activeClause?.finalCounterClause || "Section 8.2 & 5.4 Counter-Draft Package";

  const exportContent =
    format === "clause-only"
      ? finalClauseText
      : activeClause
      ? `# LEXICLEAR NEGOTIATION COUNTER-PROPOSAL BRIEF
Document: ${propDocName || "Master Services Agreement (Cloud Services v3.2).pdf"}
Target: ${activeClause.section} — ${activeClause.title}
Risk Level: ${activeClause.severity.toUpperCase()}
Generated: ${new Date().toLocaleDateString()}

---

## 1. ORIGINAL CLAUSE EXCERPT
${activeClause.originalText}

## 2. RISK ANALYSIS (PROSECUTOR FINDINGS)
${activeClause.prosecutorFindings.map((f, i) => `${i + 1}. ${f.title}: ${f.description} [${f.citation}]`).join("\n")}

## 3. SIMULATION & EXPOSURE IMPACT
${simulationResult ? `- Current Baseline Exposure: $${simulationResult.baseline.toLocaleString()}\n- Target Counter-Proposal Exposure: $${simulationResult.bestCase.toLocaleString()}\n- Net Potential Savings: $${(simulationResult.baseline - simulationResult.bestCase).toLocaleString()}` : "Qualitative Clause — Zero quantitative exposure impact."}

## 4. PROPOSED REVISED COUNTER-CLAUSE
${finalClauseText}

## 5. AUDITOR ATTESTATION
Status: ${activeClause.auditorEvaluation.status.toUpperCase()} (${activeClause.auditorEvaluation.score}% Score)
Reasoning: ${activeClause.auditorEvaluation.reasoning}
`
      : `# LEXICLEAR COMPLETE CONTRACT AUDIT PACKAGE
Document: ${propDocName || "Master Services Agreement (Cloud Services v3.2).pdf"}
Audit Timestamp: ${new Date().toLocaleString()}
Statutory Jurisdiction: California / Delaware Standard

---

## 1. EXECUTIVE RISK SUMMARY
- Total Critical Findings: 2
- Total High Risk Findings: 1
- Deterministic Statutory Violations: 2 (Cal. Civ. Code § 1671, UCC § 2-302)
- Potential Uncapped Liability: $375,000
- Recommended Target Savings: $352,500

## 2. ACTIONABLE REDLINE CLAUSES
- Section 8.2: Early Termination Penalty Acceleration (Cap at 3 months recurring fees)
- Section 5.4: Late Payment 2.5% Compounding Interest (Reduce to Net 45, 1% simple interest)
- Section 11.1: Limitation of Liability Asymmetry (Mutual 12-month trailing fee cap)
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(exportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([exportContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `LexiClear-${(propDocName || "Contract-Audit-Package").replace(/[^a-zA-Z0-9_-]/g, "_")}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border-strong)] shadow-lg rounded-xl max-w-2xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[var(--color-surface-primary)] border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[var(--color-primary-dark)]" />
            <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
              Export Negotiation Deliverable
            </h3>
          </div>
          <button
            onClick={() => setIsExportOpen(false)}
            className="p-1 rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Format Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">Export Scope:</span>
            <div className="flex items-center gap-1 bg-[var(--color-surface-secondary)] p-1 rounded-lg border border-[var(--color-border)]">
              <button
                onClick={() => setFormat("full-brief")}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                  format === "full-brief"
                    ? "bg-white text-[var(--color-text-primary)] shadow-2xs font-semibold"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                Comprehensive Brief (.md)
              </button>
              <button
                onClick={() => setFormat("clause-only")}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                  format === "clause-only"
                    ? "bg-white text-[var(--color-text-primary)] shadow-2xs font-semibold"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                Clause Text Only
              </button>
            </div>
          </div>

          {/* Preview Box */}
          <div className="p-4 bg-white border border-[var(--color-border)] rounded-lg font-mono text-xs text-[var(--color-text-primary)] leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap">
            {exportContent}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[var(--color-surface-primary)] border-t border-[var(--color-border)] flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-muted)]">
            Ready to attach to counterparty redline markup.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--color-border)] bg-white text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors"
            >
              {copied ? <Check size={14} className="text-[var(--color-success)]" /> : <Copy size={14} />}
              <span>{copied ? "Copied to Clipboard" : "Copy to Clipboard"}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--color-primary-dark)] text-white text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <Download size={14} />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};