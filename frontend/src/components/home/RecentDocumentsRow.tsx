import React from 'react';
import { History, ChevronLeft, ChevronRight } from 'lucide-react';
import { DocumentItem } from '@/types/document';
import { DocumentCard } from '@/components/cards/DocumentCard';

interface RecentDocumentsRowProps {
  documents: DocumentItem[];
  onOpen?: (doc: DocumentItem) => void;
  onRetry?: (doc: DocumentItem) => void;
  onRename?: (doc: DocumentItem) => void;
  onExport?: (doc: DocumentItem) => void;
  onDelete?: (doc: DocumentItem) => void;
}

export const RecentDocumentsRow: React.FC<RecentDocumentsRowProps> = ({
  documents,
  onOpen,
  onRetry,
  onRename,
  onExport,
  onDelete,
}) => {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (documents.length === 0) return null;

  return (
    <section aria-labelledby="recent-docs-heading" className="w-full">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <History size={17} className="text-[var(--color-text-secondary)]" />
          <h3
            id="recent-docs-heading"
            className="text-base font-bold text-[var(--color-text-primary)]"
          >
            Recent Documents
          </h3>
          <span className="text-xs text-[var(--color-text-muted)] font-normal">
            ({documents.length})
          </span>
        </div>

        {/* Scroll Arrows */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="p-1 rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="p-1 rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Row */}
      <div
        ref={scrollContainerRef}
        className="flex items-stretch gap-4 overflow-x-auto pb-2 pt-1 scroll-smooth snap-x snap-mandatory focus:outline-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        tabIndex={0}
        role="region"
        aria-label="Recent documents carousel"
      >
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="w-[280px] sm:w-[320px] shrink-0 snap-start flex flex-col"
          >
            <DocumentCard
              document={doc}
              variant="grid"
              onOpen={onOpen}
              onRetry={onRetry}
              onRename={onRename}
              onExport={onExport}
              onDelete={onDelete}
              className="h-full"
            />
          </div>
        ))}
      </div>
    </section>
  );
};
