"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { DocumentDetail, DocumentSection } from "@/types/workspace";
import {
  ZoomIn,
  ZoomOut,
  Search,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  FileText,
  AlertTriangle,
  Sliders,
  ChevronRight,
  Sparkles,
  Info,
  X,
} from "lucide-react";

interface DocumentTabProps {
  document: DocumentDetail;
  initialClauseId?: string;
}

export const DocumentTab: React.FC<DocumentTabProps> = ({
  document: docDetail,
  initialClauseId,
}) => {
  const [selectedSection, setSelectedSection] = useState<DocumentSection>(() => {
    if (initialClauseId) {
      const match = docDetail.sections.find((s) => s.id === initialClauseId);
      if (match) return match;
    }
    return docDetail.sections[0];
  });

  const [fontSize, setFontSize] = useState<number>(16); // in px: 14, 16, 18, 20, 22
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioSectionIndex, setAudioSectionIndex] = useState(0);

  // Sync initialClauseId if changed from prop
  useEffect(() => {
    if (initialClauseId) {
      const match = docDetail.sections.find((s) => s.id === initialClauseId);
      if (match) {
        setSelectedSection(match);
      }
    }
  }, [initialClauseId, docDetail]);

  // Audio player simulation timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlayingAudio) {
      timer = setInterval(() => {
        setAudioSectionIndex((prev) => {
          const next = (prev + 1) % docDetail.sections.length;
          setSelectedSection(docDetail.sections[next]);
          return next;
        });
      }, 4500);
    }
    return () => clearInterval(timer);
  }, [isPlayingAudio, docDetail.sections]);

  // Unique pages
  const pages = useMemo(() => {
    const pageNums = Array.from(new Set(docDetail.sections.map((s) => s.pageNumber))).sort();
    return pageNums;
  }, [docDetail.sections]);

  // Filtered sections when searching
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return docDetail.sections;
    const q = searchQuery.toLowerCase();
    return docDetail.sections.filter(
      (s) =>
        s.number.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.content.toLowerCase().includes(q)
    );
  }, [docDetail.sections, searchQuery]);

  const handleZoom = (direction: "in" | "out" | "reset") => {
    if (direction === "in") setFontSize((prev) => Math.min(prev + 2, 22));
    else if (direction === "out") setFontSize((prev) => Math.max(prev - 2, 14));
    else setFontSize(16);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-210px)] min-h-[520px] bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-xs">
      {/* 1. DOCUMENT TOOLBAR */}
      <div className="h-12 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 flex items-center justify-between gap-3 text-xs shrink-0 select-none">
        {/* Left: Zoom Controls & Text Size */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleZoom("out")}
            disabled={fontSize <= 14}
            className="p-1.5 rounded-md hover:bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-40 cursor-pointer"
            title="Zoom Out (Smaller text)"
            aria-label="Zoom out"
          >
            <ZoomOut size={15} />
          </button>

          <span
            onClick={() => handleZoom("reset")}
            className="font-mono text-[11px] px-1.5 py-0.5 rounded hover:bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] cursor-pointer"
            title="Reset text size to default (16px)"
          >
            {Math.round((fontSize / 16) * 100)}%
          </span>

          <button
            type="button"
            onClick={() => handleZoom("in")}
            disabled={fontSize >= 22}
            className="p-1.5 rounded-md hover:bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-40 cursor-pointer"
            title="Zoom In (Larger text)"
            aria-label="Zoom in"
          >
            <ZoomIn size={15} />
          </button>
        </div>

        {/* Center: In-Document Search */}
        <div className="flex-1 max-w-sm relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search within contract text..."
            className="w-full pl-8 pr-7 py-1 text-xs rounded-md border border-[var(--color-border)] bg-[var(--color-surface-primary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-dark)]"
          />
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Right: Audio Narration & Focus Mode */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlayingAudio(!isPlayingAudio)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              isPlayingAudio
                ? "bg-[#3E6E8E1F] text-[var(--color-information)] border border-[#3E6E8E40]"
                : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
            title="Simulated plain-language audio breakdown"
          >
            {isPlayingAudio ? <VolumeX size={13} /> : <Volume2 size={13} />}
            <span className="hidden sm:inline">
              {isPlayingAudio ? "Stop Narration" : "Play Audio Breakdown"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsFocusMode(!isFocusMode)}
            className="p-1.5 rounded-md border border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
            title={isFocusMode ? "Exit Focus Mode" : "Focus Mode (Distraction-free reading)"}
            aria-label="Toggle focus mode"
          >
            {isFocusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Audio Status Banner if playing */}
      {isPlayingAudio && (
        <div className="bg-[#3E6E8E14] border-b border-[#3E6E8E33] px-4 py-2 text-xs flex items-center justify-between text-[var(--color-information)] animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--color-information)] animate-pulse" />
            <span className="font-semibold">
              Narrating: Section {selectedSection.number} — {selectedSection.title}
            </span>
          </div>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            Auto-advancing through key legal exposures
          </span>
        </div>
      )}

      {/* 2. MAIN 3-REGION CANVAS (Thumbnails Rail + Document Body + Context Panel) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Rail: Page Thumbnails (Hidden in focus mode) */}
        {!isFocusMode && (
          <aside className="w-28 sm:w-32 bg-[var(--color-surface-secondary)] border-r border-[var(--color-border)] p-3 overflow-y-auto hidden md:flex flex-col gap-3 shrink-0">
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
              Pages ({pages.length})
            </span>
            {pages.map((pgNum) => {
              const pageSections = docDetail.sections.filter((s) => s.pageNumber === pgNum);
              const hasCritical = pageSections.some((s) => s.riskLevel === "critical");
              const hasHigh = pageSections.some((s) => s.riskLevel === "high");
              const isCurrentPage = selectedSection.pageNumber === pgNum;

              return (
                <button
                  key={pgNum}
                  type="button"
                  onClick={() => {
                    const firstSec = pageSections[0];
                    if (firstSec) setSelectedSection(firstSec);
                  }}
                  className={`p-2 rounded-lg border text-left flex flex-col justify-between h-28 transition-all bg-[var(--color-surface-primary)] cursor-pointer ${
                    isCurrentPage
                      ? "border-[var(--color-primary-dark)] shadow-xs ring-1 ring-[var(--color-primary-dark)]"
                      : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] opacity-80 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-[var(--color-text-muted)]">
                    <span>Page {pgNum}</span>
                    {hasCritical && <span className="w-2 h-2 rounded-full bg-[#C73333]" title="Critical risk finding on page" />}
                    {!hasCritical && hasHigh && <span className="w-2 h-2 rounded-full bg-[#D65A3A]" title="High risk finding on page" />}
                  </div>
                  {/* Miniature skeleton lines */}
                  <div className="space-y-1 my-auto">
                    <div className="h-1 bg-[var(--color-border)] rounded w-full" />
                    <div className="h-1 bg-[var(--color-border)] rounded w-5/6" />
                    <div className="h-1 bg-[var(--color-border)] rounded w-4/6" />
                  </div>
                  <span className="text-[9px] text-[var(--color-text-muted)] truncate">
                    {pageSections.length} sections
                  </span>
                </button>
              );
            })}
          </aside>
        )}

        {/* Center: Document Reading Canvas */}
        <div className="flex-1 overflow-y-auto bg-[var(--color-surface-primary)] p-6 sm:p-10 lg:p-12">
          <div className="max-w-[780px] mx-auto space-y-8">
            {/* Header Document Cover Info */}
            <div className="pb-6 border-b border-[var(--color-border)] space-y-1">
              <span className="text-[11px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider">
                Full Extracted Contract Text · Delaware Standard
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--color-text-primary)]">
                {docDetail.name.replace(".pdf", "")}
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Effective: {docDetail.effectiveDate} · Term: {docDetail.expirationDate}
              </p>
            </div>

            {/* Render Sections */}
            {filteredSections.length === 0 ? (
              <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">
                No contract clauses matched &ldquo;{searchQuery}&rdquo;.
              </div>
            ) : (
              filteredSections.map((section) => {
                const isSelected = selectedSection.id === section.id;
                const isCritical = section.riskLevel === "critical";
                const isHigh = section.riskLevel === "high";

                return (
                  <div
                    key={section.id}
                    onClick={() => setSelectedSection(section)}
                    className={`relative p-5 rounded-xl border transition-all cursor-pointer group ${
                      isSelected
                        ? "bg-[var(--color-surface-elevated)] border-[var(--color-primary-dark)] shadow-sm ring-1 ring-[var(--color-primary-dark)]/20"
                        : "bg-[var(--color-surface-primary)] border-[var(--color-border)]/80 hover:border-[var(--color-border-strong)]"
                    }`}
                  >
                    {/* Left Severity Indicator Bar */}
                    {isCritical && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#C73333] rounded-l-xl" />
                    )}
                    {isHigh && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#D65A3A] rounded-l-xl" />
                    )}

                    {/* Section Header Row */}
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[var(--color-text-primary)] bg-[var(--color-surface-secondary)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                          Section {section.number}
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-[var(--color-text-primary)]">
                          {section.title}
                        </h3>
                      </div>

                      {/* Severity Pill */}
                      {section.riskLevel === "critical" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#C7333314] text-[#C73333] border border-[#C7333340] flex items-center gap-1">
                          <AlertTriangle size={11} />
                          Critical Risk
                        </span>
                      )}
                      {section.riskLevel === "high" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#D65A3A14] text-[#D65A3A] border border-[#D65A3A40] flex items-center gap-1">
                          <AlertTriangle size={11} />
                          High Risk
                        </span>
                      )}
                    </div>

                    {/* Section Body Text with user-adjusted font size */}
                    <div
                      style={{ fontSize: `${fontSize}px`, lineHeight: "1.6" }}
                      className="font-sans text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed"
                    >
                      {section.content}
                    </div>

                    {/* Page Marker */}
                    <div className="mt-3 pt-2 border-t border-[var(--color-border)]/50 flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
                      <span>Page {section.pageNumber}</span>
                      <span className="opacity-0 group-hover:opacity-100 text-[var(--color-primary-dark)] font-medium transition-opacity">
                        Click to inspect clause details →
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Rail: Clause Context Panel (Collapsible / Hidden in Focus Mode) */}
        {!isFocusMode && (
          <aside className="w-80 sm:w-96 bg-[var(--color-surface-secondary)] border-l border-[var(--color-border)] p-5 overflow-y-auto flex flex-col justify-between shrink-0 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <span className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} />
                  Selected Clause Inspector
                </span>
                <span className="text-xs font-mono text-[var(--color-text-muted)]">
                  Sec {selectedSection.number}
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-[var(--color-text-primary)]">
                  {selectedSection.title}
                </h4>
                <div className="flex items-center gap-2 mt-1.5">
                  {selectedSection.riskLevel === "critical" && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#C7333314] text-[#C73333] border border-[#C7333340]">
                      Critical Risk Finding
                    </span>
                  )}
                  {selectedSection.riskLevel === "high" && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#D65A3A14] text-[#D65A3A] border border-[#D65A3A40]">
                      High Risk Finding
                    </span>
                  )}
                  {!selectedSection.riskLevel && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[var(--color-surface-primary)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                      Standard Provision
                    </span>
                  )}
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Page {selectedSection.pageNumber}
                  </span>
                </div>
              </div>

              {/* Plain-Language Explanation */}
              <div className="ai-generated-panel p-4 rounded-r-xl border-y border-r border-[var(--color-border)] space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                  <Sparkles size={13} className="text-[var(--color-primary-dark)]" />
                  <span>Plain-Language Synthesis</span>
                </div>
                <p className="text-xs sm:text-sm text-[var(--color-text-primary)] leading-relaxed">
                  {selectedSection.plainLanguageExplanation ||
                    "This section defines procedural terms for service execution. No high-severity abnormalities detected."}
                </p>
              </div>

              {/* Finding Summary if any */}
              {selectedSection.findingSummary && (
                <div className="p-3.5 bg-[var(--color-surface-primary)] rounded-xl border border-[var(--color-border)] space-y-1.5">
                  <span className="text-xs font-bold text-[#C73333] flex items-center gap-1.5">
                    <AlertTriangle size={13} />
                    Risk Diagnosis
                  </span>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    {selectedSection.findingSummary}
                  </p>
                </div>
              )}
            </div>

            {/* Action Footer in Inspector */}
            <div className="pt-4 border-t border-[var(--color-border)] space-y-2">
              <Link
                href={`/simulate-negotiate?docId=${encodeURIComponent(docDetail.id)}&clauseId=${encodeURIComponent(selectedSection.id)}`}
                className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-primary-dark)] text-white text-xs font-semibold hover:bg-black/85 transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <Sliders size={14} />
                <span>Simulate & Negotiate this Clause</span>
                <ChevronRight size={13} />
              </Link>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
