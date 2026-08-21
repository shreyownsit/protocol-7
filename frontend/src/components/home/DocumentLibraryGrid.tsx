import React, { useState } from 'react';
import { Files, SearchX, RotateCcw, ChevronDown } from 'lucide-react';
import { DocumentItem } from '@/types/document';
import { DocumentCard } from '@/components/cards/DocumentCard';

interface DocumentLibraryGridProps {
  documents: DocumentItem[];
  viewMode?: 'grid' | 'list';
  isLoading?: boolean;
  totalFilteredCount: number;
  onClearFilters: () => void;
  onOpen?: (doc: DocumentItem) => void;
  onRetry?: (doc: DocumentItem) => void;
  onRename?: (doc: DocumentItem) => void;
  onExport?: (doc: DocumentItem) => void;
  onDelete?: (doc: DocumentItem) => void;
}

export const DocumentLibraryGrid: React.FC<DocumentLibraryGridProps> = ({
  documents,
  viewMode = 'grid',
  isLoading = false,
  totalFilteredCount,
  onClearFilters,
  onOpen,
  onRetry,
  onRename,
  onExport,
  onDelete,
}) => {
  const [displayLimit, setDisplayLimit] = useState(6);

  const visibleDocuments = documents.slice(0, displayLimit);
  const hasMore = displayLimit < documents.length;

  const handleLoadMore = () => {
    setDisplayLimit((prev) => prev + 6);
  };

  return (
    <section aria-labelledby="all-docs-heading" className="w-full space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Files size={18} className="text-[var(--color-text-secondary)]" />
          <h3
            id="all-docs-heading"
            className="text-base md:text-lg font-bold text-[var(--color-text-primary)]"
          >
            All Documents
          </h3>
          <span className="text-xs text-[var(--color-text-muted)] font-normal">
            ({totalFilteredCount} {totalFilteredCount === 1 ? 'result' : 'results'})
          </span>
        </div>
      </div>

      {/* Loading Skeleton View */}
      {isLoading ? (
        <div
          className={
            viewMode === 'list'
              ? 'space-y-3'
              : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5'
          }
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <DocumentCard key={`skeleton-${i}`} isLoading variant={viewMode === 'list' ? 'list-row' : 'grid'} />
          ))}
        </div>
      ) : documents.length === 0 ? (
        /* Zero Filter Results State */
        <div className="rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 p-12 text-center flex flex-col items-center justify-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[var(--color-surface-primary)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)]">
            <SearchX size={22} />
          </div>
          <div>
            <h4 className="text-base font-semibold text-[var(--color-text-primary)]">
              No contracts match your active filters
            </h4>
            <p className="text-xs text-[var(--color-text-secondary)] max-w-sm mt-1">
              Try adjusting your search terms, removing risk level constraints, or clear all filters.
            </p>
          </div>
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--color-primary-dark)] text-[var(--color-surface-primary)] text-xs font-semibold hover:bg-black/80 transition-colors shadow-xs cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Clear filters</span>
          </button>
        </div>
      ) : (
        /* Results Grid / List */
        <div
          className={
            viewMode === 'list'
              ? 'space-y-2.5'
              : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5'
          }
          role="list"
          aria-label="Document library"
        >
          {visibleDocuments.map((doc) => (
            <div key={doc.id} role="listitem">
              <DocumentCard
                document={doc}
                variant={viewMode === 'list' ? 'list-row' : 'grid'}
                onOpen={onOpen}
                onRetry={onRetry}
                onRename={onRename}
                onExport={onExport}
                onDelete={onDelete}
              />
            </div>
          ))}
        </div>
      )}

      {/* Accessible Load More Fallback */}
      {hasMore && !isLoading && (
        <div className="pt-4 flex justify-center">
          <button
            type="button"
            onClick={handleLoadMore}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-surface-primary)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] text-xs font-semibold text-[var(--color-text-primary)] shadow-xs transition-colors hover:bg-[var(--color-surface-secondary)] cursor-pointer"
          >
            <span>Load more contracts ({documents.length - displayLimit} remaining)</span>
            <ChevronDown size={14} />
          </button>
        </div>
      )}
    </section>
  );
};
