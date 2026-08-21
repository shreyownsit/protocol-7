"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PrimaryWorkspaceHeader } from "@/components/home/PrimaryWorkspaceHeader";
import { FeaturedDocumentCard } from "@/components/home/FeaturedDocumentCard";
import { RecentDocumentsRow } from "@/components/home/RecentDocumentsRow";
import { DocumentLibraryGrid } from "@/components/home/DocumentLibraryGrid";
import { EmptyStateZeroDocs } from "@/components/home/EmptyStateZeroDocs";
import { mockDocuments as initialMockDocuments } from "@/data/mockDocuments";
import { DocumentItem, DocumentFilterState, DocumentType } from "@/types/document";

export default function HomePage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentItem[]>(initialMockDocuments);
  const [activeDocument, setActiveDocument] = useState<DocumentItem | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const [filterState, setFilterState] = useState<DocumentFilterState>({
    searchQuery: "",
    riskLevels: [],
    complianceStatuses: [],
    documentTypes: [],
    sortBy: "recent",
    viewMode: "grid",
  });

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Available unique document types for chips
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    documents.forEach((d) => types.add(d.type));
    return Array.from(types);
  }, [documents]);

  // Featured document (highest priority or marked isFeatured)
  const featuredDocument = useMemo(() => {
    return documents.find((d) => d.isFeatured) || documents[0];
  }, [documents]);

  // Recent documents (up to 4, excluding the single featured document from duplicates if desired, or all recent)
  const recentDocuments = useMemo(() => {
    return documents.slice(0, 4);
  }, [documents]);

  // Filtered & Sorted document library
  const filteredDocuments = useMemo(() => {
    return documents
      .filter((doc) => {
        // Search query match (name, type, tags, excerpt)
        if (filterState.searchQuery.trim()) {
          const query = filterState.searchQuery.toLowerCase();
          const matchName = doc.name.toLowerCase().includes(query);
          const matchType = doc.type.toLowerCase().includes(query);
          const matchTags = doc.tags?.some((t) => t.toLowerCase().includes(query));
          const matchExcerpt = doc.topFindingExcerpt?.toLowerCase().includes(query);
          if (!matchName && !matchType && !matchTags && !matchExcerpt) {
            return false;
          }
        }

        // Risk levels filter (OR within group, AND across groups)
        if (filterState.riskLevels.length > 0) {
          if (!filterState.riskLevels.includes(doc.riskLevel)) {
            return false;
          }
        }

        // Compliance status filter
        if (filterState.complianceStatuses.length > 0) {
          if (!filterState.complianceStatuses.includes(doc.complianceStatus)) {
            return false;
          }
        }

        // Document type filter
        if (filterState.documentTypes.length > 0) {
          if (!filterState.documentTypes.includes(doc.type)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        switch (filterState.sortBy) {
          case "highest-risk":
            return (b.riskScore || 0) - (a.riskScore || 0);
          case "lowest-risk":
            return (a.riskScore || 0) - (b.riskScore || 0);
          case "name":
            return a.name.localeCompare(b.name);
          case "recent":
          default:
            return 0; // Maintain natural recency order
        }
      });
  }, [documents, filterState]);

  // Count of critical / attention items
  const attentionCount = useMemo(() => {
    return documents.filter((d) => d.riskLevel === "critical" || d.riskLevel === "high" || d.status === "failed").length;
  }, [documents]);

  const handleOpenDocument = (doc: DocumentItem) => {
    setActiveDocument(doc);
    showNotification(`Opening workspace for ${doc.name}...`);
    router.push(`/simulate-negotiate?docId=${encodeURIComponent(doc.id)}&docName=${encodeURIComponent(doc.name)}`);
  };

  const handleRetryAnalysis = (doc: DocumentItem) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === doc.id
          ? {
              ...d,
              status: "processing",
              processingStep: 1,
              totalSteps: 5,
              currentStepDescription: "Re-running OCR and legal parser",
              riskLevel: "moderate",
              failureReason: undefined,
            }
          : d
      )
    );
    showNotification(`Restarted analysis for ${doc.name}`);

    // Simulate completion after 3s
    setTimeout(() => {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id
            ? {
                ...d,
                status: "completed",
                riskLevel: "moderate",
                riskScore: 48,
                issueCount: 2,
                complianceStatus: "warning",
                complianceText: "1 jurisdiction clause requires review",
                topFindingExcerpt: "Governing law designated in non-standard arbitration seat.",
                lastAnalyzed: "Just now",
              }
            : d
        )
      );
      showNotification(`Analysis complete for ${doc.name}`);
    }, 3500);
  };

  const handleRenameDocument = (doc: DocumentItem) => {
    const newName = window.prompt("Enter new document name:", doc.name);
    if (newName && newName.trim() && newName !== doc.name) {
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, name: newName.trim() } : d))
      );
      showNotification(`Document renamed to ${newName.trim()}`);
    }
  };

  const handleExportDocument = (doc: DocumentItem) => {
    showNotification(`Generated audit export package for ${doc.name}`);
  };

  const handleDeleteDocument = (doc: DocumentItem) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${doc.name}" from your library?`);
    if (confirmed) {
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      showNotification(`Deleted ${doc.name}`);
    }
  };

  const handleUploadSuccess = (newDoc: { name: string; type: DocumentType; size: string }) => {
    const created: DocumentItem = {
      id: `doc-${Date.now()}`,
      name: newDoc.name,
      type: newDoc.type,
      fileSize: newDoc.size,
      uploadedDate: "Just now",
      lastAnalyzed: "Just now",
      riskLevel: "moderate",
      riskScore: 55,
      issueCount: 2,
      complianceStatus: "warning",
      complianceText: "1 compliance advisory",
      topFindingExcerpt: "Freshly uploaded contract processed via Protocol-7 neural parser.",
      status: "completed",
      tags: ["Uploaded", "New"],
    };

    setDocuments((prev) => [created, ...prev]);
    showNotification(`Successfully processed & added "${newDoc.name}" to library.`);
  };

  const handleClearFilters = () => {
    setFilterState({
      searchQuery: "",
      riskLevels: [],
      complianceStatuses: [],
      documentTypes: [],
      sortBy: "recent",
      viewMode: "grid",
    });
  };

  return (
    <AppShell
      activeDocName={activeDocument?.name}
      activeDocStatus={activeDocument ? "Analysis Active" : undefined}
      onUploadSuccess={handleUploadSuccess}
    >
      {/* Toast Notification Banner */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[var(--color-primary-dark)] text-[var(--color-surface-primary)] px-4 py-3 rounded-xl shadow-xl text-xs font-medium flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200 border border-white/10">
          <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Home Page Canvas (1280px Max Width Grid per spec) */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 lg:px-12 py-8 space-y-10">
        {documents.length === 0 ? (
          /* Section 06: Empty State (Zero Documents in library) */
          <EmptyStateZeroDocs onUploadClick={() => handleUploadSuccess({
            name: "Enterprise Master Services Agreement.pdf",
            type: "Master Services Agreement",
            size: "3.2 MB"
          })} />
        ) : (
          <>
            {/* Section 02: Primary Workspace Header */}
            <PrimaryWorkspaceHeader
              filterState={filterState}
              onFilterChange={setFilterState}
              totalDocumentsCount={documents.length}
              attentionCount={attentionCount}
              availableTypes={availableTypes}
            />

            {/* Section 03: Featured / Latest Document (when not actively filtered) */}
            {!filterState.searchQuery && filterState.riskLevels.length === 0 && filterState.complianceStatuses.length === 0 && filterState.documentTypes.length === 0 && featuredDocument && (
              <FeaturedDocumentCard
                document={featuredDocument}
                onOpen={handleOpenDocument}
                onRename={handleRenameDocument}
                onExport={handleExportDocument}
                onDelete={handleDeleteDocument}
              />
            )}

            {/* Section 04: Recent Documents (when not actively filtered) */}
            {!filterState.searchQuery && filterState.riskLevels.length === 0 && filterState.complianceStatuses.length === 0 && filterState.documentTypes.length === 0 && recentDocuments.length > 0 && (
              <RecentDocumentsRow
                documents={recentDocuments}
                onOpen={handleOpenDocument}
                onRetry={handleRetryAnalysis}
                onRename={handleRenameDocument}
                onExport={handleExportDocument}
                onDelete={handleDeleteDocument}
              />
            )}

            {/* Section 05: Document Library (Full Grid / List View) */}
            <DocumentLibraryGrid
              documents={filteredDocuments}
              viewMode={filterState.viewMode}
              totalFilteredCount={filteredDocuments.length}
              onClearFilters={handleClearFilters}
              onOpen={handleOpenDocument}
              onRetry={handleRetryAnalysis}
              onRename={handleRenameDocument}
              onExport={handleExportDocument}
              onDelete={handleDeleteDocument}
            />
          </>
        )}
      </div>
    </AppShell>
  );
}