"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { OverviewTab } from "@/components/workspace/OverviewTab";
import { DocumentTab } from "@/components/workspace/DocumentTab";
import { ChangesTab } from "@/components/workspace/ChangesTab";
import { ComplianceTab } from "@/components/workspace/ComplianceTab";
import { RelationshipsTab } from "@/components/workspace/RelationshipsTab";
import { ExportModal } from "@/components/overlays/ExportModal";
import { mockWorkspaceDocument } from "@/data/mockWorkspace";
import { WorkspaceTab, DocumentDetail } from "@/types/workspace";
import { ClauseProvider } from "@/context/ClauseContext";

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const docIdParam = searchParams.get("docId") || "doc-001";
  const tabParam = (searchParams.get("tab") as WorkspaceTab) || "overview";
  const clauseParam = searchParams.get("clauseId") || undefined;

  const [activeDocument] = useState<DocumentDetail>(mockWorkspaceDocument);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(tabParam);
  const [targetClauseId, setTargetClauseId] = useState<string | undefined>(clauseParam);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Sync tab with URL search parameter
  useEffect(() => {
    if (tabParam && ["overview", "document", "changes", "compliance", "relationships"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    if (clauseParam) {
      setTargetClauseId(clauseParam);
    }
  }, [tabParam, clauseParam]);

  const handleTabChange = (newTab: WorkspaceTab, targetClause?: string) => {
    setActiveTab(newTab);
    if (targetClause) {
      setTargetClauseId(targetClause);
    }
    const params = new URLSearchParams();
    params.set("docId", docIdParam);
    params.set("tab", newTab);
    if (targetClause) {
      params.set("clauseId", targetClause);
    }
    router.replace(`/workspace?${params.toString()}`);
  };

  return (
    <AppShell
      activeDocName={activeDocument.name}
      activeDocStatus="Analysis Active"
    >
      <div className="flex flex-col min-h-full">
        {/* Workspace Sticky Header & Horizontal Tabs */}
        <WorkspaceHeader
          document={activeDocument}
          activeTab={activeTab}
          onTabChange={(tab) => handleTabChange(tab)}
          onExportClick={() => setIsExportOpen(true)}
        />

        {/* Tab Content Canvas (1400px Max Width Grid) */}
        <div className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === "overview" && (
            <OverviewTab
              document={activeDocument}
              onNavigateTab={(tab, clauseId) => handleTabChange(tab, clauseId)}
            />
          )}

          {activeTab === "document" && (
            <DocumentTab
              document={activeDocument}
              initialClauseId={targetClauseId}
            />
          )}

          {activeTab === "changes" && (
            <ChangesTab
              document={activeDocument}
              onNavigateTab={(tab, clauseId) => handleTabChange(tab, clauseId)}
            />
          )}

          {activeTab === "compliance" && (
            <ComplianceTab
              document={activeDocument}
              onNavigateTab={(tab, clauseId) => handleTabChange(tab, clauseId)}
            />
          )}

          {activeTab === "relationships" && (
            <RelationshipsTab
              document={activeDocument}
              onNavigateTab={(tab, clauseId) => handleTabChange(tab, clauseId)}
            />
          )}
        </div>

        {/* Export Modal Overlay */}
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          documentName={activeDocument.name}
        />
      </div>
    </AppShell>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-[var(--color-text-muted)]">
          Loading Document Workspace...
        </div>
      }
    >
      <ClauseProvider>
        <WorkspaceContent />
      </ClauseProvider>
    </Suspense>
  );
}
